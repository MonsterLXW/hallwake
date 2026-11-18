// HALLWAKE — entity mesh gate (architecture.md §3/§5, design-brief §3/§7).
// The four factories must be pure builders: detached groups, <= 12
// primitives each (the 24-draw entity reserve in budget.ts), ZERO lights
// (lighting is the scene budget's job), bounded triangles, faithful FSM
// phase behaviour, and deterministic output (same inputs -> same state).
// Runs headless: the canvas is stubbed exactly like textures.test.

import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { CinderState, GauntState, MurmurState, SimEvent, TallyState } from '../../core/types';
import { makeRoomState } from '../../core/sim';
import { buildGaunt } from '../entities/gaunt';
import { buildMurmur } from '../entities/murmur';
import { buildTally } from '../entities/tally';
import { buildCinder } from '../entities/cinder';
import { flickerEnvelope, mountEntities, numeralBeat, tellLightState } from '../entities/fx';

interface PaintImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function makeStubCtx(): unknown {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'createImageData') {
          return (w: number, h: number): PaintImage => ({
            data: new Uint8ClampedArray(w * h * 4),
            width: w,
            height: h,
          });
        }
        if (prop === 'putImageData') return (): void => undefined;
        if (prop in target) return (target as Record<string, unknown>)[prop as string];
        return () => undefined;
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  );
}

beforeAll(() => {
  (globalThis as Record<string, unknown>).document = {
    documentElement: {},
    createElement: () => ({ width: 0, height: 0, getContext: () => makeStubCtx() }),
  };
});

const MAX_PRIMITIVES = 12; // budget.ts: 24-draw reserve / 2 finale entities
const MAX_TRIS_PER_ENTITY = MAX_PRIMITIVES * 256; // ENTITY_TRI_RESERVE per entity

function primitivesOf(group: THREE.Group): number {
  let n = 0;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Points) n++;
  });
  return n;
}

function trianglesOf(group: THREE.Group): number {
  let tris = 0;
  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry as THREE.BufferGeometry;
      const count = g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0);
      tris += count / 3;
    }
  });
  return tris;
}

function lightsOf(group: THREE.Group): number {
  let n = 0;
  group.traverse((o) => {
    if (o instanceof THREE.Light) n++;
  });
  return n;
}

const gauntState = (phase: GauntState['phase']): GauntState => ({
  kind: 'GAUNT',
  phase,
  hiddenOk: true,
  x: 1,
  z: 2,
});
const murmurState = (phase: MurmurState['phase'], dist = 4): MurmurState => ({
  kind: 'MURMUR',
  phase,
  x: 5,
  z: 5,
  dist,
});
const tallyState = (phase: TallyState['phase']): TallyState => ({ kind: 'TALLY', phase });
const cinderState = (phase: CinderState['phase'], blackoutCount = 0): CinderState => ({
  kind: 'CINDER',
  phase,
  progress: 0,
  blackoutCount,
});

describe('factory contracts (pure builders, inside the entity reserve)', () => {
  const builds: Array<
    [string, () => { group: THREE.Group; primitiveCount: number; dispose(): void }, number]
  > = [
    ['GAUNT', buildGaunt, 6],
    ['MURMUR', buildMurmur, 4],
    ['TALLY', () => buildTally(8), 5],
    ['CINDER', buildCinder, 6],
  ];

  for (const [name, build, expected] of builds) {
    it(`${name}: <= ${MAX_PRIMITIVES} primitives (declared ${expected})`, () => {
      const v = build();
      expect(v.primitiveCount).toBe(expected);
      expect(v.primitiveCount).toBeLessThanOrEqual(MAX_PRIMITIVES);
      expect(primitivesOf(v.group)).toBe(v.primitiveCount);
      v.dispose();
    });

    it(`${name}: group is detached (no scene mutation at build time)`, () => {
      const v = build();
      expect(v.group.parent).toBeNull();
      v.dispose();
    });

    it(`${name}: carries no lights — lighting is the scene budget's job`, () => {
      const v = build();
      expect(lightsOf(v.group)).toBe(0);
      v.dispose();
    });

    it(`${name}: triangles fit the per-entity reserve`, () => {
      const v = build();
      expect(trianglesOf(v.group)).toBeLessThanOrEqual(MAX_TRIS_PER_ENTITY);
      v.dispose();
    });
  }
});

