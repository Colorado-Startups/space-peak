#!/usr/bin/env bash
# Space Peak: content guard. PostToolUse on Write and Edit. ADVISORY.
#
# Wired in .claude/settings.json under PostToolUse, matcher "Write|Edit".
# FIRES on every matching edit.
#
# Routes to both content checkers and prints whatever they say. One hook
# rather than three, because an earlier version of this repo wired a
# separate hook per check and they drifted: the voice hook and the claims
# hook duplicated the same path-filtering logic.
#
# Advisory by design. The only blocking Claude hook is
# space-peak-check-exclusions.sh. A guard that fires constantly gets
# ignored, and an ignored guard looks like coverage while providing none.
#
# Always exits 0, including on an infrastructure problem.

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
TOOLS="$PROJECT_DIR/04_tools"
REGISTER="$PROJECT_DIR/02_substance/claims_register.md"
PY="${SPACE_PEAK_PYTHON:-python3}"

command -v "$PY" >/dev/null 2>&1 || exit 0

target="$(cat | "$PY" -c '
import json, sys
try: d = json.load(sys.stdin)
except Exception: sys.exit(0)
print((d.get("tool_input") or {}).get("file_path", ""))
' 2>/dev/null || true)"

[ -z "$target" ] && exit 0
case "$target" in *.md) ;; *) exit 0 ;; esac
[ -f "$target" ] || exit 0

export PROJECT_DIR
"$PY" - "$target" <<'PYEOF' 2>/dev/null && exit 0
import sys, os
sys.path.insert(0, os.path.join(os.environ["PROJECT_DIR"], "04_tools"))
import space_peak_rules as R
rel = os.path.relpath(sys.argv[1], os.environ["PROJECT_DIR"]) \
      if sys.argv[1].startswith("/") else sys.argv[1]
sys.exit(0 if R.is_exempt(R.load_rules(), rel) else 1)
PYEOF

emit() {
  local label="$1"; shift
  local out rc=0
  out="$("$PY" "$@" 2>&1)" || rc=$?
  [ "$rc" = "3" ] && return 0   # could not verify, stay quiet
  if printf '%s' "$out" | grep -qE 'FAIL|WARN'; then
    { echo "space-peak-content-guard [$label] (advisory):"
      printf '%s\n' "$out" | grep -E 'FAIL|WARN' | head -12; } >&2
  fi
}

[ -r "$TOOLS/space_peak_lint.py" ] && emit voice "$TOOLS/space_peak_lint.py" "$target"
if [ -r "$TOOLS/space_peak_claims.py" ] && [ -r "$REGISTER" ]; then
  emit claims "$TOOLS/space_peak_claims.py" --register "$REGISTER" "$target"
fi
exit 0
