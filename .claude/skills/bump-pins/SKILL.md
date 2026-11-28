---
name: bump-pins
description: Moves the Git Crafter engine pin and the Claudius pack pin to their newest release tags that are at least 14 days old, in one pull request. Use when either repo publishes a new release.
compatibility: Requires gh signed in and git.
---

# Bump pins

From Claudius `templates/claude/.claude/skills/bump-pins/SKILL.md` at `ed58761`, which wins. One change: step 1 takes the newest release at least 14 days old, the age Git Crafter's `tools.actions_latest_share` and this repo's Dependabot cooldown wait for.

Dependabot bumps action pins (`uses: ...@<sha> # vX`). It never reads `quality/config.json`, so the pack pin moves here.

| Step | Do |
|---|---|
| 1 | The newest release at least 14 days old: `gh release list -R SoulCraft-Org/git-crafter --json tagName,publishedAt,isPrerelease` and the same for `Colorado-Startups/claudius` |
| 2 | Each tag's commit: `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>^{}` (no `^{}` line: use the plain tag line) |
| 3 | Replace the engine SHA and its `# vX` comment in every workflow that names it. `ci.yml` and `pages.yml` pin one SHA. Update `.github/workflows/actions.lock` to match |
| 4 | Replace `Colorado-Startups/claudius@<sha>` in `quality/config.json` `packs` |
| 5 | Read the release notes between the old and new tags for a renamed or removed tab id. A removed id stops the build (exit 2) and names its new tab |
| 6 | Open one pull request. Its pages run is the check: no exit 2, no new "not measured" row |

Never pin a branch name, a short SHA or an untagged commit.
