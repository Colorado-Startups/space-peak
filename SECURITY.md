# Security

## Reporting

A private, single-maintainer repository. Report anything sensitive directly to `@paul-co-startups`. Do not open a public issue.

## What this repository actually protects

Space Peak is documents. There is no product, no service, no user data, and no credentials in normal operation. The realistic risks, in order:

1. **A credential committed by accident**, most likely a Cloudflare or GitHub token pasted into a note. Caught by gitleaks in `pre-commit` and `pre-push` (blocking), and by `secret-scan` over full history.
2. **Operational files leaking.** `local/` holds working notes and must never reach the remote. Gitignored, and blocked by `04_tools/space_peak_files.py` even if force-added.
3. **A speculative claim hardening into an asserted fact.** Not a conventional security issue, but the failure mode most likely to cause real harm to this project, so it is gated like one.

## Known posture limitations, stated plainly

`Colorado-Startups` is on the **GitHub Free** plan. That removes several controls a reader might assume are present:

| Control | Status | What covers it instead |
| --- | --- | --- |
| Branch rulesets | **Rejected** on private repos on Free (HTTP 403, verified 2026-10-05) | `.githooks/pre-commit` and `pre-push`, both blocking |
| Push rulesets (`local/**`, file size) | **Rejected** on Free (HTTP 403, verified 2026-10-05) | `04_tools/space_peak_files.py`, called from the hooks and CI |
| Required status checks | **Unavailable** | Nothing. Checks are advisory; read them |
| GitHub secret scanning | **Unavailable** (needs Secret Protection) | gitleaks binary |
| CodeQL code scanning | **Unavailable** (needs Code Security) | semgrep, in `sast.yml` |
| CODEOWNERS auto-review | **Non-functional** below Team | Nothing. Staged for the upgrade |
| Dependabot security updates | **Available and enabled** | Native |

The two ruleset definitions live in `.github/rulesets/` and are version-controlled so upgrading the plan is one command with no rework. Applying them today returns 403, which is recorded in each file's own comment block.

**Do not read a green CI check as a merge gate.** It is not one.

## Gate design

Three properties, from `~/.claude/rules/writing-and-gates.md`:

- **One definition, many call sites.** Every rule lives in `04_tools/space_peak_rules.json` and is applied by a checker in `04_tools/`. The Claude hooks, the git hooks, and CI all shell out to the same checker. No workflow reimplements a check in YAML, and the contract test asserts it.
- **Block on the certain, warn on the likely.** Severity comes from the data file. Heuristics warn.
- **Fail open on infrastructure.** A checker that cannot run exits 3, and every caller treats that as a warning and passes. A missing interpreter must never look like a content violation.

## Dependency policy

`04_tools/` is standard library Python with no third-party dependencies, deliberately: the checks must run identically on a laptop, in a hook, and in CI, with nothing to install and nothing to go stale.

GitHub Actions are **SHA-pinned**, not tagged, so a moved tag cannot change what runs. Dependabot proposes updates weekly and every one is merged by hand.

## Secrets

No repository secrets are configured. `deploy-site.yml` is staged and fails by design, precisely so nobody adds `CLOUDFLARE_API_TOKEN` before there is a reviewed decision to publish.
