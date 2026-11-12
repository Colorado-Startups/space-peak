# Security

## Reporting

Report a vulnerability privately, never in a public issue:

- **Preferred:** [GitHub private vulnerability reporting](https://github.com/Colorado-Startups/space-peak/security/advisories/new).
- **Or email:** info@coloradostartups.org.

There is no bounty. The goal is an acknowledgement within seven days.

## What this repository actually protects

Space Peak is documents. There is no product, no service, no user data, and no credentials in normal operation. The realistic risks, in order:

1. **A credential committed by accident**, most likely a Cloudflare or GitHub token pasted into a note. Caught by gitleaks in `pre-commit` and `pre-push` (blocking), and by `secret-scan` over full history.
2. **Operational files leaking.** `local/` holds working notes and must never reach the remote. Gitignored, and blocked by `04_tools/space_peak_files.py` even if force-added.
3. **A speculative claim hardening into an asserted fact.** Not a conventional security issue, but the failure mode most likely to cause real harm to this project, so it is gated like one.

## Posture, stated plainly

| Control | Status |
| --- | --- |
| Branch protection | Org ruleset "Protect default branches": no deletion, no force-push, every change through a pull request |
| Required status checks | Ruleset "main: required checks" (`.github/rulesets/protect-main.json`): `selftests`, `guardrails`, `fact-guardrails`, `voice-check`, `secret-scan`, `docs-lint`, `DCO` |
| `local/**` and file size | The required `guardrails` check, through `04_tools/space_peak_files.py`. GitHub push rulesets do not apply to public repositories |
| Secret scanning | GitHub secret scanning with push protection, plus the gitleaks binary in the hooks and in `secret-scan.yml` over full history |
| Code scanning | semgrep, in `sast.yml` |
| Fork pull requests | Read-only token, no secrets, and the first run from a new contributor waits for maintainer approval |
| Dependabot security updates | Enabled |

## Gate design

Three properties, from the maintainer's house standard (Code-OS `rules/writing-and-gates.md`, not public). That standard wins; `04_tools/space_peak_rules.json` carries every rule from it that applies here, so this repository is complete for contributors.

- **One definition, many call sites.** Every rule lives in `04_tools/space_peak_rules.json` and is applied by a checker in `04_tools/`. The Claude hooks, the git hooks, and CI all shell out to the same checker. No workflow reimplements a check in YAML, and the contract test asserts it.
- **Block on the certain, warn on the likely.** Severity comes from the data file. Heuristics warn.
- **Fail open on infrastructure.** A checker that cannot run exits 3, and every caller treats that as a warning and passes. A missing interpreter must never look like a content violation.

## Dependency policy

`04_tools/` is standard library Python with no third-party dependencies, deliberately: the checks must run identically on a laptop, in a hook, and in CI, with nothing to install and nothing to go stale.

GitHub Actions are **SHA-pinned**, not tagged, so a moved tag cannot change what runs. Dependabot proposes updates weekly and every one is merged by hand.

## Secrets

No repository secrets are configured. `deploy-site.yml` is staged and fails by design, precisely so nobody adds `CLOUDFLARE_API_TOKEN` before there is a reviewed decision to publish.
