@AGENTS.md

## Claude Code only

| Topic | Rule |
| --- | --- |
| Skills | `space-peak-fact-guardrails` verifies a claim. `space-peak-publish-gate` runs before a change to public copy merges, since every merge goes live. The `space-peak-fact-reviewer` agent gives an independent read |
| Git | Cowork edits files; Claude Code owns git. The settings deny `--no-verify`, force-push, a push to `main`, a hard reset and reading key files |
| Reviews | Load the `merging` skill before reviewing or merging a pull request. Never auto-merge and never `--admin` |
