# Space Peak

A concept for a ground-based electromagnetic mass driver bored through a Colorado peak, and the case for why cost-to-orbit is the choke point worth attacking.

**A speculative venture thesis, not an engineering proposal.** The physics is sound. The engineering is 2040s-hard. Every fact about a specific mountain in this repository is a starting point for real diligence, not a verified site assessment.

A Colorado Startups project, supported by Colorado AI. Sibling projects: Photon Mountain, Fusion Canyon.

## Where the project stands

`00_project_system/MASTER_PLAN.md` gated everything behind one decision: park the idea, publish it, or develop it. That decision is made. **Publish**, under the Space Peak name, as a standalone piece rather than under the Photon Mountain umbrella.

Phase 3 of the master plan is active. Phases 2 and 4 are struck. The live work is drafting `03_deliverables/DRAFT-thought-leadership.md`.

Nothing here has been published. Publication is a separate human action under MASTER_PLAN UA 3.2, and `deploy-site.yml` is manual-trigger-only and fails by design until someone configures it deliberately.

## Folder map

```
00_project_system/   MASTER_PLAN.md. Read first.
01_doctrine/         voice.md. How this project writes, and what the linters enforce.
02_substance/        The concept brief, and claims_register.md.
03_deliverables/     The draft, the map, the infographics.
04_tools/            The rules file and the four checkers.
docs/                Contributor start-here.
local/               Operational files. Gitignored, and blocked from commits.
.claude/             Hooks and settings for the Claude Code harness.
.githooks/           Blocking pre-commit and pre-push routers.
.github/             CI, templates, CODEOWNERS, dormant rulesets.
```

## The two files to understand

### `02_substance/claims_register.md`

This project's real risk is not a leaked credential. It is a speculative mountain fact hardening into an asserted one somewhere between a draft and a published piece, with nobody able to point at the moment it happened. The register is every checkable claim with a status, machine-readable so a checker can act on it.

**Two rows are frozen and never change:**

| Site | Why |
| --- | --- |
| **Blanca Peak** | Sisnaajini, sacred to the Navajo. |
| **Crestones / Great Sand Dunes** | National Park. |

Neither is an engineering judgement, so neither is revisable by better engineering. The concept brief describes Blanca as high, southern, and on paper near-perfect, one clause before excluding it. That is precisely why the row is frozen rather than merely ranked low: a good engineering case is the pressure that erodes a non-engineering answer over time, one reasonable-sounding draft at a time.

### `04_tools/space_peak_rules.json`

Every term, cue list, severity, limit and exemption, in one machine-readable file. Nothing in this repository hardcodes a rule that belongs there. `04_tools/space_peak_contract_test.py` asserts that the prose surfaces (this file, `CLAUDE.md`, `voice.md`, `CONTRIBUTING.md`) still agree with it, so a new rule cannot be added without being registered and the surfaces cannot drift apart in silence.

## Enforcement: read this before you trust a green check

**Every CI check here is advisory. None can block a merge.**

That is a plan limitation, not a design choice. `Colorado-Startups` is on **GitHub Free**, and rulesets are unavailable for private repositories on that plan. Verified on 2026-10-05 by applying both definitions in `.github/rulesets/`: GitHub answered `HTTP 403, Upgrade to GitHub Pro or make this repository public to enable this feature.` It rejects them outright rather than accepting them and quietly enforcing nothing, so nobody will read an `enforcement: active` and trust a rule that does nothing.

So enforcement moved client-side and got teeth:

| Control | Where | Blocking? |
| --- | --- | --- |
| Paths, sizes, secrets, em dashes, exclusions | `.githooks/pre-commit` | **Yes** |
| The same checks again, over what the push will send | `.githooks/pre-push` | **Yes** |
| Permanent exclusions, during a Claude Code session | `.claude/hooks/space-peak-check-exclusions.sh` | **Yes** |
| Everything, for web-UI and cloud-agent commits the hooks never see | `.github/workflows/` | No, advisory |

`pre-push` repeats `pre-commit` because `git commit --no-verify` skips the latter. On a repo with a server-side ruleset that gap is survivable, because the server catches what the client missed. Here there is no server-side catch, so a single bypassable hook would be the whole defence.

Enable the hooks once per clone:

```bash
git config core.hooksPath .githooks
```

### What blocks and what warns

Severity comes from `04_tools/space_peak_rules.json`, following the rule *block on the certain, warn on the likely*. Blocking on a heuristic teaches people to bypass the gate, which costs more than it saves.

**Blocks** (deterministic, auto-fixable): `em-dash`, `local-path`, `oversized-file`, `secret`, `exclusion-proposed`, `frozen-row-edit`.

**Warns** (heuristics): `unattributed-figure`, `unregistered-claim`, `unlabeled-claim`, `sentence-length`, `hedge-word`, `spaced-en-dash`.

A checker that cannot run exits 3 and the caller treats it as a warning and passes. Could not verify is not the same as verified and red.

### Turning on real enforcement

Move the org to a paid plan (GitHub lists Team at about four dollars per seat per month with no seat minimum; check current pricing first), then apply the two definitions, which are already written and version-controlled:

```bash
gh api -X POST repos/Colorado-Startups/space-peak/rulesets --input .github/rulesets/protect-main.json
```

No rework needed. The same files drop into `photon-mountain` and `fusion-canyon`.

## Running the checks yourself

```bash
python3 04_tools/space_peak_rules.py
python3 04_tools/space_peak_lint.py --self-test
python3 04_tools/space_peak_claims.py --self-test
python3 04_tools/space_peak_files.py --self-test
python3 04_tools/space_peak_contract_test.py
```

Every checker is standard library Python, deterministic, and offline. Each ships a self-test that seeds a known-bad and a known-clean sample. CI runs all five before any real check, because a checker that has broken reports files clean, and that looks exactly like success.

## This repository is a template

`Colorado-Startups` had no repositories before this one. Photon Mountain and Fusion Canyon are not on GitHub yet. The scaffolding here is built to be copied twice more: the rules-in-data pattern, the contract test, the dormant rulesets, the routing hooks, and the one-definition-many-call-sites shape that keeps the harness, the hooks and CI from disagreeing.

## A note on the old folder

This repository's working copy is `~/Developer/space-peak`. The original `~/Developer/Space Peak` folder is owned by a different macOS account (`soulcraft`) and is not writable here, which is why git lives in a new directory rather than in place.

**Nothing depends on that folder any more.** Verified 2026-10-08: it holds six files and nothing hidden, and every one is byte-identical to its copy in this repository's first commit (`847a567`). Nothing in the repo reads from that path.

So the folder is not a blocker to fix, it is a leftover to retire. Whenever the owner wants it gone:

```bash
sudo rm -rf "/Users/coloradostartups/Developer/Space Peak"
```

A plain `rm -rf` from this account fails, because unlinking the files inside needs write permission on the folder itself, which this account does not have. Moving it aside should work without `sudo`, since renaming only needs write permission on `~/Developer`, though that is reasoning from the permission bits rather than something tested here.

An earlier version of this section presented the `chown` as a prerequisite. It never was. The repository was built without it.
