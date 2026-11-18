# Candidate discovery notes — fresh-nov-2026 (2026-11-18)

## Method & caveats
- WebSearch returned zero results for every query (same as prior run); lablab.ai now redirects to starfieldlabs.ai/ai-hackathons which lists "No events yet" — gap.
- Discovery via Devpost API (`/api/hackathons?challenge_type[]=ongoing&order_by=deadline`, 6 pages) + curl of competition pages (WebFetch gets 403 on devpost.com).
- Non-Devpost platforms (DoraHacks, Devfolio, Hackathon.com, Kaggle) not checked — gap.
- Operator constraints: solo, local LLM only (no paid APIs), 1–2 week build starting 2026-11-18.

## CHOSEN: Cloud9 x JetBrains: Sky's The Limit Hackathon 2026
https://cloud9.devpost.com/ — deadline "Jan 12, 2027 @ 11:00am PST", $25,000 cash, 245 participants.
Why: solo OK (adults, all countries except standard exceptions); free JetBrains IDE satisfies the tool requirement (registrants get free All Products Pack + AI Ultimate codes); no required cloud LLM — local inference fully allowed; esports-scouting analytics fits an agent/data builder; lowest competition of any $25k+ live event found; 8-week runway with 1–2 week build.
Rubric: Stage One pass/fail (theme + JetBrains tool use), Stage Two five equally weighted criteria (0.2 each): Technological Implementation / Design / Potential Impact / Quality of Idea / Presentation. See brief.md for deliverables.

## Strong runner-up (parallel entry candidate)
- Open Agentic Web Challenge — https://cognizant-agenticweb.devpost.com/ — deadline re-verified 2026-11-18: "Jan 11, 2027 @ 8:00am PST". $10,000 cash, 1,176 participants, solo OK, local LLM explicitly allowed (config-your-own-LLM interface permitted). Rejected as primary: 5x competition, less cash, heavier spec-compliance burden (agent-network manifest + runtime + interface per open agentic web spec). Same deadline week — one project cannot serve both.

## Rejected — eligibility
- Arbiter Hacks V1 (https://arbiter-hacks-v1.devpost.com/) — Dec 20, 2026 @ 9:00pm PST, $7,800, explicit weights (General: Tech 35/Innovation 25/Polish 25/Presentation 15; Theme=waste/recycling: Impact 35/Tech 25/Feasibility 20/Presentation 20). INELIGIBLE: "Ages 13+ only / Students only / Companies/professional organizations excluded".
- SafeSpace Hacks (https://safespace-hacks.devpost.com/) — banner "Dec 9, 2026 @ 5:00pm EST" (overview still says Nov 22 — conflict unresolved). INELIGIBLE: students only, companies excluded.
- Kaya AI Grand Challenge (https://kaya-ai-grand-challenge.devpost.com/) — Nov 30–Dec 6, 2026, $3,000. INELIGIBLE: "Team required: 2 to 4 members", only specific countries (India), Mumbai live finale.
- AWS MSP AI Hackathon (https://aws-agentic-msp.devpost.com/) — Dec 11, 2026, $64,000. INELIGIBLE: org-gated (AWS partner/MSP) + must use AWS AI services (Bedrock etc.) — conflicts with local-only inference.
- Teens in AI Global Challenge 2027, unihacks, Girls Who Code events — student/youth only.

## Rejected — tech-constraint conflicts (local LLM unreachable or paid cloud required)
- Reddit's Game of the Day Hackathon (https://redditgameofday2026.devpost.com/) — Dec 8, 2026 @ 6:00pm PST, $35,000, 1,693 reg, adults OK. Must build interactive apps on Reddit's Devvit platform ("compliant with Devvit Rules"); app runs on Reddit servers — local vLLM unreachable without a public tunnel; rubric (Delightful UX/Polish/Reddit-y/Daily Content) is community-apps flavored. Big prize but platform-hosting conflict.
- Codegeist 2026 (Atlassian) — Dec 22, 2026, $120,000, 4,156 reg. Must run on Atlassian Forge — Forge backend cannot reach a local/private-network LLM; heavy port; 5x20% rubric.
- Kiroween 2026 (Kiro/AWS) — Dec 4, 2026, $100,000, 16,311 reg. Tech score = depth of Kiro (AWS agentic IDE, cloud Claude) usage — conflicts with no-paid-API spirit; brutal field; 16-day fuse.
- #BuildHybridAI 2026 (Google/Firebase) — Nov 30, 2026. Requires Firebase AI Logic + Gemini Nano/Apple FM with cloud fallback.
- Deck the Pixels (https://deckthepixels.devpost.com/) — Dec 7, 2026, $25,000. Adobe Photoshop "Nano Banana" generative-AI design challenge — requires paid Adobe cloud models.
- QNX Global Hackathon (https://qnx.devpost.com/) — Dec 15, 2026, $50,000, 1,943 reg. Embedded RTOS (Blackberry QNX) domain; commercial SDK; not LLM-centric — poor fit.

## Rejected — too small / too soon / too far
- Taskforge (Nov 24, $0), STEM2Connect (Nov 21), Build Your First AI App (Nov 27), CSC Winter Sparkathon (Nov 30, $300), Code for Change (Dec 1, $200), ML Empowerment Build Challenge 4.0 (Dec 2, $0), LaunchPad Hacks (Dec 4, $300 cash despite "580k" headline), Green Shift Hacks (Dec 10, $125), AI OpenBuild (Dec 10, $150), Silicon Valley Buildathon (Dec 15, $500), AccessED Hacks (Dec 20, $225), GenHacks (Dec 26, CAD 1,050), SLAY HACKS (Dec 7, $4,500, beginner/student-flavored).
- Too far out: Build with AI – Pico Space Program (Feb 1, 2027), InnovArt 2027 (Jan 2, 2027), HackTCNJ 2027 (Feb 27–28, in-person), MLH 2027 season (in-person, student).
- Open Sourcery F26 Showcase (Dec 4–11) — academic showcase, not a prize competition.

## Leads carried from sentinel-pentest-ide research (verified this pass)
- Open Agentic Web Challenge deadline confirmed (above).
- DEF CON 35 / AI Village: defcon.org still not fetched this pass — gap; Demo Labs idea for summer 2027 unchanged.

## Inferences (labeled)
- Cloud9's "Technological Implementation" criterion scores JetBrains-tool depth, not LLM hosting — using IntelliJ IDEA/PyCharm Community (free) plus the free AI Ultimate codes should pass Stage One; committing .idea/.junie folders is the rules' own suggested evidence.
- Category 1 or 2 (scouting tools) is a better fit than Category 3 (game) for this builder's stack; GRID data is optional, so public Riot/VALORANT stat APIs + local-LLM analysis is a viable build.
- trycloudflare tunnel (operator-provided: https://authority-tokyo-disciplines-holly.trycloudflare.com/) can expose the local LLM for a judge-accessible demo, but quick tunnels are ephemeral — treat the <3-min video + repo build instructions as the primary evidence and keep the demo best-effort.
