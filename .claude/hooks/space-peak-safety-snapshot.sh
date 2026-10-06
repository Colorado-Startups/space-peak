#!/usr/bin/env bash
# Space Peak: session-end safety snapshot.
#
# Wired in .claude/settings.json under SessionEnd. FIRES at session end.
#
# Records uncommitted work so a crash, a bad reset, or a forgotten branch
# does not lose a draft. Writes into local/, which is gitignored and
# blocked from commits by the path guard. Silent on success.
#
# This exists because a previous session built a full scaffold into the
# session scratchpad, which is cleaned automatically, and lost all of it.
# Durable work belongs in the repository or in local/, never in /tmp.

set -uo pipefail
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

changes="$(git status --porcelain 2>/dev/null)"
[ -z "$changes" ] && exit 0

SNAP_DIR="$PROJECT_DIR/local/snapshots"
mkdir -p "$SNAP_DIR" 2>/dev/null || exit 0
stamp="$(date +%Y-%m-%d_%H%M%S)"
{
  echo "# Space Peak session snapshot $stamp"
  echo "branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  echo "head:   $(git rev-parse --short HEAD 2>/dev/null)"
  echo
  echo "## status"; printf '%s\n' "$changes"
  echo; echo "## diff"; git diff 2>/dev/null; git diff --cached 2>/dev/null
} > "$SNAP_DIR/$stamp.txt" 2>/dev/null

ls -1t "$SNAP_DIR"/*.txt 2>/dev/null | tail -n +21 | xargs rm -f 2>/dev/null
exit 0
