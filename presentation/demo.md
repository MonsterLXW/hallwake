# HALLWAKE — live booth demo runbook (Phase 11)

Audience: a judge (or passerby) at the kiosk. Session target: 3–5 minutes,
mirroring the real loop. Everything here reflects what is verified running
(deployment/README.md, qa/report.md).

## 0. Pre-demo checklist (do this 15 min before judges arrive)

1. Start everything: `.\deployment\start.ps1` from the repo root (Windows) or
   `./deployment/start.sh`. It builds `dist/`, starts backend + preview, prints
   URLs. Ports 8401/8402; if taken, `-BackendPort 8411 -FrontendPort 8412`.
2. Open `http://localhost:8402` — **use `localhost`, not `127.0.0.1`, for the
   preview if it was started bare** (it can bind IPv6 `::1`; the start script
   pins IPv4 so both work).
3. Health check: `curl http://127.0.0.1:8401/health` → expect
   `{"status":"ok","llm":{"online":true,...}}`.
   **Restart the backend before demo day** — the long-running uvicorn predates
   the flavor-firewall fix (qa/security.md §3).
4. Let quality auto-detect settle: it probes real fps and steps the preset down
   below 45 until it holds 60 (GameShell.tsx). Watch the FPS meter once with
   `?fps=1`, then remove the flag for the live demo.
5. Verify kiosk reset once: press a key, walk away 30 s → attract returns.
6. Have the pre-recorded video cued on the same machine (see §4).

## 1. The judge's path (what they do, what you say)

| Step | Judge does | You say | Fallback if it goes wrong |
|---|---|---|---|
| Attract | Watches the door row sweep | "Twenty-four doors, fixed schedule — the colors are the entity map." | Screen stuck off-attract? It re-arms on every phase (fix b685b66); press any key. |
| Start | Presses any key | "Lantern's in hand. Oil tube bottom-left is the only resource." | Nothing happens → click the canvas once (pointer lock needs a user gesture). |
| Doors 1–4 | Walk, maybe read a lore card | "That lore line is the local LLM — flavor only." | Lore shows a different tone: fine, canned lines are first-class content. |
| Door 5 TALLY | Sees chalk marks + red numeral beat | "A fake door just appeared. Which number matches the log top-left?" | Judge opens the fake and dies → perfect: "death is the lesson — checkpoint's right there, retry." |
| Door 7 GAUNT | Lights flicker amber | "Amber means hide. Pale-paint alcove, stay still." | Judge misses the alcove → death card, instant respawn at door 5 checkpoint; point at the alcove before retry. |
| Door 9 CINDER | Blue flames, oil draining | "Relight the sconces in the scratch order — the order is in the room." | Judge stalls: name the first sconce out loud; it's a 3-step sequence, never random. |
| Door 10 MURMUR (optional) | Whisper + beam sputter | "Keep the beam on it and back up. Oil *is* the counterplay." | Oil runs low → oil can sits right side of the room; refill is part of the loop. |
| Run card + leaderboard | Types a name (≤12 chars) | "Server-validated, ranked by deepest door. It mirrors to localStorage too." | Name rejected → it's the 12-char sanitizer; pick a plain name. |
| Idle reset | Walks away | "Thirty seconds and it's back to attract for the next person." | Doesn't reset → press any key to re-arm the timer; never reboot mid-demo. |

## 2. Risky-step fallbacks (the "if X, do Y" list)

- **LLM slow or down** → nothing to do: the 0.8 s firewall swaps to canned
  lines instantly. Say: "This is the firewall working — the game is 100%
  playable with the LLM off." Do not restart the backend mid-demo.
- **Pointer lock refused** (embedded browser / kiosk shell) → click the canvas
  once; if the shell still blocks it, run the spectator demo:
  `http://localhost:8402/?auto=1&fps=1` — autopilot plays all 24 doors
  hands-free while you narrate.
- **Frame rate bad on booth hardware** → auto-detect steps down by itself; if
  you must force it, reload with `?quality=low`. Never fiddle with settings
  live.
- **Ports 8401/8402 occupied** → `start.ps1 -BackendPort 8411 -FrontendPort 8412`
  (verified recipe, deployment/README.md).
- **Backend dies** → the game keeps playing; leaderboard falls back to the
  localStorage mirror. Say: "Backend is optional by design."
- **Judge can't get past a door** → checkpoints are at 1/5/9/13/17/21; offer
  "let me show the counterplay once" and demonstrate on their keyboard, then
  hand back.
- **Whole machine fails** → play the pre-recorded run (§4) and narrate live
  over it.

## 3. What NOT to do live

- Don't bind the backend to the LAN (loopback-only is the security posture;
  qa/security.md §7).
- Don't promise co-op or more floors — parked roadmap only.
- Don't say "DOORS" or any Roblox/LSPLASH term out loud or on screen — the
  ip-check gate covers the repo and the video script; the booth talk should
  match. Say "corridor horror genre".

## 4. Pre-recorded fallback plan (record this BEFORE demo day)

Record once, keep the file on the kiosk desktop and in the repo's release
assets (not committed to git if large — host with the submission):

1. **Full manual run** at 1080p: the exact shot list in script.md §C
   (attract → 5 TALLY → 7 GAUNT → 9 CINDER → 24 finale → run card →
   leaderboard → idle reset). This doubles as the submission video.
2. **Autopilot B-roll**: `?auto=1&fps=1` full 24-door run, hands-free —
   proves determinism and gives cutaway footage with the fps meter.
3. **LLM-down take**: stop the backend, record doors 1–7 showing canned lore
   and the death epitaph still working. 30 seconds, powerful in the video.
4. Label files `hallwake-demo-v1.mp4`, `hallwake-auto.mp4`,
   `hallwake-llmdown.mp4`. If live demo fails, play (1) full-screen and
   narrate; judges still see the end-to-end product running on its target
   device.
