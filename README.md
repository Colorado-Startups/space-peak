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
.claude/             The exclusion hook, two skills, one agent, settings.
.github/             CI, templates, CODEOWNERS, ruleset definitions.
quality/             Git Crafter Quality and Process page configs.
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

Every term, cue list, severity, limit and exemption, in one machine-readable file. Nothing in this repository hardcodes a rule that belongs there. `04_tools/space_peak_contract_test.py` asserts that the prose surfaces (this file, `AGENTS.md`, `voice.md`, `CONTRIBUTING.md`, the register) still agree with it, so a new rule cannot be added without being registered and the surfaces cannot drift apart in silence.

## Enforcement: what a green check means

Two checks are required on `main`: `ci / ci-ok` and `DCO`. `ci / ci-ok` is the verdict of `.github/workflows/ci.yml`, which calls Git Crafter's `ci-standard.yml` and runs every Space Peak checker in one short job. A pull request cannot merge until both pass. The org ruleset "Protect default branches" also blocks deletion and force-push, and sends every change through a pull request.

The checkers run in two places, from one definition:

| Control | Where | Blocking? |
| --- | --- | --- |
| Permanent exclusions, during a Claude Code session | `.claude/hooks/space-peak-check-exclusions.sh` | **Yes** |
| Everything, on every pull request, forks included | `.github/workflows/ci.yml` | **Yes**, required on `main` |
| Secrets | GitHub secret scanning with push protection | **Yes**, at push |

CI covers every path a change can take: a laptop, the web UI, a fork or a cloud agent. There are no git hooks to turn on.

### What blocks and what warns

Severity comes from `04_tools/space_peak_rules.json`, following the rule *block on the certain, warn on the likely*. Blocking on a heuristic teaches people to bypass the gate, which costs more than it saves.

Blocking: the two dash checks, `exclusion-proposed` and `frozen-row-edit`. Everything else warns. The lists live in `severity` in the rules file, and nowhere else.

A checker that cannot run exits 3. The exclusion hook treats that as a pass; in CI it fails the job, since a runner always has `python3`. Could not verify is not the same as verified and red.

### Where the required checks are defined

`.github/rulesets/protect-main.json` is the source of truth for the required checks. A change to that file takes effect only when a maintainer applies it with `gh api` to the live ruleset, so the two are checked against each other after every change.

## Running the checks yourself

Cloud first, the Mac last and small (Paul, 2026-11-02). Push your branch: `ci.yml` runs both self-tests, the contract test, and the claims and voice checkers over every tracked Markdown file, in under a second of work. Its commands are the `short:` block in that file.

One checker on the Mac is fine while you change it:

```bash
python3 04_tools/space_peak_lint.py --self-test
```

Every checker is standard library Python, deterministic, and offline. Each ships a self-test that seeds a known-bad and a known-clean sample. CI runs them before any real check, because a checker that has broken reports files clean, and that looks exactly like success.

## Quality and Process pages

`.github/workflows/pages.yml` builds Git Crafter's Quality, Speed and Consumption page and its Process page from `quality/config.json` and `quality/process/config.json`. They measure this repository's pull requests, CI and Claude sessions. They are not the thought-leadership piece, and publishing them publishes nothing about a mountain.

## A template for sibling projects

This scaffolding is built to be copied into sibling projects such as Photon Mountain and Fusion Canyon. The parts worth copying are the rules-in-data pattern, the contract test and the one blocking hook. So is the one-definition-many-call-sites shape, which keeps the harness and CI from disagreeing.

## License

Everything Colorado Startups wrote here is dedicated to the public domain under [CC0 1.0](LICENSE). Use it for anything, with no credit needed. The code (`04_tools/`, `.claude/hooks/`, `.github/workflows/`) is also offered under [0BSD](LICENSES/0BSD.txt), whichever you prefer.

Two things here belong to others and keep their own terms:

- `CODE_OF_CONDUCT.md` is adapted from the Contributor Covenant 3.0, licensed CC BY-SA 4.0.
- The basemap tiles in `03_deliverables/infographics/Satellite-Peak-site-map.html` load at view time from OpenTopoMap (CC BY-SA) and CARTO, built on OpenStreetMap data. The map displays their credit.
