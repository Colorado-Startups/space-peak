---
description: Commit, push, and open a pull request for the current work.
---

Sync the current work to GitHub.

1. `git status` and `git diff`. Summarize what changed before doing anything.
2. Confirm `git config core.hooksPath` is `.githooks`. If not, set it and say so. Without it there is no blocking enforcement on this repo.
3. Stage deliberately. Never `git add -A` without reading the list first: `.claude/skills/*` is gitignored except our own namespace, and `local/` must never be force-added.
4. Commit. Let the hooks run. If `pre-commit` blocks, fix the cause. `--no-verify` is denied to you by `.claude/settings.json`, deliberately: it is a human judgment call, so if it is genuinely needed, hand the command to Paul for his own terminal.
5. Push to a branch. **Never push to `main`.**
6. Open a PR with `gh pr create` and fill in the template, including the claims checklist, honestly.
7. Report the PR URL, then `gh pr checks`.

Seven checks are required on `main` (`.github/rulesets/protect-main.json`); `cloud-test` stays advisory. A green run means the gates passed, not that the change is right. Read the output.

Do not merge. Do not publish.
