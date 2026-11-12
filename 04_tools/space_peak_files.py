#!/usr/bin/env python3
"""space_peak_files.py: the path and size guardrail.

Rules source: 04_tools/space_peak_rules.json. If this script and that file
disagree, the file wins.

This is the replacement for a GitHub push ruleset. Push rulesets (restrict
file paths, restrict file size) do not apply to public repositories, so the
two rules that would live server-side have no server-side home:

  local-path       nothing under local/ may be committed
  oversized-file   nothing over the configured limit may be committed

It exists as a script rather than inline shell for the house rule "the hook
routes, it does not decide. A hook that carries the rules inside itself
cannot be reused, cannot be tested, and turns every rule change into a
shell edit." The git hooks, the Claude Code hooks, and CI all shell out
here.

Both checks are deterministic, so both block. Compare the claims checks,
which are heuristics and only warn.

Usage:
  python3 space_peak_files.py PATH [PATH ...]
  python3 space_peak_files.py --self-test

Exit codes: 0 clean, 1 a blocking finding, 2 usage, 3 could not check.
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import space_peak_rules as R  # noqa: E402


def check_paths(paths, rules, root="."):
    """Return findings as (path, severity, check, message)."""
    findings = []
    max_bytes = int(rules["limits"]["max_file_size_mb"]) * 1024 * 1024

    for rel in paths:
        rel = rel.strip()
        if not rel:
            continue
        norm = rel.lstrip("./")

        if norm == "local" or norm.startswith("local/"):
            findings.append((rel, R.severity_of(rules, "local-path"),
                             "local-path",
                             "local/ is operational and never leaves this "
                             "machine; it is gitignored and must not be "
                             "force-added"))

        full = os.path.join(root, rel)
        if os.path.isfile(full):
            try:
                size = os.path.getsize(full)
            except OSError as exc:
                # Cannot stat is an infrastructure problem, not a violation.
                raise R.InfraError(f"cannot stat {rel}: {exc}")
            if size > max_bytes:
                mb = rules["limits"]["max_file_size_mb"]
                findings.append((rel, R.severity_of(rules, "oversized-file"),
                                 "oversized-file",
                                 f"file is {size} bytes, over the {mb} MB limit"))
    return findings


def report(findings):
    if not findings:
        print("space_peak_files: clean")
        return
    for path, severity, check, message in findings:
        print(f"{path}: {severity} [{check}] {message}")
    fails = sum(1 for f in findings if f[1] == "FAIL")
    print(f"space_peak_files: {fails} FAIL, {len(findings) - fails} WARN")


def self_test():
    """Seed a known-bad and known-clean sample."""
    rules = R.load_rules()
    ok = True

    bad = check_paths(["local/notes.md", "README.md"], rules, root="/nonexistent")
    hit = {f[2] for f in bad}
    if "local-path" in hit:
        print("self-test: seeded local-path flagged: OK")
    else:
        print("self-test: seeded local-path NOT flagged: FAIL"); ok = False
    if R.severity_of(rules, "local-path") != "FAIL":
        print("self-test: local-path must block (deterministic): FAIL"); ok = False
    else:
        print("self-test: local-path blocks: OK")

    # A nested local/ path must also be caught, not just the top level.
    nested = check_paths(["local/snapshots/2026.txt"], rules, root="/nonexistent")
    if any(f[2] == "local-path" for f in nested):
        print("self-test: nested local/ path flagged: OK")
    else:
        print("self-test: nested local/ path NOT flagged: FAIL"); ok = False

    # A path merely CONTAINING the word local must not be caught.
    false_pos = check_paths(["docs/localization.md", "my-local-notes.md"],
                            rules, root="/nonexistent")
    if not false_pos:
        print("self-test: 'localization.md' not misflagged: OK")
    else:
        print(f"self-test: false positive on {[f[0] for f in false_pos]}: FAIL")
        ok = False

    clean = check_paths(["README.md", "04_tools/space_peak_lint.py"], rules,
                        root="/nonexistent")
    if not clean:
        print("self-test: clean sample passes: OK")
    else:
        print("self-test: clean sample raised a finding: FAIL"); ok = False

    print("self-test:", "PASS" if ok else "FAIL")
    return R.EXIT_OK if ok else R.EXIT_BLOCKED


def _main(argv=None):
    parser = argparse.ArgumentParser(description="Space Peak path and size guardrail")
    parser.add_argument("paths", nargs="*")
    parser.add_argument("--root", default=".", help="repository root for size checks")
    parser.add_argument("--rules", default=None)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--stdin", action="store_true",
                        help="read newline-separated paths from stdin")
    args = parser.parse_args(argv)

    if args.self_test:
        return self_test()

    paths = list(args.paths)
    if args.stdin:
        paths.extend(line for line in sys.stdin.read().splitlines() if line.strip())
    if not paths:
        print("space_peak_files: no paths given, nothing to check")
        return R.EXIT_OK

    rules = R.load_rules(args.rules)
    findings = check_paths(paths, rules, root=args.root)
    report(findings)
    return (R.EXIT_BLOCKED if any(f[1] == "FAIL" for f in findings)
            else R.EXIT_OK)


if __name__ == "__main__":
    sys.exit(R.run_guarded(_main))
