// HALLWAKE — canned flavor pools (architecture.md §11). Fallback text is
// FIRST-CLASS content: the game is 100% playable and fully scored with the
// backend and the LLM both down. >=30 hand-authored lines per kind, chosen
// deterministically by (kind, door) — no RNG, matching the sim's thesis.
// Original IP only; every line passes scripts/ip-check.sh.

export type FlavorKind = 'lore' | 'epitaph' | 'run';

export const KINDS: FlavorKind[] = ['lore', 'epitaph', 'run'];

const LORE: string[] = [
  "The porter's log says this room was quiet. The porter's log is old.",
  'Some doors were painted shut from the inside. Nobody mentions which.',
  'The wallpaper here was replaced twice. The pattern never lined up.',
  'A lantern hook, a nail, a ring of keys long since sold.',
  'The faucet runs a full minute after anyone leaves. Count it.',
  'Chalk under the sill: someone counted nights here, not days.',
  'The bed is made hospital-tight by hands that practiced.',
  'This corridor smells of brass polish and something older.',
  'The mirror faces the wall. The wall has not forgiven it.',
  'A service bell, wired to nothing. It still arrives warm.',
  'The registry page for this floor was torn out neatly.',
  'Someone wrote GOOD NIGHT on the glass from the outside.',
  'The pipes knock in threes. The building has no reason to count.',
  'Fresh paint over old paint over old panic.',
  'The chair faces the door. It was dragged there, not placed.',
  'Oil in the can, wick trimmed short. Someone expected company.',
  'The key turns both ways here. Only one way is honest.',
  'A height mark on the door frame, dated, then scraped out.',
  'The hearth is cold and swept. The sweeping was recent.',
  'Towels folded into shapes that almost look like people.',
  'The clock in this hall stopped at the same minute as the last one.',
  'Beneath the rug: a hatch, padlocked, warm to the touch.',
  'The plaster here is patched in the shape of a standing man.',
  'Every safe room is safe the way a held breath is safe.',
  'The porter left his cap on this hook. It still fits someone.',
  'Light finds the dust first. The dust moves second.',
  'The door numbers were repainted. The old numbers bite through.',
  'Something hums in the walls, and the walls hum back.',
  'A ledger of oil, in a hand that got shakier each column.',
  'The window shows a brick wall. The brick wall shows nothing.',
  'Two cups on the shelf. The building serves one guest.',
  'This room keeps its silence like a borrowed coat.',
];

const EPITAPH: string[] = [
  'You learned the schedule the hard way. It learns you faster.',
  'The corridor thanks you for your service, and your calcium.',
  'Somewhere a tally mark just got its fifth stroke.',
  'You were brave. Bravery is not a door key.',
  'The house keeps what it catches. You are inventory now.',
  'Next time: the lantern, not the ego.',
  'Your name will be on the wall by morning. Neat handwriting.',
  'The dark here is thorough. It checked twice.',
  'You made it further than the last porter. He is in the walls.',
  'Death by curiosity. The oldest cause of death in this building.',
  'The amber flickered. You did not step. The amber remembers.',
  'You looked away from the whisper. The whisper noticed.',
  'The fake door had real teeth. The teeth had real opinions.',
  'Oil out, lights low, lessons late.',
  'The sconces went dark in order. So did you.',
  'You ran the corridor. The corridor ran you.',
  'The logbook will read: eager, loud, brief.',
  'Standing still is a skill. Practice it with your whole body.',
  'The house is not cruel. It is simply punctual.',
  'Your lantern went out mid-sentence. So did you.',
  'There is a new hook by the door. It has your shape.',
  'The chalk counted you before you counted it.',
  'You knocked on the wrong side of everything.',
  'The blue flame hissed a warning in a language you almost spoke.',
  'Rest now. The corridor will rest too, briefly.',
  'You are the reason the next porter checks the alcove first.',
  'The house filed you under RETURNED.',
  'A good run, a bad ending, a better lesson.',
  'The house exhales. You are part of the air now.',
  'Your keys go to the next shift. They always do.',
  'The epitaph writes itself: you should have read the log.',
  'Even the lantern needed you to keep it lit. You did not.',
];

const RUN: string[] = [
  'You walked out. The corridor is drafting a memo.',
  'Twenty-four doors, one porter, no excuses.',
  'The logbook will brag about you for a week.',
  'You kept the wick honest. The house is annoyed.',
  'A clean walk. Even the chalk is impressed.',
  'You read every door. The doors read you back.',
  'Deeper than the last three porters combined.',
  'The finale blinked first. Do not tell anyone.',
  'You carried the dark all the way out. Set it down gently.',
  'Not a scratch on the schedule. Suspicious.',
  'The sconces remember your hands. They liked them.',
  'You hid when amber said hide. That is the whole game.',
  'The whisper never touched your ear. Rude of it.',
  'You opened the real door. Every time. Show-off.',
  'Oil to the last room. The gauge misses you already.',
  'A porter who reads the log is a porter who leaves.',
  'The house wanted a resident. You wanted an exit.',
  'Twenty-four doors later, still bone and breath.',
  'You beat the schedule at its own game. It hates that.',
  'The tall one swept and missed. You were the miss.',
  'Flawless lantern work. The dark is filing a complaint.',
  'You walked like you knew the place. Do you?',
  'The registry has a new signature, and it is steady.',
  'You made the impossible look like a night shift.',
  'The corridor releases you. It does not forgive you.',
  'Every tell read, every counterplay paid. Respect.',
  'You are the reason the next run will be harder.',
  'The blue flame bowed as you passed. Probably.',
  'Not one fake door kissed. A restraint the house respects.',
  'You kept the tally honest. The tally keeps you famous.',
  'The last door opened for you like it owed you.',
  'Walk out tall. The walls are still watching.',
];

export const CANNED: Record<FlavorKind, string[]> = {
  lore: LORE,
  epitaph: EPITAPH,
  run: RUN,
};

// Deterministic pick: (kind, door) % len — the same door greets every porter
// with the same line, exactly like the schedule greets them with the same
// entities. kindSeed is stable across runs (no hashing of user input).
export function kindSeed(kind: FlavorKind): number {
  return KINDS.indexOf(kind) * 31;
}

export function pickIndex(kind: FlavorKind, door: number): number {
  const lines = CANNED[kind];
  return (((kindSeed(kind) + door) % lines.length) + lines.length) % lines.length;
}

export function pickLine(kind: FlavorKind, door: number): string {
  return CANNED[kind][pickIndex(kind, door)];
}
