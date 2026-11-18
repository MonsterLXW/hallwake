# HALLWAKE — Design Identity Brief (Phase 6 REWRITE, 2026-11-18)

Supersedes the GCRadar "scouting desk" brief entirely — that identity is void.
Binding: `plan/idea.md` (contract), `plan/architecture.md` (HUD/kiosk needs), `DESIGN_MANIFESTO.md` (law).
Token implementation: `app/frontend/src/identity/tokens.css` — the single import for every UI task.
Original IP only: no DOORS/Roblox names, assets, or entity names anywhere.

## 1. Concept — "the night porter's kit"

HALLWAKE's UI is not an overlay on a game; it is **the working kit of the corridor's night
porter** — the instruments a lamplighter would actually carry: a stenciled door numeral, a
ruled logbook of doors opened, a brass oil gauge, chalk marks on the frame. Reference
tradition, combined freshly: **American industrial signage** (painted condensed numerals,
stencil tracking) × **ledger/print culture** (ruled rows, tabular mono, signed metadata) ×
**lantern chiaroscuro** (bone-on-black; the interface is what light reveals, and darkness is
the absence of interface). No gamer-HUD clichés: no neon, no glass, no sci-fi brackets.

**The identity rule that makes it recognizable: color is danger, bone is information.**
Every neutral UI mark — titles, numerals, labels, gauges, focus rings — is bone (the color of
lantern-lit paper). The only saturated hues in the entire product are the four entity signals
and the oil-critical alarm. The moment color appears on screen, it means something is hunting
you. A player can learn the palette the way they learn the schedule: bone is safe, color is not.

**Characteristic opening moment (attract screen):** the page opens on **the door row** — all
24 numerals `01–24` set as one full-width stenciled band across the black, Big Shoulders 900,
bone on void, hairline rule beneath. A single lantern glow sweeps the row on a slow 6 s idle
loop; the masthead `HALLWAKE` sits above it, `PRESS ANY KEY` breathes below in mono. It is the
corridor itself — the product's core image rendered as brand graphic, zero decoration, and it
reads at TV distance. Reduced-motion: the glow parks on `01`, no sweep, prompt static.

## 2. Theme — dark-only, and that is a decision

Single theme, no light mode. Justification: the fiction is darkness — the lantern is the
light source and the resource; a white leaderboard/attract screen would break the fiction,
glare at booth passersby, and read as a different product. The kiosk loop (attract → run →
death → leaderboard) lives entirely in the dark register; `color-scheme: dark` only. This also
removes an entire class of signal-contrast failure: entity tells are tuned against exactly
one scene black (`#0A0A0E`, the fog color from architecture §3 — UI and world share one black).

## 3. Palette — bone on void, four signals

All ratios computed with WCAG relative luminance against page bg `#0A0A0E` and HUD plate
`#101016`. Signal hues are reserved semantically and never used decoratively.

### Surfaces & ink
| Token | Hex | On bg / on plate |
|---|---|---|
| bg (page plane = scene fog) | `#0A0A0E` | — |
| plate (HUD text plates, flat) | `#101016` | — |
| plate-sunken (gauge track, wells) | `#060609` | — |
| rule (hairline) | `#23232E` | 1.27 — decorative rules only |
| rule-strong (baselines) | `#3C3C4A` | 1.82 — gauge ticks, table baselines |
| ink (bone) | `#EDE7DA` | 16.04 / 15.39 ✓ AAA |
| ink-secondary | `#BFB8A9` | 10.02 / 9.61 ✓ AAA |
| ink-muted (meta, axis) | `#857E70` | 4.91 / 4.71 ✓ AA |

### Entity signals — semantic, functional, never decorative
| Entity | Token | Hex | On bg / plate | Meaning |
|---|---|---|---|---|
| GAUNT | `--signal-gaunt` | `#F2A63C` | 9.69 / 9.29 ✓ | sodium-lamp amber: lights flicker twice, burn amber → hide |
| TALLY | `--signal-tally` | `#D6574C` | 5.01 / 4.81 ✓ | chalk red: frame marks, numeral glows one beat → read the log |
| CINDER | `--signal-cinder` | `#58B4E8` | 8.57 / 8.22 ✓ | spectral blue: flames turn blue, hiss → relight sconces |
| MURMUR | `--signal-murmur` | `#C9C6BE` | 11.58 / 11.11 | **deliberately hueless** — MURMUR is darkness; its channel is luminance (beam sputter/dim) + audio + a hollow ring glyph |

