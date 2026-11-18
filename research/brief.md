# Chosen target: Cloud9 x JetBrains — Sky's The Limit Hackathon 2026

- URL: https://cloud9.devpost.com/ (Rules tab and Submission Specifics tab fetched 2026-11-18)
- Sponsors: Cloud9 (esports org) + JetBrains. Managed by Devpost. Online, public.
- Deadline (verbatim banner): "Deadline: Jan 12, 2027 @ 11:00am PST". Submission period: Nov 17, 2026 – Jan 12, 2027.
- Competition level: 245 participants (lowest of any live $25k+ AI-adjacent hackathon found).
- Cash: $25,000 total. Per category: winner $6,000 + fully paid GDC trip (airfare+hotel for one) + 1-yr JetBrains All Products Pack + $100 Cloud9 store card; runner-up $2,000 + JetBrains sub. 3 categories. Bonus "Best AI-Powered Workflow Story" prize exists; amount not captured (gap).

## Why chosen
- Solo allowed: "Above legal age of majority in country of residence"; individuals, teams, orgs all eligible.
- No required cloud/paid API: rules require "at least one JetBrains tool (a JetBrains IDE such as IntelliJ IDEA, PyCharm, WebStorm, Rider or DataGrip, JetBrains Air, AI Coding Agent Junie)" — a free IDE satisfies this; registrants get free All Products Pack + AI Ultimate codes. App inference may be 100% local (local vLLM/llama.cpp fits).
- 8-week runway: 1–2 week build now, submit early, iterate until Jan 12.
- Theme fit: AI-powered esports scouting/analytics tool (Categories 1–2) — data + local-LLM insight layer is squarely in this builder's agent-stack wheelhouse.

## Categories (pick one)
1. VAL/GC: VALORANT Tactical Scouting, Utility Placement & Operator Profiler (two featured blueprints or own "pro-tier scouting innovation").
2. LoL: League of Legends Macro Scouting & Draft Management System.
3. Event Mini Game: playable at a Cloud9 booth (Rider recommended; any data; GRID optional).
Official GRID esports data available, optional for every category.

## Judging (official rules, verbatim: "equally weighted criteria")
Stage One: pass/fail — theme fit + "reasonably applies the required JetBrains tools".
Stage Two, 5 criteria at 0.2 each:
- Technological Implementation — "How thoroughly and skillfully does the project use JetBrains tools? ... working, non-trivial implementation"
- Design — complete coherent product experience, not a proof of concept
- Potential Impact — credible, specific case for a real audience
- Quality of the Idea — creative/novel vs existing concepts
- Presentation — video demonstrates project working end-to-end
Tie-break: highest score on first criterion, then next; then judge vote.

## Deliverables (from Official Rules, Submission Requirements)
- Public open-source repo (GitHub/GitLab/Bitbucket) with detectable license file; all source, assets, run instructions; "encourage committing your .idea, .junie or .air folder as supporting evidence".
- Text description explaining features + demonstrating JetBrains tool use.
- Working demo URL (if web) or judge-accessible build (repo install instructions / itch.io / download).
- Demo video <3 min, public on YouTube, showing the project running on its target device; no unlicensed third-party trademarks/music.
- Methodology write-up (approach + how it solves the category problem).
- Bonus track: URL to an AI-workflow write-up (blog post, thread, or AI_SHOWCASE.md in repo).
- English materials. Multiple entries allowed if substantially different.

## Key rules verbatim
- New & Existing: "Projects must be either newly created by the Entrant or, if the Entrant's Project existed prior to the Hackathon Submission Period, must have been significantly updated after the start of the Hackathon Submission Period... Updates that don't change the user experience... do not count."
- IP: submissions "remain the intellectual property of the Entrant"; entrant grants non-exclusive judging/promotion license (3 yrs).
- Third-party: must hold rights for any SDK/API/data; Riot-title projects must comply with Riot developer policies; "games must use original names, artwork, assets and presentation rather than recreating Riot content".
- Excluded: residents of "Brazil, Quebec, Russia, Crimea, Cuba, Iran, and North Korea" + US-sanctioned territories.

## Demo infra note (operator, 2026-11-18)
- Local LLM public tunnel: https://authority-tokyo-disciplines-holly.trycloudflare.com/ (llama.cpp fallback per state.json; 1 slot, semaphore it).
- Risk: trycloudflare quick tunnels are ephemeral (URL changes on restart, no auth). Judges "are not required to test the Project" but a working demo URL is required — plan a stable demo (hosted frontend + tunnel, or judge-accessible build + video as primary evidence). Re-verify tunnel before submission and before judging window.

## Gaps (explicit)
- Bonus prize amount not captured.
- Sponsor-employee exclusion clause not seen in fetched rules text (Devpost standard exceptions likely apply) — re-read full rules before submitting.
- Operator's country not stated — verify not in excluded-territory list.
- Category 1/2 blueprint detail pages (GRID data docs) not yet fetched — do in Phase 5.
