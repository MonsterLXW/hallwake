# HALLWAKE — DOORS feature expansion (binding spec)

Goal: port the signature mechanics of the Roblox game DOORS into HALLWAKE, **mechanics only, original names** (ip-check bans DOORS/Rush/Figure/Eyes/Halt/Dupe/Blink/Glitch/Screech/Jeff/Stonk/Amity/roblox/lsplash/rococo — never use them in code, UI copy, or comments-as-shipped). Keep the deterministic core: **no Math.random**; all placement/schedule authored in the fixed schedule table or derived from the run seed via a pure hash. Every wave keeps `npx vitest run` green and adds golden-trace/sim tests. One agent at a time.

Non-negotiable invariants (do not break):
- stepSim stays a pure reducer; renderer never mutates sim.
- schedule is fixed & learnable; entity tells always readable; reduced-motion keeps tells fair.
- budget caps: <=7 draws/room, <=3 dynamic lights, no shadow maps.
- all colors from tokens.css; no hex in UI.

## Wave 1 — items, loot, coins, locked doors, death-saves
- types.ts: `ItemType = 'WARD'|'TONIC'|'PICK'|'FLASK'`; SimState gains `inv: ItemType[]` (cap 4), `coins: number`, `hidden: boolean` (in a closet), `tonicUsedThisRoom` not needed (tonic consumed on death).
- schedule.ts: each DoorDef optional `loot?: ItemType`, `coins?: number`, `locked?: boolean`, `closet?: {x0,x1,z0,z1}` (a hideable closet rect; distinct from alcove). Authored deterministically in the table. Place loot/coins/closet coords in archetypeGeom or per-door.
- sim.ts interact: pick up loot (push to inv if <4) / collect coins; **locked exit door** opens only if inv has PICK (consume one) else prompt "LOCKED — need a Pick"; **closet**: E near closet toggles `hidden` (enter/close; E again to exit). While hidden, movement locked, GAUNT sweep cannot reach you (safe).
- death-saves: on a would-be death, if inv has TONIC -> consume, survive (no death, brief invuln this room); else if inv has WARD -> consume, banish that entity (set its phase to a banished/survived terminal), survive; else die. Emit events `item_used` (add EventType) with which item.
- oil: FLASK item = instant +0.5 oil on use (number key 4 or E when no other interact in range).
- events: add `EventType` values: 'loot','coin','item_use','lock','hide'. Keep SimEvent.entity optional.
- renderer: closet mesh (openable door panel), loot glint (small emissive quad, DoubleSide), locked-door lock glyph, hidden view (closet door closed, narrow slit).
- HUD: inventory strip (up to 4 slots, item glyph + key number), coin count, LOCKED/hidden state.
- tests: new sim tests (pickup, cap, locked needs Pick, closet hide survives GAUNT sweep, TONIC save, WARD banish) + update any traces that now see new fields (they read specific fields, so mostly additive).

## Wave 2 — two new entities (original names, readable tells)
- **STARE** (≈ look-away): a floating eye that manifests at a fixed door/tick. Tell: a chime + a peripheral warning glyph + it becomes visible. Counterplay: while STARE is active, if the player's view (yaw+pitch) is pointed AT it within a cone, death after a short grace; look away to survive. Uses the new pitch. Tell window fixed & learnable.
- **GRIP** (≈ chase): spawns when you open a door at fixed slots; a fixed-duration chase — it advances along the corridor; counterplay: reach the exit (or a lit sconce) before it closes distance. Deterministic distance-per-tick.
- schedule: add STARE/GRIP to the fixed event schedule (new doors, keep 24 total or extend to a 2nd floor later). entities.ts: stepStare/stepGrip FSMs. fx.ts + entity meshes (original silhouettes). ip-check clean.
- tests: golden traces for STARE (look-away survive vs look-at die) and GRIP (reach exit survive vs too slow die).

## Wave 3 — progression: XP, perks, difficulty
- XP: earn per door survived + per banish + per loot; `xp` in SimState; level thresholds.
- Perks (pick at level-up, deterministic choices): Extra Tonic (start with TONIC), Brighter Lantern (+lantern radius), Prospect (minimap shows loot), Faster Walk (+speed, small), Iron Nerve (GAUNT tell window longer to react). Perk choice is a UI overlay; sim stores chosen perks and applies multipliers.
- Difficulty modes: Easy/Normal/Hard/Hell selected on attract; multipliers on oil drain, entity tell/react windows, checkpoint spacing. Store `difficulty` in state; pure multipliers.
- tests: perk/difficulty multipliers change outcomes deterministically.

## Wave 4 — depth: minimap, shop, hidden room
- Minimap HUD: top-down current room — walls, exit, closet, loot (if Prospect), entity blip. Pure SVG from sim state.
- Shop: every 8 doors a vendor screen (original keeper) — spend coins on WARD/TONIC/PICK/FLASK. Deterministic stock per door.
- Hidden room: one door has a secret (find the odd sconce / press E on a marked wall) -> bonus loot + coins.
- tests: shop buy/sell, hidden-room trigger.

## Later / optional (note, not this run)
- Co-op (out of scope: single kiosk), 2nd floor (doors 25-48), more entity roster, emotes, sound packs.

## Definition of done per wave
`npx vitest run` green (count only grows), `npm run build` clean, `scripts/ip-check.sh` exit 0, browser smoke by orchestrator (new mechanic visible + playable). Commit per wave: "feat(wN): ...".