describe('FSM phase fidelity (never invent behaviour the sim lacks)', () => {
  it('GAUNT: hidden in IDLE, manifest in TELL/SWEEP, fades out in SURVIVED', () => {
    const v = buildGaunt();
    v.update(gauntState('IDLE'), 0);
    expect(v.group.visible).toBe(false);
    v.update(gauntState('TELL'), 1);
    expect(v.group.visible).toBe(true);
    v.update(gauntState('SWEEP'), 2);
    expect(v.group.visible).toBe(true);
    v.update(gauntState('SURVIVED'), 3);
    expect(v.group.visible).toBe(true); // mid-fade
    v.update(gauntState('SURVIVED'), 4);
    expect(v.group.visible).toBe(false); // fade complete
    v.dispose();
  });

  it('MURMUR: swarm drifts while HUNT, goes perfectly still while FROZEN', () => {
    const v = buildMurmur();
    v.update(murmurState('HUNT'), 1);
    const pts: THREE.Points = v.group.children.find((c) => c instanceof THREE.Points) as THREE.Points;
    const hunt = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).getX(0);
    v.update(murmurState('FROZEN'), 1.0001);
    const frozen = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).getX(0);
    v.update(murmurState('FROZEN'), 9.7);
    const frozenLater = (pts.geometry.getAttribute('position') as THREE.BufferAttribute).getX(0);
    expect(frozen).toBe(frozenLater); // frozen = no motion at all
    expect(hunt).not.toBe(frozen); // hunting = deterministic drift
    v.dispose();
  });

  it('TALLY: chalk on TELL, fake door only in FAKE', () => {
    const v = buildTally(8);
    v.update(tallyState('IDLE'), 0);
    expect(v.group.children.every((c) => !c.visible)).toBe(true);
    v.update(tallyState('TELL'), 1);
    expect(v.group.children.some((c) => c.visible)).toBe(true);
    expect(v.group.children.filter((c) => c.visible).length).toBeLessThanOrEqual(2); // chalk + glow only
    v.update(tallyState('FAKE'), 2);
    expect(v.group.children.filter((c) => c.visible).length).toBe(5); // + fake door + jambs
    v.dispose();
  });

  it('CINDER: hidden until TELL, blue while live, inner flame dies in BLACKOUT, gone when BANISHED', () => {
    const v = buildCinder();
    v.update(cinderState('IDLE'), 0);
    expect(v.group.visible).toBe(false);
    v.update(cinderState('TELL'), 1);
    expect(v.group.visible).toBe(true);
    const outer = v.group.children[0] as THREE.Mesh;
    expect((outer.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x58b4e8); // --signal-cinder
    v.update(cinderState('BLACKOUT', 1), 2);
    const inner = v.group.children[1] as THREE.Mesh;
    expect(inner.visible).toBe(false); // one sconce down = one flame layer down
    v.update(cinderState('BANISHED'), 3);
    expect(v.group.visible).toBe(false);
    v.dispose();
  });
});

