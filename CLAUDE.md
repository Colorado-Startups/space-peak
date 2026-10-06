# Space Peak, Project Instructions

*Router file. Last updated 2026-10-05 (repository created; MASTER_PLAN Phase 1 resolved to Publish, standalone, under the Space Peak name).*

## Precedence

This file restates rules from elsewhere. Where it does, the canonical source wins and this file gets corrected in the same session:

- `~/.claude/rules/writing-and-gates.md` and `~/.claude/rules/working-agreements.md` are the house standards and win over anything here.
- `04_tools/space_peak_rules.json` is the machine-readable rule set every checker reads.
- `02_substance/claims_register.md` is canonical for which claims exist and what their status is.
- `01_doctrine/voice.md` is the project prose layer and must agree with the two above.

`04_tools/space_peak_contract_test.py` enforces that agreement.

## Session start

1. Read this file.
2. Read `00_project_system/MASTER_PLAN.md`. Phase 3 is active; Phases 2 and 4 are struck.
3. Read `01_doctrine/voice.md` before writing any prose.
4. Skim `02_substance/claims_register.md`. It governs every factual claim you may make.
5. Confirm `git config core.hooksPath` is `.githooks`. Without it there is no blocking enforcement on this repo at all.

## The two things that are never negotiable

**Blanca Peak** is Sisnaajini, sacred to the Navajo. **The Crestones and Great Sand Dunes** are a National Park. Neither is a viable site, neither is a candidate, and neither becomes one because the engineering case improves.

You may name them. You may explain why they are excluded. You may not propose either as somewhere to build, bore, site, or launch from. `.claude/hooks/space-peak-check-exclusions.sh` blocks the write. It is the only Claude hook here that blocks rather than warns, and it fires on every Write and Edit.

**Every mountain fact is unverified until diligenced.** State a checkable claim about a peak and it needs a row in `02_substance/claims_register.md`. If that row says `unverified`, the prose must say so too. There is no third option where a number appears bare.

## Which gates fire and which wait

Per the house rule, this is stated explicitly rather than implied:

| Gate | When | Blocking |
| --- | --- | --- |
| `space-peak-check-exclusions.sh` | **Fires** on every Write and Edit | Yes |
| `space-peak-content-guard.sh` | **Fires** on every Write and Edit | No, advisory |
| `space-peak-safety-snapshot.sh` | **Fires** at session end | No |
| `.githooks/pre-commit`, `pre-push` | **Fire** on commit and push | Yes |
| `/space-peak-*` slash commands | **Wait** for you to run them | No |
| GitHub Actions | **Fire** on pull request | No, advisory (see README) |

`.claude/settings.json` is the authority on this wiring, not the header comment in any hook.

## Folder map

```
00_project_system/   MASTER_PLAN.md
01_doctrine/         voice.md
02_substance/        Space-Peak-Concept-Brief.md, claims_register.md
03_deliverables/     DRAFT-thought-leadership.md, maps/, infographics/
04_tools/            space_peak_rules.json and the four checkers
docs/                contributor start-here
local/               operational files, gitignored and blocked from commits
```

## Consult first

| Before doing X | Read Y first |
| --- | --- |
| Anything at all | `00_project_system/MASTER_PLAN.md` |
| Writing or editing prose | `01_doctrine/voice.md` |
| Stating a fact about a peak, elevation, land status, or firing lane | `02_substance/claims_register.md` |
| Changing a rule, term, or severity | `04_tools/space_peak_rules.json`, then run the contract test |
| Drafting the thought-leadership piece | MASTER_PLAN PT 3.1, then skill `space-peak-voice-check` |
| Checking a draft before it ships | Skill `space-peak-publish-gate` |
| Verifying a factual claim | Skill `space-peak-fact-guardrails` |
| Building or editing the site map | Skill `space-peak-site-map` |
| Committing, branching, opening a PR | `CONTRIBUTING.md` |
| Changing a hook or workflow | `SECURITY.md`, then README "Enforcement" |

## Division of labor

Per `Photon Mountain/00_project_system/github_setup_plan.md`: the folder is the source of truth, Cowork edits files, and Claude Code owns git.

## Git

Never push to `main`. Never force-push or hard-reset. Never auto-merge a pull request. `.claude/settings.json` denies all four, plus `--no-verify`, because a gate an agent can skip is not a gate. If a human needs one of those, they run it in their own terminal and say why.

The one exception already taken: the repository's first commit was pushed to `main` directly, because an empty repository has no `main` to open a pull request against. Named here rather than left silent. Every change since goes through a branch.

## Publication is not yours to do

MASTER_PLAN UA 3.2 makes publication a human decision. Do not publish, post, deploy, or send anything externally. Draft, check, open a pull request, and stop.
