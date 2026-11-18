# GCRadar — Design Identity Brief (Phase 6, 2026-11-18)

Binding: `plan/idea.md` (contract), `plan/architecture.md` §8 (5-screen cap), `DESIGN_MANIFESTO.md` (law).
Token implementation: `app/frontend/src/identity/tokens.css` — the single import for every UI task.

## 1. Concept — "the scouting desk"

GCRadar looks like a **front-office scouting desk**, not a gaming overlay. Reference tradition,
combined freshly: **Swiss international grid** (numbered rows, ruled ledger tables, asymmetric
columns) × **mid-century American sports media guide** (expanded grotesque mastheads, all-caps
mono stat lines) × **terminal data culture** (monospace as the voice of numbers). No gamer-glow:
no neon, no gradients, no glass. The product's credibility claim — deterministic numbers,
curated sources — is expressed visually: everything is ruled, tabulated, and signed.

**Characteristic opening moment (Hub):** the page opens not with a hero but with a **draft-phase
ribbon** — the real 18-step VCT pick/ban sequence (6+2 bans struck, 10 picks filled, alternating
A/B) drawn as a full-width ruled tick-band under the masthead. It is the product's actual phase
script rendered as the brand graphic: instantly says "draft tool", carries zero decoration, and
reads at TV distance in the demo video.

## 2. Palette — graphite desk, signal amber, one polarity axis

Dark is the **default theme** (booth/TV legibility); light is opt-in via `data-theme="light"`.
All ratios computed with WCAG relative luminance; chart palettes validated with the dataviz
six-checks validator (`validate_palette.js`) against the real surfaces.

### Dark (default) — surfaces & ink
| Token | Hex | On bg / surface |
|---|---|---|
| bg (page plane) | `#0E1113` | — |
| surface (panels, charts) | `#161A1D` | — |
| surface-raised (popovers) | `#1B2024` | — |
| ink | `#F2F1EC` | 16.75 / 15.48 ✓ AAA |
| ink-secondary | `#C4C9CD` | 11.35 / 10.49 ✓ AAA |
| ink-muted (axis, meta) | `#8D949B` | 6.17 / 5.70 ✓ AA |
| rule (hairline) | `#262C31` | 1.24 — decorative grid only |
| rule-strong (baseline) | `#3A4248` | 2.1 — axis/baseline only |

### Dark — signal & polarity
| Token | Hex | Role | Contrast |
|---|---|---|---|
| accent `#F2A93B` | signal amber | selection, focus, magnitude bars, masthead underline | 9.49 on bg ✓ |
| accent-ink `#0E1113` | text on amber fills | | 9.49 ✓ |
| favor-mark `#2EA87F` | pick / synergy pole | chart marks | 5.85 on surface, ≥3:1 ✓ |
| favor-text `#4CC79A` | W, +scores | text | 8.97 / 8.29 ✓ AA |
| unfavor-mark `#E5604F` | ban / counter pole | chart marks | 5.10 on surface ✓ |
| unfavor-text `#F0705E` | L, −scores | text | 6.48 / 5.99 ✓ AA |
| neutral-mid `#333A40` | diverging midpoint | matrix zero cell | — |

**One polarity axis runs through the whole product:** favorable (teal-green) ↔ unfavorable
(vermilion). Pick/ban, synergy/counter, W/L are the same semantic family — color is never used
for decoration or series identity. Validator (dark, surface `#161A1D`): diverging pair
`#2EA87F ↔ #E5604F` — band ✓, chroma ✓, contrast ✓, normal-vision ΔE 27.1 ✓, CVD ΔE 7.6 =
warn band, **legal because secondary encoding is built in**: every matrix cell also carries its
signed value and axis letter (S/C), every W/L tick carries its letter.

### Diverging scale (matchup matrix heat)
`#E5604F` (−2) · `#964B44` (−1) · `#333A40` (0) · `#31715F` (+1) · `#2EA87F` (+2).
Cells always print the signed value — hue is never the sole channel.

### Sequential ramp (pick rate, confidence, threat) — amber, ordinal
Dark: `#6B4E14 · #8A6A1E · #B08A2E · #D2A845 · #F2C25E` — validator ✓ (monotone, ΔL gaps ≥0.06,
light end 2.27:1, hue spread 5°). Magnitude is **amber, not the polarity pair** — magnitude and
polarity never share a hue.

