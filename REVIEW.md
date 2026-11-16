# Review instructions

For Claude Code's Code Review service only. It needs a Team or Enterprise plan and bills per review. Local `/code-review` reads `CLAUDE.md`, not this file (code.claude.com/docs/en/code-review-customize, read 2026-11-13). Adapted from Claudius `templates/claude/REVIEW.md` at `7c1453ae`.

A review finding is input to the `merging` skill. Only the orchestrator merges, with that skill's verdict.

## What Important means here

| Important | Why |
|---|---|
| A claim about a peak that is missing from `02_substance/claims_register.md`, or stated more firmly than its status there | The register wins on claims (`AGENTS.md` Precedence) |
| Speculation written as fact | The site is a speculative venture thesis |
| A change that breaks a checker, leaks a key or a private name, or widens what an agent may do without saying so | Gates and secrets |

Style and naming are Nit at most. Prose style follows `01_doctrine/voice.md`.

## Cap the nits

Report at most three Nits per review.

## Do not report

| Skip | CI already runs it |
|---|---|
| Em dashes and voice lint findings | `04_tools/space_peak_lint.py` |
| Claim labels | `04_tools/space_peak_claims.py` |
| Rule and prose drift, pins, required deny rules | `04_tools/space_peak_contract_test.py` |
| The map against the website's regions | `04_tools/space_peak_map.py --check` |
| Sign-off lines | DCO |

## Always check

| Check | Where |
|---|---|
| No key value, home path or email in the diff | every file |
| Every new figure names its source in its sentence, or is labeled a goal | prose |
| Every `uses:` pins a full 40-hex SHA with a version comment | `.github/workflows/` |
| No workflow checks out a pull request's head under `pull_request_target` | `.github/workflows/` |
| `permissions.allow` gains no rule without a stated reason | `.claude/settings.json` |
