#!/usr/bin/env bash
# Space Peak: permanent-exclusion guard. PreToolUse on Write and Edit.
#
# THE ONLY HARD-BLOCKING CLAUDE HOOK IN THIS REPOSITORY.
#
# Wired in .claude/settings.json under PreToolUse, matcher "Write|Edit".
# FIRES on every matching edit. It does not wait for a slash command.
# (Check the settings file, not this comment, if they ever disagree: the
# contract test C9/C10 asserts they do not.)
#
# This file ROUTES. The two excluded sites, the proposal cues and the
# negation cues all live in 04_tools/space_peak_rules.json and are applied
# by 04_tools/space_peak_claims.py. Nothing here knows a site name.
#
# Why block when every other content check warns: the two exclusions are
# literal string matches against a closed two-item list, and the
# consequence is not a style question. Blanca Peak is sacred to the Navajo.
# The Crestones and Great Sand Dunes are a National Park. Neither is an
# engineering judgement, so neither is revisable by better engineering.
#
# It blocks the WRITE, not the discussion. Naming either site, or
# explaining why it is excluded, passes. Proposing one as viable does not.
#
# Exit 2 with stderr tells Claude Code to block the call and show why.
# Exit 0 on any infrastructure problem: could not verify is not a violation.

set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CLAIMS="$PROJECT_DIR/04_tools/space_peak_claims.py"
REGISTER="$PROJECT_DIR/02_substance/claims_register.md"
PY="${SPACE_PEAK_PYTHON:-python3}"

payload="$(cat)"

command -v "$PY" >/dev/null 2>&1 || exit 0
[ -r "$CLAIMS" ] && [ -r "$REGISTER" ] || exit 0

parsed="$(printf '%s' "$payload" | "$PY" -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
ti = d.get("tool_input") or {}
print(ti.get("file_path", ""))
print(" ".join(str(ti.get(k, "")) for k in ("content", "new_string")).replace("\n", " "))
' 2>/dev/null || true)"

target_path="$(printf '%s' "$parsed" | sed -n '1p')"
body="$(printf '%s' "$parsed" | sed -n '2p')"
[ -z "$body" ] && exit 0

# The exempt list lives in the rules file, read here rather than copied.
if [ -n "$target_path" ]; then
  "$PY" - "$target_path" <<'PYEOF' 2>/dev/null && exit 0
import sys, os
sys.path.insert(0, os.path.join(os.environ["PROJECT_DIR"], "04_tools"))
import space_peak_rules as R
rel = os.path.relpath(sys.argv[1], os.environ["PROJECT_DIR"]) \
      if sys.argv[1].startswith("/") else sys.argv[1]
sys.exit(0 if R.is_exempt(R.load_rules(), rel) else 1)
PYEOF
fi

tmp="$(mktemp -t spx)"
printf '%s\n' "$body" > "$tmp"
out="$("$PY" "$CLAIMS" --register "$REGISTER" "$tmp" 2>&1)" || true
rm -f "$tmp"

if printf '%s' "$out" | grep -q 'exclusion-proposed'; then
  {
    echo "BLOCKED by space-peak-check-exclusions."
    echo
    printf '%s\n' "$out" | grep 'exclusion-proposed' | sed 's/^[^:]*:[0-9]*: //'
    echo
    echo "These are not engineering judgements and do not change because the"
    echo "engineering case improves. Naming either site, or explaining the"
    echo "exclusion, is fine. Proposing one as a viable site is not."
    echo "See 02_substance/claims_register.md."
  } >&2
  exit 2
fi
exit 0