`--color-alarm` aliases `--signal-tally` for the oil-critical gauge: measured ΔE between a
separate "oil red" and chalk red was 6.8 (perceptually the same red), so faking two reds would
be a lie. One alarm red, disambiguated by **slot** (gauge is always bottom-left; TALLY red is
always on a door numeral/frame), **motion** (oil critical pulses 1 Hz; TALLY glows one steady
beat), and **audio** (distinct per-entity buses, architecture §8). Bone ink on an amber GAUNT
chip: 9.69 ✓.

### Oil / lantern states — luminance, not hue
The lantern dims by losing light, not by changing color: `--oil-high #E3D7BC` (13.84),
`--oil-low #B5A888` (8.40, the 0.2–0.6 band), `--oil-critical` = alarm red (graphical 5.01 ✓;
the % numeral stays bone so it never fails text AA). Amber belongs to GAUNT alone — the gauge
never wears it.

### CVD separation (Lab ΔE, Machado protan/deutan simulation)
gaunt↔tally 47.7 / 45.0 / 37.5 · gaunt↔cinder 102 / 112 / 105 · tally↔cinder 92 / 76 / 76 ·
cinder↔murmur 42 / 47 / 47. The three chromatic tells stay far apart under simulation; MURMUR
is intentionally near-ink (ΔE 12) because its signal is not hue. **Fairness rule: color is
never the sole channel** — every tell also carries a distinct glyph (§6), a distinct audio cue,
and a distinct motion signature.

## 4. Typography — three voices, strict roles

Self-hosted variable/static woff2 (latin) in `app/frontend/public/fonts/`, OFL licenses
alongside; `@font-face` lives in `tokens.css` so importing tokens brings the fonts.

| Voice | Family | Weights | Role |
|---|---|---|---|
| Signage | **Big Shoulders Display** (variable 400–900) | 700–900 | masthead, screen titles, the big door numeral, leaderboard rank numerals — uppercase, `+0.04em` stencil tracking; condensed painted-door presence |
| Instruments | **JetBrains Mono** (variable 400–700) | 400–700 | every HUD number, label, door log, gauge %, time, deaths, name entry — `tabular-nums` always; micro-labels uppercase `+0.1em` |
| Typescript | **Courier Prime** (400, italic 400) | 400 | the human voice: lore cards, death epitaphs, run-card flavor — as if typed on the porter's typewriter; epitaphs italic, measure ≤62ch, line-height 1.6 |

The contract: **the corridor is named in signage, the instruments read in mono, the dead are
buried in typewriter.** No text is ever set in the wrong voice. (JetBrains Mono also nods to
the sponsor without borrowing any JetBrains brand asset.)

Scale (deliberate jumps): 14 / 16 / 20 / 28 / 40 / 64 + fluid display. The door numeral is
`clamp(96px, 14vh, 190px)` — it jumps ~7× from its label; the masthead `clamp(64px, 10vh, 140px)`.

## 5. Space & composition

- 8px base: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. HUD anchored to viewport corners inside a
  **4% safe area** (`--hud-safe`) so nothing falls off a booth TV's overscan edge.
- **Plates, not cards.** HUD text sits on flat `rgba(6,6,9,.72)` plates with a 1px bone-dim
  rule — never backdrop-blur (perf budget + no glassmorphism). Radius **0 everywhere**.
  Shadows are meaningless in the dark: elevation = plate + rule, never `box-shadow` glow.
- Kiosk screens (attract / run card / leaderboard / name entry) are asymmetric editorial
  layouts: masthead flush-left, metadata flush-right in mono, content bands separated by
  hairline rules; leaderboard is a ruled ledger (rank numeral in Big Shoulders, stats in
  tabular mono), never a card grid.
- Focus: 2px bone outline, offset 2px, visible on every interactive element (name entry,
  quality toggle). Empty states are diegetic: "NO RUNS LOGGED", "THE LOG IS CLEAN".

## 6. Diegetic HUD rules

