# Space Peak

A concept for a ground-based electromagnetic mass driver bored through a Colorado peak, and the case for why cost-to-orbit is the choke point worth attacking.

**A speculative venture thesis, not an engineering proposal.** The physics is sound. The engineering is 2040s-hard. Every fact about a specific mountain in this repository is a starting point for real diligence, not a verified site assessment.

A Colorado Startups project, supported by Colorado AI. Sibling projects: Photon Mountain, Fusion Canyon.

## Where the project stands

`00_project_system/MASTER_PLAN.md` gated everything behind one decision: park the idea, publish it, or develop it. That decision is made. **Publish**, under the Space Peak name, as a standalone piece rather than under the Photon Mountain umbrella.

Phase 3 of the master plan is active. Phases 2 and 4 are struck. The live work is drafting `03_deliverables/DRAFT-thought-leadership.md`.

The repository is public so anyone can contribute. The thought-leadership piece itself has not been published: that is a separate human action under MASTER_PLAN UA 3.2. `deploy-site.yml` is manual-trigger-only and fails by design until someone configures it deliberately.

## Contributing

Anyone can contribute: corrections, sources, drafts, questions and tooling. Start with `docs/START-HERE.md`, then `CONTRIBUTING.md`. Questions and ideas go to [Discussions](https://github.com/Colorado-Startups/space-peak/discussions). Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).

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
.github/             CI, templates, CODEOWNERS, ruleset definitions.
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

## Enforcement: what a green check means

Seven CI checks are required on `main`: `selftests`, `guardrails`, `fact-guardrails`, `voice-check`, `secret-scan`, `docs-lint` and `DCO`. A pull request cannot merge until all seven pass. The org ruleset "Protect default branches" also blocks deletion and force-push, and sends every change through a pull request.

The same checkers run in several places, from one definition:

| Control | Where | Blocking? |
| --- | --- | --- |
| Paths, sizes, secrets, em dashes and spaced en dashes, exclusions | `.githooks/pre-commit` | **Yes** |
| The same checks again, over what the push will send | `.githooks/pre-push` | **Yes** |
| Permanent exclusions, during a Claude Code session | `.claude/hooks/space-peak-check-exclusions.sh` | **Yes** |
| Everything, on every pull request, forks included | `.github/workflows/` | **Yes**, required on `main` |
| Any self-test or scan, on demand, for any ref | `.github/workflows/cloud-test.yml` | No, advisory |

The local hooks catch problems before a push. CI is the backstop for contributors who never turned the hooks on, and for web-UI and cloud-agent commits.

Enable the hooks once per clone:

```bash
git config core.hooksPath .githooks
```

### What blocks and what warns

Severity comes from `04_tools/space_peak_rules.json`, following the rule *block on the certain, warn on the likely*. Blocking on a heuristic teaches people to bypass the gate, which costs more than it saves.

**Blocks** (deterministic, auto-fixable): `em-dash`, `spaced-en-dash`, `local-path`, `oversized-file`, `secret`, `exclusion-proposed`, `frozen-row-edit`.

**Warns** (heuristics): `unattributed-figure`, `unregistered-claim`, `unlabeled-claim`, `sentence-length`, `hedge-word`.

Contract C14 in `04_tools/space_peak_contract_test.py` fails if these two lists stop matching the rules file.

A checker that cannot run exits 3 and the caller treats it as a warning and passes. Could not verify is not the same as verified and red.

### Where the required checks are defined

`.github/rulesets/protect-main.json` is the source of truth for the required checks. A change to that file takes effect only when a maintainer applies it with `gh api` to the live ruleset, so the two are checked against each other after every change.

## Running the checks yourself

Cloud first, the Mac last and small (Paul, 2026-11-02). The default is CI: `selftests.yml` runs the rules loader, the three self-tests and the contract test on every pull request and every push to `main`. To run one of them, or semgrep, against a branch, dispatch it by name:

```bash
gh workflow run cloud-test.yml --ref <branch> -f script=lint:self-test
gh run list --workflow cloud-test.yml --limit 1
```

The names live in `.github/cloud-test.json`, the only commands a dispatch can reach. Dispatching needs write access; a contributor gets the same runs from their pull request. A new name works by dispatch only after it merges. The shared workflow behind it is `cloud-test/README.md` in `Colorado-Startups/.github`.

Paul's rule allows a rare, seconds-long check on the Mac, so a single self-test may still run locally while you change its checker:

```bash
python3 04_tools/space_peak_lint.py --self-test
```

The git hooks still run the contract test on every commit and push, because it only reads files.

Every checker is standard library Python, deterministic, and offline. Each ships a self-test that seeds a known-bad and a known-clean sample. CI runs all five before any real check, because a checker that has broken reports files clean, and that looks exactly like success.

## A template for sibling projects

This scaffolding is built to be copied into sibling projects such as Photon Mountain and Fusion Canyon. The parts worth copying are the rules-in-data pattern, the contract test and the routing hooks. So is the one-definition-many-call-sites shape, which keeps the harness, the hooks and CI from disagreeing.

## License

Everything Colorado Startups wrote here is dedicated to the public domain under [CC0 1.0](LICENSE). Use it for anything, with no credit needed. The code (`04_tools/`, `.githooks/`, `.github/scripts/`, `.claude/hooks/`) is also offered under [0BSD](LICENSES/0BSD.txt), whichever you prefer.

Two things here belong to others and keep their own terms:

- `CODE_OF_CONDUCT.md` is adapted from the Contributor Covenant 3.0, licensed CC BY-SA 4.0.
- The basemap tiles in `03_deliverables/infographics/Satellite-Peak-site-map.html` load at view time from OpenTopoMap (CC BY-SA) and CARTO, built on OpenStreetMap data. The map displays their credit.
