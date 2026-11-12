@AGENTS.md

## Claude Code only

| Topic | Rule |
| --- | --- |
| The one hook | `.claude/settings.json` wires `space-peak-check-exclusions.sh` on every Write and Edit. It blocks a write that proposes an excluded site. The settings file is the authority on the wiring |
| Skills | `space-peak-fact-guardrails` verifies a claim. `space-peak-publish-gate` runs before a draft goes to UA 3.2. The `space-peak-fact-reviewer` agent gives an independent read |
| Git | Cowork edits files; Claude Code owns git. The settings deny `--no-verify`, force-push, a push to `main` and a hard reset |
| Reviews | Load the `merging` skill before reviewing or merging a pull request. Never auto-merge and never `--admin` |
