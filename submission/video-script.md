# HALLWAKE — demo video script (target 2:58, hard cap < 3:00)

Condensed from `presentation/script.md` §C (same shot list, tighter beats).
The schedule is deterministic, so every take is identical — re-shoot a single
shot without re-recording the run.

## Recording requirements (from the rules)

- **< 3 minutes**, uploaded to **YouTube as Public**, showing the game running
  on its **target device** = the booth machine's browser (Windows, Chrome or
  Edge), 1080p60 capture.
- Soundtrack = the game's own WebAudio (all synthesized — zero third-party
  music, zero copyright exposure). No third-party trademarks on screen or in
  speech.
- Two required captions: on the lore card — *"local LLM — flavor only; game
  runs 100% with it down"*; on the door-5 beat — *"same schedule, every run"*.
- Start the run from `http://localhost:8402/?fps=1` (FPS meter visible).

## Shot list (2:58)

| Time | Shot | On screen | You say |
|---|---|---|---|
| 0:00–0:10 | Attract screen | Door row 01–24, lantern sweep, PRESS ANY KEY breathing | "HALLWAKE — a booth horror mini game in the browser. The door row is the brand, and the schedule." |
| 0:10–0:22 | Key press → spawn | Door 01 numeral, door log, full oil tube, lantern in hand | "Any key starts the run. The oil tube is the whole resource economy." |
| 0:22–0:34 | Doors 1–4, lore card | Calm rooms; caption: "local LLM — flavor only" | "Safe rooms refill oil. That lore card is a local LLM — flavor only, never game state. With it down, hand-authored lines take over." |
| 0:34–0:52 | Door 5 — TALLY | Chalk marks, numeral glows red, fake door appears; open the door matching the HUD log. Caption: "same schedule, every run" | "TALLY edits the doors. The fake door's number never matches the door log. Reading the numbers is the counterplay." |
| 0:52–1:12 | Door 7 — GAUNT | Lights flicker twice, burn amber, door slams; step into pale-marked alcove, hold still, amber fades | "The amber tell means GAUNT is sweeping. Alcove, stillness, survive. Watch it once — beat it every time." |
| 1:12–1:32 | Door 9 — CINDER | Flames turn blue, hiss, oil gauge visibly drains; relight sconces in scratch order; oil restored | "CINDER eats light — oil drains four times faster. Relight the sconces in the scratch order and it banishes." |
| 1:32–1:54 | Door 10 — MURMUR + death | Whisper + beam sputter; one mistake; death card with epitaph; instant checkpoint respawn | "MURMUR only moves in your darkness — keep the beam on it. This mistake cost a life, but the checkpoint costs seconds. Dying is a lesson, not a coin flip." |
| 1:54–2:14 | Door 24 — finale | CINDER blackout + GAUNT tell mid-room; survive, open the last door | "Door twenty-four: both at once — blackout and chase in one room. This is what the fixed schedule builds toward." |
| 2:14–2:30 | Run card → leaderboard | Run card (deepest door, time, deaths) → name entry → leaderboard ledger | "Run card, name on the leaderboard — deepest door and time. Knowledge, not dice." |
| 2:30–2:44 | Idle → attract | Walk away; after 30 s the attract screen returns | "Thirty seconds idle and the kiosk resets itself — ready for the next passerby." |
| 2:44–2:58 | Title card | HALLWAKE masthead + "learn the schedule or be learned by it" + JetBrains toolchain line | "HALLWAKE. Nine-ninety-nine frontend tests, fifty-six backend tests, built with WebStorm, PyCharm, DataGrip and Junie. Learn the schedule — or be learned by it." |

## Post-record checklist

- Duration under 3:00 on the YouTube player itself.
- Frame pass: no banned third-party terms or marks visible anywhere
  (`scripts/ip-check.sh` already covers the repo; the video is manual).
- If the LLM is down during the take, keep it — narrate the canned-line
  fallback as the designed behavior (see `deployment/production-checklist.md`
  demo-day run book; restart the backend before recording so the current
  flavor-firewall fix is loaded).
