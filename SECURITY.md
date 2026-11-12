# Security

## Reporting

Report a vulnerability privately, never in a public issue:

- **Preferred:** [GitHub private vulnerability reporting](https://github.com/Colorado-Startups/space-peak/security/advisories/new).
- **Or email:** info@coloradostartups.org.

There is no bounty. The goal is an acknowledgement within seven days.

## What this repository actually protects

Space Peak is documents. There is no product, no service, no user data, and no credentials in normal operation. The realistic risks, in order:

1. **A credential committed by accident**, most likely a Cloudflare or GitHub token pasted into a note. Caught by GitHub push protection (blocking) and GitHub secret scanning, both on and free for a public repository.
2. **Operational files leaking.** `local/` holds working notes and must never reach the remote. Gitignored, and read in every diff at review.
3. **A speculative claim hardening into an asserted fact.** Not a conventional security issue, but the failure mode most likely to cause real harm to this project, so it is gated like one.

## Posture, stated plainly

| Control | Status |
| --- | --- |
| Branch protection | Org ruleset "Protect default branches": no deletion, no force-push, every change through a pull request |
| Required status checks | Ruleset "main: required checks" (`.github/rulesets/protect-main.json`): `ci / ci-ok` (`.github/workflows/ci.yml`) and `DCO` |
| `local/**` | `.gitignore`, and the reviewer reads every path in the diff |
| Secret scanning | GitHub secret scanning with push protection |
| Code scanning | None. The only code is standard library Python in `04_tools/`, run by `ci.yml` on every pull request |
| Fork pull requests | Read-only token, no secrets, and the first run from a new contributor waits for maintainer approval |
| Dependabot security updates | Enabled |

## Gate design

Three properties, from the maintainer's house standard (Code-OS `rules/writing-and-gates.md`, not public). That standard wins; `04_tools/space_peak_rules.json` carries every rule from it that applies here, so this repository is complete for contributors.

- **One definition, many call sites.** Every rule lives in `04_tools/space_peak_rules.json` and is applied by a checker in `04_tools/`. The Claude hook and CI both shell out to the same checker. No workflow reimplements a check in YAML, and the contract test asserts it.
- **Block on the certain, warn on the likely.** Severity comes from the data file. Heuristics warn.
- **Fail open on infrastructure.** A checker that cannot run exits 3. The Claude hook treats that as a pass, so a missing interpreter never looks like a content violation. CI fails on it, since a runner always has `python3`.

## Dependency policy

`04_tools/` is standard library Python with no third-party dependencies, deliberately: the checks must run identically on a laptop, in the hook, and in CI, with nothing to install and nothing to go stale.

GitHub Actions are **SHA-pinned**, not tagged, so a moved tag cannot change what runs. The pin to Git Crafter's `ci-standard.yml` is checked by that workflow's own conformance step. Dependabot proposes updates weekly and every one is merged by hand.

## Secrets

No repository secrets are configured, and no workflow deploys the thought-leadership piece. Publishing it is Paul's decision under MASTER_PLAN UA 3.2. `pages.yml` publishes only the Quality and Process pages.
