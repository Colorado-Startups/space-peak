# Security

| Report | Where |
| --- | --- |
| Preferred | [GitHub private vulnerability reporting](https://github.com/Colorado-Startups/space-peak/security/advisories/new) |
| Email | info@coloradostartups.org |
| Machine-readable | [`/.well-known/security.txt`](https://spacepeak.coloradostartups.workers.dev/.well-known/security.txt) (RFC 9116), from `site/public/.well-known/security.txt` |
| Never | A public issue |

No bounty. Acknowledgement within seven days is the goal.

## Risks

Space Peak is documents and a static website: no accounts, data-storing forms, user data or credentials in normal operation.

| Realistic risk, in order | Guard |
| --- | --- |
| A credential committed by accident, most likely a Cloudflare or GitHub token pasted into a note | Secret scanning |
| Operational files leaking: working notes in `local/`, which must never reach the remote | `local/**` |
| A speculative claim hardening into an asserted fact | Not a conventional security issue, but this project's likeliest real harm, so gated like one |

## Headers

`site/public/_headers` sets these on Workers static assets; `site/test/unit/headers.test.ts` checks them.

| Header | Value, in short |
| --- | --- |
| `Content-Security-Policy` | `'self'` only, plus the two map tile hosts; no framing or plugins |
| `Strict-Transport-Security` | One year, with subdomains |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Robots-Tag` | `noindex` on the workers.dev host |

## Posture

| Control | Status |
| --- | --- |
| Branch protection | Org ruleset "Protect default branches": no deletion or force-push; every change by pull request |
| Required status checks | Ruleset "main: required checks" (`.github/rulesets/protect-main.json`): `ci / ci-ok` (`.github/workflows/ci.yml`) and `DCO` |
| `local/**` | `.gitignore`; the reviewer reads every diff path |
| Secret scanning | GitHub's, with blocking push protection; both on and free for a public repository |
| Code scanning | None; `ci.yml` runs `04_tools/` (standard library Python) and `site/` (static site) |
| Fork pull requests | Read-only token, no secrets; a new contributor's first run waits for maintainer approval |
| Dependabot security updates | Enabled |

<details>
<summary>Gate design: three properties</summary>

From the maintainer's house standard, Code-OS `rules/writing-and-gates.md` (not public), which wins. `04_tools/space_peak_rules.json` carries each applicable rule, so contributors need nothing else.

- **One definition, many call sites.** Every rule lives in that file. CI shells out to its `04_tools/` checker, and the contract test asserts no workflow reimplements one in YAML.
- **Block on the certain, warn on the likely.** The data file sets severity; heuristics warn.
- **Fail open on infrastructure.** A checker that cannot run exits 3, so a missing interpreter never looks like a content violation. CI fails anyway: runners always have `python3`.

</details>

## Dependencies

| What | Policy |
| --- | --- |
| Site npm packages | Pinned to exact versions in `site/package.json` and `package-lock.json`; CI installs them with `npm ci` |
| `04_tools/` | No third-party dependencies, deliberately: checks must run identically on a laptop and in CI, with nothing to install or go stale |
| GitHub Actions | SHA-pinned, not tagged, so a moved tag cannot change what runs. Git Crafter's `ci-standard.yml` conformance step checks its own pin |
| `.github/workflows/actions.lock` | Each action `pages.yml` runs, and those they call, at its commit. `gh actions-lock --verify` checks it; a pin change updates it in the same pull request |
| Dependabot | Proposes updates weekly, each at least 14 days old, all merged by hand |

## Secrets

No repository secrets are configured. `pages.yml` publishes the Quality and Process pages and the map. Cloudflare Workers Builds deploys the site through Cloudflare's own GitHub connection, so it needs none.
