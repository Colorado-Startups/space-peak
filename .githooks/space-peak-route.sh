#!/usr/bin/env bash
# Space Peak shared hook router. Sourced by pre-commit and pre-push.
#
# THIS FILE ROUTES. IT DOES NOT DECIDE.
#
# Required by Code-OS rules/writing-and-gates.md: "The hook routes, it
# does not decide. A hook that carries the rules inside itself cannot be
# reused, cannot be tested, and turns every rule change into a shell edit."
# Every rule, term list, severity and exemption lives in
# 04_tools/space_peak_rules.json and is applied by the Python checkers.
# Nothing below knows what an em dash is or how big a file may be.
#
# Exit contract, from 04_tools/space_peak_rules.py:
#   0 clean   1 blocking finding   2 usage error   3 could NOT check
#
# Exit 3 is the important one. "Fail open on an infrastructure problem.
# Could not verify is not the same as verified and red." A missing
# python3, an unreadable file or a broken rules file warns and PASSES. An
# earlier version of this repo piped every checker through `|| failed=1`,
# so a missing interpreter looked exactly like a content violation.

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
TOOLS="$REPO_ROOT/04_tools"
REGISTER="$REPO_ROOT/02_substance/claims_register.md"

PY="${SPACE_PEAK_PYTHON:-python3}"

blocked=0
infra=0

# Run one checker. Translates the exit contract into blocked/infra counters
# and prints whatever the checker said. Knows nothing about the check.
run_checker() {
  local label="$1"; shift
  local out rc=0
  if ! command -v "$PY" >/dev/null 2>&1; then
    echo "  INFRA [$label]: $PY not found; skipping (fail open)" >&2
    infra=1
    return 0
  fi
  out="$("$PY" "$@" 2>&1)" || rc=$?
  case "$rc" in
    0) : ;;
    1) blocked=1
       echo >&2
       echo "  BLOCKED [$label]" >&2
       printf '%s\n' "$out" | grep -E 'FAIL' | head -30 >&2 ;;
    3) infra=1
       echo "  INFRA [$label]: could not verify, passing" >&2
       printf '%s\n' "$out" | grep -E '^INFRA' | head -5 >&2 ;;
    *) infra=1
       echo "  INFRA [$label]: checker exited $rc, passing" >&2
       printf '%s\n' "$out" | tail -5 >&2 ;;
  esac
  # Warnings are informational and never affect the counters.
  printf '%s\n' "$out" | grep -E 'WARN' | head -20 >&2 || true
  return 0
}

route_all() {
  local phase="$1" files="$2"
  [ -z "$files" ] && return 0

  # 1. Paths and sizes. Replaces the push ruleset Free cannot enforce.
  printf '%s\n' "$files" | run_checker "paths" "$TOOLS/space_peak_files.py" \
    --root "$REPO_ROOT" --stdin

  # 2. Secrets. gitleaks is optional; its absence is an infrastructure
  # condition, not a clean result, so say so rather than passing silently.
  if command -v gitleaks >/dev/null 2>&1; then
    local gl_out gl_rc=0
    if [ "$phase" = "pre-commit" ]; then
      gl_out="$(gitleaks git --staged --no-banner --redact=100 \
                --config "$REPO_ROOT/.gitleaks.toml" "$REPO_ROOT" 2>&1)" || gl_rc=$?
    else
      gl_out="$(gitleaks dir --no-banner --redact=100 \
                --config "$REPO_ROOT/.gitleaks.toml" "$REPO_ROOT" 2>&1)" || gl_rc=$?
    fi
    if [ "$gl_rc" -ne 0 ]; then
      blocked=1
      echo >&2; echo "  BLOCKED [secret]" >&2
      printf '%s\n' "$gl_out" | tail -25 >&2
    fi
  else
    infra=1
    echo "  INFRA [secret]: gitleaks not installed; secret scan skipped." >&2
    echo "                  brew install gitleaks. CI still scans." >&2
  fi

  # 3. Content checks on markdown. The checkers apply the exempt list from
  # the rules file themselves, so no filtering happens here.
  local md=()
  while IFS= read -r f; do
    case "$f" in *.md) ;; *) continue ;; esac
    [ -f "$REPO_ROOT/$f" ] || continue
    "$PY" - "$f" <<'PYEOF' 2>/dev/null || continue
import sys, os
sys.path.insert(0, os.path.join(os.environ["REPO_ROOT"], "04_tools"))
import space_peak_rules as R
sys.exit(0 if not R.is_exempt(R.load_rules(), sys.argv[1]) else 1)
PYEOF
    md+=("$REPO_ROOT/$f")
  done <<< "$files"

  if [ "${#md[@]}" -gt 0 ]; then
    run_checker "voice" "$TOOLS/space_peak_lint.py" "${md[@]}"
    if [ -r "$REGISTER" ]; then
      run_checker "claims" "$TOOLS/space_peak_claims.py" \
        --register "$REGISTER" "${md[@]}"
    else
      infra=1
      echo "  INFRA [claims]: register not found; skipping" >&2
    fi
  fi

  # 4. The contract test. Asserts the gates and the prose still agree.
  run_checker "contract" "$TOOLS/space_peak_contract_test.py"

  if [ "$blocked" -ne 0 ]; then
    echo >&2
    if [ "$phase" = "pre-commit" ]; then
      echo "Nothing was committed. Fix the blocking findings above." >&2
      echo "pre-push runs the same checks, so --no-verify only defers them." >&2
    else
      echo "Nothing was pushed. Fix the blocking findings and commit the fix." >&2
      echo "The required CI checks would block the same findings at merge;" >&2
      echo "fixing them now saves the round trip." >&2
    fi
    return 1
  fi
  if [ "$infra" -ne 0 ]; then
    echo >&2
    echo "Some checks could not run (see INFRA above). Proceeding, because" >&2
    echo "could not verify is not the same as verified and red." >&2
  fi
  return 0
}