describe('determinism (same inputs -> identical visual state)', () => {
  it('two GAUNT builds driven identically end up identical', () => {
    const a = buildGaunt();
    const b = buildGaunt();
    const seq: Array<[GauntState['phase'], number]> = [
      ['TELL', 1.0],
      ['TELL', 1.2],
      ['SWEEP', 2.0],
      ['SWEEP', 5.5],
    ];
    for (const [phase, t] of seq) {
      a.update(gauntState(phase), t);
      b.update(gauntState(phase), t);
    }
    expect(a.group.rotation.y).toBe(b.group.rotation.y);
    const am = (a.group.children[4] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    const bm = (b.group.children[4] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(am.opacity).toBe(bm.opacity);
    expect(am.color.getHex()).toBe(bm.color.getHex());
    a.dispose();
    b.dispose();
  });
});

describe('tell FX helpers (brief §7: flicker is information, reduced motion stays fair)', () => {
  it('flickerEnvelope: two blinks then steady amber; reduced motion = steady only', () => {
    expect(flickerEnvelope(0.05, 0, false)).toBe(0.25); // first blink out
    expect(flickerEnvelope(0.2, 0, false)).toBe(1); // second blink in
    expect(flickerEnvelope(0.5, 0, false)).toBe(1); // steady after the blinks
    expect(flickerEnvelope(0.05, 0, true)).toBe(1); // reduced: steady state, same amber
    expect(flickerEnvelope(0.2, 0, true)).toBe(1);
  });

  it('numeralBeat: one 1 s red beat, window kept whole under reduced motion', () => {
    expect(numeralBeat(0.5, 0)).toBeCloseTo(0.5);
    expect(numeralBeat(1.2, 0)).toBe(0);
  });

  it('tellLightState: GAUNT owns amber + flickers the lantern; CINDER owns blue; MURMUR only dims', () => {
    const sim = makeRoomState(7, 1);
    const gauntTell = { ...sim, entities: [{ ...gauntState('TELL') }] };
    const lit = tellLightState(gauntTell as never, 0.05, { GAUNT: 0 }, false);
    expect(lit.lanternColor).toBe(0xf2a63c); // --signal-gaunt
    expect(lit.lanternMul).toBeLessThan(1);
    const calm = tellLightState(gauntTell as never, 0.05, { GAUNT: 0 }, true);
    expect(calm.lanternMul).toBe(1); // reduced motion: steady amber, same signal

    const sim9 = makeRoomState(9, 1);
    const cinderTell = { ...sim9, entities: [{ ...cinderState('TELL') }] };
    const cl = tellLightState(cinderTell as never, 1, { CINDER: 0 }, false);
    expect(cl.lanternColor).toBe(0x58b4e8);
    expect(cl.eventColor).toBe(0x58b4e8);

    const sim10 = makeRoomState(10, 1);
    const murmurHunt = { ...sim10, entities: [{ ...murmurState('HUNT', 3) }] };
    const ml = tellLightState(murmurHunt as never, 1, {}, false);
    expect(ml.lanternColor).toBeNull(); // hueless: luminance channel only
    expect(ml.lanternMul).toBeLessThan(1); // beam sputters dim
  });
});

describe('mountEntities (the single integration point)', () => {
  it('syncs visuals to sim entities, dispatches events to audio, clears on door_open', () => {
    const host = new THREE.Group();
    const played: SimEvent[] = [];
    let whisper = -1;
    const handle = mountEntities(host, {
      audio: {
        playEvent: (ev) => played.push(ev),
        setWhisper: (g) => (whisper = g),
      },
      reducedMotion: true,
    });

    let sim = makeRoomState(7, 1); // GAUNT door
    const tell: SimEvent = { type: 'tell', entity: 'GAUNT', door: 7, visible: true };
    handle.update(sim, [tell], 1.0);
    expect(host.children.length).toBe(1);
    expect(played).toEqual([tell]);
    expect(lightsOf(host)).toBe(0);

    // MURMUR door: whisper gain tracks the facing dot (player yaw 0 faces +z;
    // murmur spawns at (1,9): bearing off-axis -> small but non-negative dot)
    sim = makeRoomState(10, 1);
    handle.update(sim, [], 2.0);
    expect(host.children.length).toBe(1);
    expect(whisper).toBeGreaterThanOrEqual(0);
    expect(whisper).toBeLessThanOrEqual(1);

    // door_open arrives with the NEXT room's sim: the old room's entity is
    // dropped and only the new room's entities (door 11: none) remain
    const nextSim = makeRoomState(11, 1);
    handle.update(nextSim, [{ type: 'door_open', door: 11, visible: true }], 3.0);
    expect(host.children.length).toBe(0);

    handle.dispose();
    expect(host.children.length).toBe(0);
  });

  it('finale: two concurrent entities stay inside the 24-draw reserve', () => {
    const host = new THREE.Group();
    const handle = mountEntities(host, { reducedMotion: true });
    const sim = makeRoomState(24, 1); // CINDER + GAUNT concurrently
    handle.update(sim, [], 1.0);
    let prims = 0;
    host.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) prims++;
    });
    expect(prims).toBeLessThanOrEqual(24);
    handle.dispose();
  });
});