### Team accents (12, from `teams.accent`)
OKLCH-even hue wheel at L 0.62 / C 0.115 — deliberately desaturated (media-guide print, not
neon): `#C26869 #BD7042 #AA7D25 #8B8C2E #5F9752 #209C7B #009AA1 #2092BE #5C86CB #8679C6
#A56EB1 #B96890`. Validator: band ✓ chroma ✓ contrast ≥3:1 ✓. All-pairs CVD separation is
**structurally impossible at 12 hues** (the validator's own series cap), so the usage rule is
hard: team accents are **identity chrome, never chart series** — always paired with the team's
text tag, never more than two on screen (matchup A/B), where position + tag carry identity.

### Light theme (opt-in)
bg `#F4F3EF` · surface `#FBFAF7` · raised `#FFFFFF` · rule `#DDD9CF` · ink `#15181B` (17.07) ·
secondary `#4B5257` (7.61) · muted `#6C7378` (4.61 ✓ AA) · accent-text `#8A5A00` (5.68) ·
favor `#007756` mark / `#0E7A5F` text (5.07) · unfavor `#B93A28` (5.44) · neutral-mid
`#E4E1D8` · diverging `#B93A28 · #CE8D80 · #E4E1D8 · #6FAC97 · #007756` (validator: ALL PASS) ·
amber ramp `#C49F4D · #A8842F · #8A6A1E · #6B4E14` (validator ✓, light end 2.39:1).
Team accents keep identical hexes across themes — color follows the entity.

## 3. Typography — three voices, strict roles

Self-hosted woff2 (variable, latin) in `app/frontend/public/fonts/`, OFL licenses alongside;
`@font-face` lives in `tokens.css` so importing tokens brings the fonts.

| Voice | Family | Weights | Role |
|---|---|---|---|
| Structure | **Archivo** (wdth 100–125, wght 400–800) | 400–800 | masthead, screen titles, big score numerals (700–800, `font-stretch: 112%`, tracking −0.02em); all UI chrome text (400–600) |
| Data | **JetBrains Mono** (400–700) | 400–700 | every number, tag, label, axis tick, matrix cell, phase step — `tabular-nums` always; micro-labels uppercase, +0.1em tracking, 10–11px |
| Report | **Source Serif 4** (400–600, incl. italic) | 400–600 | the human voice: LLM narratives, edge source notes, dossier blurbs — italic 400, measure ≤68ch, line-height 1.6 |

The rule that makes the system recognizable: **the desk speaks mono, the report speaks serif,
the masthead speaks expanded grotesque.** No text is ever set in the wrong voice. (JetBrains
Mono is also a quiet nod to the sponsor judge.)

Scale (deliberate jumps, not a smooth ramp): 10 / 12 / 14 / 16 / 20 / 26 / 34 / 48 / 64px.
Display numerals jump 2×+ from their labels (score 48px Archivo 800 over 10px mono label).

## 4. Space & composition

- 8px base: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96.
- 12-column grid, 20px gutters, max width 1440, 24px side gutters at phone width.
- **Left rail** (220px, mono, numbered `01–05` nav) on ≥1024px; collapses to a top mono strip.
- Asymmetry is default: content columns 7+5 or 8+4, never 6+6; headers left-aligned against
  right-aligned mono metadata; generous negative space between analysis zones (48–64px).
- **Ledger rows, not cards.** Lists/tables are ruled rows (44px, 1px `--color-rule`), square,
  hover = 4% ink wash + `→` reveal. Cards exist only as the two floating panels (Explain,
  Q&A) — and they are square with a 2px accent top-rule, not glass.
- Borders: 1px hairlines everywhere; emphasis = 2px accent underline (selected/active), never
  shadows. Radius: **0 everywhere**. Shadow: none, except floating panels `0 8px 24px rgba(0,0,0,.45)`.
- Focus: 2px `--color-accent` outline, offset 2px, visible on every interactive element.

## 5. Per-screen layout (architecture §8)

1. **Hub** — masthead band: `GCRADAR` Archivo 800 expanded + mono meta line (season, counts,
   deterministic-core status chip) + **phase ribbon** (§1). Then the team index as numbered
   ledger rows `01–12`: accent chip, tag (Archivo 700), region (mono), W–L (mono tabular),
   pick-rate sparkbar (amber). Search = ruled inline input, not a card. Empty search → mono
   "NO MATCH IN INDEX".
2. **Team Dossier** — header: big tag + name, mono record + event chips. Asymmetric 7+5:
   roster ledger (left) / agent-pool tier grid (right): three banded zones SIGNATURE / SOLID /
   FLEX, each agent row with amber pick-rate bar. Full-width form chart (§6). LLM blurb =
   serif-italic block with 2px accent left-rule; offline state = dashed rule + mono
   "MODEL OFFLINE — deterministic data unaffected".
3. **Matchup Prep** — A vs B header split by a center rule (A flush-left, B flush-right).
   Stacked analysis zones: pool overlap (shared agents centered between two tier-dotted
   columns), ban pressure (ranked rows, amber threat bars, serif reason), role gaps (5 role
   columns, coverage ticks + letters). Matrix summary = ruled rows with signed mono values.
4. **Draft Board** — centerpiece. Center: 18-step draft ledger (phase label, actor, action
   cell; bans struck + unfavor-marked, picks filled + favor-marked). Left: agent pool grid of
   square cells (role letter, banned = strikethrough, picked = filled). Right: live scores as
   48px Archivo numerals + ranked counter-picks with expandable reason chains. Explain/weights
   panel slides from right (sliders + per-edge table with confidence dots).
5. **Comp Lab** — sparse by design: 5 big square agent slots + ruled map tabs + optional
   opponent select; score breakdown as 4 ruled amber meters (role/synergy/counter/map) + total
   numeral; archetype tags as mono chips.

## 6. Data-viz rules (hand-rolled SVG; dataviz six-checks validated)

- **Matchup matrix:** square cells (28px), 2px surface gap between fills, diverging scale (§2),
  signed value + axis letter printed in every cell (secondary encoding), confidence as a 4px
  dot row under the value. Hover → edge note tooltip (serif).
- **Confidence / pick-rate / threat bars:** 10px amber ordinal bars, square ends anchored to a
  baseline rule, direct mono value label at bar end. Never a second axis.
- **Form chart:** horizontal ruled timeline; W/L ticks (teal/verm) always lettered, score in
  mono above; opponent tag beside tick. No area fills.
- **Tier grid:** bands, not colors — tier is position + label; accent only as the chip.
- Chrome: gridlines `--color-rule` hairline, axis labels mono muted, baselines `--color-rule-strong`.
  Text always wears ink tokens (semantic text colors only for signed values). One axis, always.
  Legends only for ≥2 series; ≤4 series also direct-labeled.

## 7. Motion — state-change only

- Durations: 120ms (hover wash), 180ms (panel slide, row expand), 260ms (score-change flash:
  the changed score cell's background pulses once via `--color-accent` at 12% — shows *what*
  changed, nothing else animates).
- Easing: `cubic-bezier(0.2, 0, 0, 1)` everywhere. No entrance animations, no parallax,
  no counting numbers, no hover bounce.
- `prefers-reduced-motion: reduce` → all motion tokens collapse to 0ms (done in tokens.css).

## 8. Banned-patterns check (manifesto §Banned)

1. Gradient headlines/hero — none; masthead is solid ink + amber rule.
2. Neon glows — none; shadows off except floating panels.
3. Glassmorphism — none; surfaces are flat graphite.
4. Floating particles/blobs — none; the only graphic is the functional phase ribbon.
5. Rounded cards everywhere — radius 0; ledger rows instead of cards.
6. Default sidebar+card-grid dashboard — rail exists as editorial index, but content is
   ruled ledgers with asymmetric zones; Hub opens on the ribbon, not a card grid.
7. Gradient hero + slogan — none; opening is data (the ribbon).
8. AI vector illustrations — none; zero imagery, original iconography = mono glyphs/letters.
9. Decorative animation — none; motion is state-change only (§7).
10. Inter-only / 8px-rounded everything — Archivo + JetBrains Mono + Source Serif 4, radius 0.

## 9. Originality self-critique

What could not come from a template: the **phase-ribbon masthead** (brand graphic = the actual
draft state machine); the **three-voice contract** (mono numbers / serif report / expanded
masthead) enforced as a rule; **one polarity axis** for all favorable/unfavorable semantics with
amber reserved for magnitude; **radius-0 ledger ledgers** with 2px accent underlines instead of
shadows; team accents demoted to labeled identity chrome. A designer would recognize the hand
in the signed, ruled, tabular treatment — every mark is a fact with a source, which is exactly
the product's claim. Riot-IP posture: no logos (text tags), no Riot fonts/art, original
iconography, palette is ours.
