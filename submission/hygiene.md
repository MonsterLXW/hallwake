# HALLWAKE — repo hygiene pass (Phase 12, 2026-11-18)

All checks run today on this repo (branch `master`, no remote — local only).

## 1. Tracked-junk audit

Before this pass, two build caches were tracked:
`app/frontend/tsconfig.app.tsbuildinfo`, `app/frontend/tsconfig.node.tsbuildinfo`.
They are now `git rm --cached` (files stay on disk) and `*.tsbuildinfo` is
gitignored. `state.json` (HackathonFactory internal orchestration state —
contains operator directives and the LAN vLLM address) was also untracked; it
stays on disk for the pipeline but is not part of the public repo.

After the pass:

```
$ git ls-files | grep -Ei 'node_modules|\.venv|dist/|__pycache__|\.pyc|\.db$|\.env$|tsbuildinfo|state\.json'
CLEAN: no junk tracked          # (grep exit 1 — zero matches)
$ git ls-files | wc -l
111
```

History was always clean of build artifacts:

```
$ git log --all --name-only --pretty=format: | grep -c "node_modules\|\.venv/\|dist/"
0
```

On-disk `node_modules/`, `dist/`, `.venv/`, `app/backend/data/hallwake.db`
exist for local runs but are gitignored (`.gitignore` lines 1-7).

## 2. .gitignore / .gitattributes

Both present at root. `.gitignore` now also covers `*.tsbuildinfo` and
`state.json`, and carries an explicit note that `.idea/` and `.junie/` are
**intentionally not ignored** — the rules require committing them as
JetBrains tool-use evidence (deliverables checklist row 3). `.gitattributes`
pins `*.sh text eol=lf` and `*.woff2 binary`.

## 3. Secrets

Keyword + pattern scan over all 111 tracked files (api key/secret/password/
private-key/sk-/AKIA/AIza/ghp_/xox tokens): **zero hits** beyond doc prose
that literally says "no secrets". History scan: no `.env`/`.pem`/`.key`/
`id_rsa`/`credentials` ever added (`git log --all --diff-filter=A`). The only
external URL in shipped code is the keyless LAN vLLM endpoint (Tailscale CGNAT
range, `app/backend/llm.py:21`) — keyless by design, cleared by the Phase 9
audit (`qa/security.md` §1). `.env` is gitignored.

## 4. ip-check (IP-safety gate)

```
$ bash scripts/ip-check.sh --selftest
ip-check: selftest 1/2 OK - planted violation detected
ip-check: selftest 2/2 OK - repo clean (15 banned terms)
ip-check exit: 0
```

Green including the new root `README.md` (README* is a scan root). Also runs
in CI (`.github/workflows/ci.yml`).

## 5. Known mentions outside shipped material (operator decision)

`ip-check` deliberately scans only shipped material (`app/`, `scripts/`,
`.github/`, `README*`). The methodology docs (`plan/`, `qa/`, `presentation/`,
`deployment/`) discuss the genre and the IP-safety policy in prose and
therefore contain the third-party game title in that discussion context
(e.g. `plan/idea.md` §0 lists banned terms; `presentation/qa.md` answers a
judge's clone accusation). This is nominative discussion, not shipped content.
Note: historical commits also contain the word inside the now-untracked
`state.json` directive text. Options for the operator before making the repo
public: (a) leave as-is — discussion of a genre reference is not infringement
and the methodology story is stronger for it, or (b) drop `research/` (and
optionally `plan/`) from the public push, or (c) squash history. Recommendation:
(a) — keep the honest paper trail.

## 6. Verdict

Repo is submission-clean: 111 tracked files, no build artifacts, no secrets,
no banned terms in shipped material, license present (MIT + bundled OFL font
licenses), run instructions verified. Remaining gates are human-only and
listed in `submission/deliverables-checklist.md` (rows 2, 3, 4, 9, 10, 15).
