@AGENTS.md

## Claude Code only

| Topic | Rule |
| --- | --- |
| Skills | `space-peak-fact-guardrails` verifies a claim. `space-peak-publish-gate` runs before anything goes live. The `space-peak-fact-reviewer` agent gives an independent read |
| Git | Cowork edits files; Claude Code owns git. The settings deny `--no-verify`, force-push, a push to `main` and a hard reset |
| Reviews | Load the `merging` skill before reviewing or merging a pull request. Never auto-merge and never `--admin` |