| Element | Slot | Treatment |
|---|---|---|
| Door numeral | bottom-right | Big Shoulders 900, bone, `--hud-numeral`; turns `--signal-tally` for one beat only on TALLY tell |
| Door log | top-left plate | mono `NEXT ▸ 06` + last three doors as ruled ledger ticks — the TALLY counterplay surface, so it is always on, never animated |
| Oil gauge | bottom-left | vertical tube: sunken track, bone fill, ticks at 0.2/0.6, mono % beside it; fill dims to `--oil-low`, turns alarm red + 1 Hz pulse below 0.2 |
| Tell indicator | center-bottom, above crosshair | entity glyph in signal color, appears only while a tell/event is live: GAUNT = tall slit, MURMUR = hollow ring, TALLY = four-stroke tally, CINDER = flame outline |
| Interact prompt | center, below crosshair | mono bone `[E] OPEN 06`; appears only in range |
| Death card | full screen | 1.5 s (matches the sim's 90-tick freeze): vignette + door numeral + epitaph in Courier Prime italic |

## 7. Motion & flicker — tells are information

Flicker is a tell, not decoration: it exists to say *GAUNT is coming*. Durations: 120 ms
hover/press, 180 ms plate in/out, 400 ms CINDER blue-shift. GAUNT tell = two 180 ms blinks
then steady amber for the sweep window. TALLY = one 1 s red beat. Oil critical = 1 Hz pulse.
Attract sweep = 6 s idle loop (attract mode is functional kiosk signage, not ambient
decoration). Easing `cubic-bezier(0.2, 0, 0, 1)`. No entrance animations, no parallax, no
hover bounce.

**Reduced-motion stays FAIR:** `prefers-reduced-motion: reduce` collapses flicker to a single
200 ms crossfade **to the same steady state** (amber stays amber, blue stays blue), beam
sputter becomes a steady dim, the oil pulse becomes steady alarm color. Counterplay windows
(GAUNT's 6 s, TALLY's one beat, sconce orders) are sim-side and never change. Audio cues and
door-log glyphs are untouched in every mode. A reduced-motion player reads every tell and
counterplays identically — only the animation style changes.

## 8. Room archetype moods (6, procedural canvas art)

- **Junction** — long sightlines, draft; stencil arrows burned into plaster; the door row's home.
- **Guest room** — faded wallpaper stripes (canvas noise), single bed blob-AO; GAUNT's amber reads hardest here.
- **Laundry / storage** — hanging cloth silhouettes, pipe drips; MURMUR's corners.
- **Lounge** — dead armchairs, cold hearth; the calm that makes door 24 land.
- **Boiler room** — pipe tangle, hiss; CINDER's home, blue flame on black iron.
- **Washroom** — tile grid lines, porcelain glints; MURMUR's whisper chamber.

Textures: canvas wood grain, plaster noise, tile lines, door numerals — 256–512 px, cached
(architecture §7). HUD plates stay identical across archetypes: the kit does not change rooms.

## 9. Kiosk / TV legibility at 3 m

Designed at 1080p, fluid-scaled by `vh` clamps so a 4K booth TV keeps proportions. Minimums:
HUD micro-labels 14 px, body/mono 16 px, door numeral ≥96 px, masthead ≥64 px. Signal colors
all ≥5:1 on both surfaces (above), so tells survive a bright booth reflecting off glass.
Safe area 4%; no text over unlit geometry without a plate. Dev FPS meter stays mono bone,
corner-anchored, never centered.

## 10. Banned-patterns check (manifesto §Banned)

1. Gradient headlines/hero — none; masthead is solid bone, the only "glow" is the functional attract lantern.
2. Neon glows / shadow glows — none; elevation is plate + hairline.
3. Glassmorphism — none; plates are flat rgba, no backdrop-blur.
4. Floating particles/blobs — none; the only moving graphic is the attract door-row sweep (kiosk signage).
5. Rounded cards everywhere — radius 0; plates and ruled ledgers instead.
6. Default sidebar+card-grid dashboard — no dashboard; kiosk screens are asymmetric ruled bands.
7. Gradient hero + slogan — the opening is the door row, the product's actual structure.
8. AI vector illustrations — zero imagery; all art is procedural canvas/WebGL, glyphs are strokes.
9. Decorative animation — motion is tell/state only; flicker is the game's alarm system.
10. Inter-only / 8px-rounded everything — Big Shoulders + JetBrains Mono + Courier Prime, radius 0.

## 11. Originality self-critique

What could not come from a template: the **bone-is-information / color-is-danger contract**
with hues semantically locked to four entities and validated by contrast + CVD math; the
**door-row attract masthead** (brand graphic = the actual 24-door schedule); the **diegetic
kit HUD** (logbook, oil tube, stenciled numeral) where every element is an object in the
fiction; the **fair reduced-motion rule** — tells crossfade to the same steady signal so
accessibility never costs fairness; the three-voice contract (signage / instruments /
typewriter). A designer would recognize the hand in the restraint: a UI that withholds all
color until the corridor turns hostile is exactly the product's thesis — learnable horror,
readable signals.
