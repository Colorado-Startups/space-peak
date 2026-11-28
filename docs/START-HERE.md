# Start here

| You want to | Go to |
| --- | --- |
| Run the site locally | [3. Set up](#3-set-up-5-min) |
| Add an organisation | [6. Add an organisation](#6-add-an-organisation) |
| Know where checks run | [7. Where checks run](#7-where-checks-run) |
| Fix a mountain claim | `02_substance/claims_register.md` |

```mermaid
flowchart LR
  A["1. What this is"] --> B["2. One habit"] --> C["3. Set up"] --> D["4. See the checks work"]
  D --> E["5. Where the work is"] --> F["6. Add an organisation"] --> G["7. Where checks run"] --> H["8. Make your first contribution"]
```

## 1. What this is (5 min)

Read `README.md`, then `02_substance/Space-Peak-Concept-Brief.md` as far as "The core insight". You do not need the whole brief yet.

The sentence that matters: a speculative venture thesis, not an engineering proposal. Physics sound, engineering 2040s-hard, every mountain fact unverified.

## 2. One habit (2 min)

Put each checkable claim about a peak in `02_substance/claims_register.md`, with its status.

## 3. Set up (5 min)

Fork the repository on GitHub and clone your fork. You need Node 26 or later (`.nvmrc`) and `python3`.

```bash
npm ci
npm run dev
```

| Command | Does |
| --- | --- |
| `npm run dev` | Serves the site at `http://localhost:3320/`; it exits if the port is taken |
| `npm run build` | Writes the static site to `site/dist` |
| `npm run check` | Runs `astro check` |

The latest run on `main` should be green on the [Actions page](https://github.com/Colorado-Startups/space-peak/actions/workflows/ci.yml). If it is not, a clean result means nothing: open a Tooling issue.

## 4. See the checks work (3 min)

Worth doing once, so you know what they feel like before they surprise you mid-draft.

A warning, because the check is a heuristic:

```bash
printf 'Mount Democrat reaches 14,148 ft with a clean eastern lane.\n' > /tmp/try.md
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md /tmp/try.md
```

And one that passes:

```bash
printf 'Greenhorn Mountain is listed at approximately 12,300 ft, unverified.\n' > /tmp/try.md
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md /tmp/try.md
```

## 5. Where the work is (3 min)

`00_project_system/MASTER_PLAN.md`, Phase 3.

Phase 1's decision is made: publish, standalone, under the Space Peak name. Phases 2 and 4 are struck.

## 6. Add an organisation

| Way | How |
| --- | --- |
| No code | The **Add your organisation** issue form; a maintainer writes the file |
| Pull request | One YAML file in `data/orgs/`, named for its `id` |
| Its rules | `site/src/lib/orgs/schema.ts`, then the checks in `site/src/lib/orgs/check.ts`; examples in `site/test/fixtures/orgs/valid/` |

## 7. Where checks run

| Check | Where |
| --- | --- |
| One checker, one test file, the dev server | Your machine, briefly |
| Claims, voice, self-tests, contract test, the Quality collector tests | CI, when a file they read changes (`paths:` in `ci.yml`) |
| `astro check`, build, vitest, Playwright and axe, the MCP conformance suite | CI, when `site/`, `data/`, `package.json`, the lockfile, `.nvmrc` or `wrangler.jsonc` changes |

## 8. Make your first contribution

Pick an issue labelled `good first issue`, or bring a source for any `unverified` row in the claims register. `CONTRIBUTING.md` covers the pull request, the sign-off and what the checks do.
