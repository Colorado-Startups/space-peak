# Security

| Report | Where |
| --- | --- |
| A vulnerability, preferred | [GitHub private vulnerability reporting](https://github.com/Colorado-Startups/space-peak/security/advisories/new) |
| Or by email | info@coloradostartups.org |
| Machine-readable contact | [`/.well-known/security.txt`](https://spacepeak.coloradostartups.workers.dev/.well-known/security.txt) (RFC 9116), from `site/public/.well-known/security.txt` |
| Never | A public issue |

There is no bounty. The goal is an acknowledgement within seven days.

## What this repository actually protects

Space Peak is documents and a static website. There are no accounts, no forms that store data, no user data, and no credentials in normal operation. The realistic risks, in order:

1. **A credential committed by accident**, most likely a Cloudflare or GitHub token pasted into a note. Caught by GitHub push protection (blocking) and GitHub secret scanning, both on and free for a public repository.
2. **Operational files leaking.** `local/` holds working notes and must never reach the remote. Gitignored, and read in every diff at review.
3. **A speculative claim hardening into an asserted fact.** Not a conventional security issue, but the failure mode most likely to cause real harm to this project, so it is gated like one.

## The site's headers

`site/public/_headers` sets these on Workers static assets; `site/test/unit/headers.test.ts` checks them.

| Header | Value, in short |
| --- | --- |
| `Content-Security-Policy` | `'self'` only, plus the two map tile hosts; no framing, no plugins |
| `Strict-Transport-Security` | One year, with subdomains |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Robots-Tag` | `noindex` on the workers.dev host |

## Posture, stated plainly

| Control | Status |
| --- | --- |
| Branch protection | Org ruleset "Protect default branches": no deletion, no force-push, every change through a pull request |
| Required status checks | Ruleset "main: required checks" (`.github/rulesets/protect-main.json`): `ci / ci-ok` (`.github/workflows/ci.yml`) and `DCO` |
| `local/**` | `.gitignore`, and the reviewer reads every path in the diff |
| Secret scanning | GitHub secret scanning with push protection |
| Code scanning | None. The code is standard library Python in `04_tools/` and the static site in `site/`, both run by `ci.yml` |
| Fork pull requests | Read-only token, no secrets, and the first run from a new contributor waits for maintainer approval |
| Dependabot security updates | Enabled |

## Gate design

Three properties, from the maintainer's house standard (Code-OS `rules/writing-and-gates.md`, not public). That standard wins; `04_tools/space_peak_rules.json` carries every rule from it that applies here, so this repository is complete for contributors.

- **One definition, many call sites.** Every rule lives in `04_tools/space_peak_rules.json` and is applied by a checker in `04_tools/`. CI shells out to the checker. No workflow reimplements a check in YAML, and the contract test asserts it.
- **Block on the certain, warn on the likely.** Severity comes from the data file. Heuristics warn.
- **Fail open on infrastructure.** A checker that cannot run exits 3, so a missing interpreter never looks like a content violation. CI fails on it, since a runner always has `python3`.

## Dependency policy

The site's npm packages are pinned to exact versions in `site/package.json` and `package-lock.json`, and CI installs them with `npm ci`.

`04_tools/` is standard library Python with no third-party dependencies, deliberately: the checks must run identically on a laptop and in CI, with nothing to install and nothing to go stale.

GitHub Actions are **SHA-pinned**, not tagged, so a moved tag cannot change what runs. The pin to Git Crafter's `ci-standard.yml` is checked by that workflow's own conformance step. Dependabot proposes updates weekly and every one is merged by hand.

## Secrets

No repository secrets are configured. `pages.yml` publishes the Quality and Process pages and the map. Cloudflare Workers Builds deploys the site through Cloudflare's own GitHub connection, so the deploy needs no repository secret.
