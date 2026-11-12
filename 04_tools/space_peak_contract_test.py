#!/usr/bin/env python3
"""space_peak_contract_test.py: assert the gates and the prose still agree.

Required by two house rules in Code-OS rules/writing-and-gates.md:

  "Rules belong in data, not in a regex. Put the terms, tokens and figures
   in one machine-readable file. Have a test assert that every human-facing
   surface still agrees with it."

  "Exempt lists are a smell. A hand-maintained list of files to skip will
   rot. If you need one, it needs its own contract test."

This is that test. It is not a unit test of the checkers; each checker has
its own --self-test for that. This asserts the things that go wrong between
files rather than inside one:

  C1  Every check either checker can emit is classified in severity.
  C2  blocking and warning are disjoint.
  C3  The checks the data file classifies all actually exist in a checker.
  C4  Every exempt entry carries a reason.
  C5  Every exempt glob still matches something in the repository.
  C6  No call site carries its own copy of the exempt list.
  C7  Every frozen site is still named by every required prose surface.
  C8  frozen_sites in the data file matches the `frozen` rows in the register.
  C9  Every hook named in .claude/settings.json exists and is executable.
  C10 Every hook file on disk is actually wired in .claude/settings.json.
  C11 No workflow reimplements a check inline instead of calling a script.
  C12 voice.md does not contradict the data file on hedge words.
  C13 is_exempt() honours every exempt glob C5 says is live.
  C14 README's blocks and warns lists name exactly the data file's grades.

C9 and C10 exist because of the house rule "a comment claiming a call site
that the settings file does not wire is a defect in its own right. Check
the settings file, not the header comment."

Usage:  python3 04_tools/space_peak_contract_test.py
Exit:   0 all contracts hold, 1 a contract is broken, 3 could not check.
"""

import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import space_peak_rules as R  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECKERS = ["04_tools/space_peak_lint.py", "04_tools/space_peak_claims.py"]

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))
    mark = "OK  " if ok else "FAIL"
    print(f"  {mark} {name}" + (f": {detail}" if detail and not ok else ""))
    return ok


def repo_file(rel):
    return os.path.join(REPO, rel)


def read(rel):
    with open(repo_file(rel), encoding="utf-8") as fh:
        return fh.read()


def tracked_paths():
    """Every path that exists in the repository: git-tracked plus on disk.

    The UNION matters. An earlier version returned `git ls-files` whenever
    it was non-empty and only fell back to a walk when it was empty. That
    is wrong in the exact state this repository was built in: after the
    first commit, six files were tracked and the whole tooling scaffold was
    still untracked, so C5 reported nine live exempt globs as stale and the
    commit adding them would have blocked itself.

    C5 asks "does this exempt glob still point at something real", which is
    a question about the filesystem, not about the index. A path that
    exists but is not yet committed is still real.
    """
    found = set()
    try:
        out = subprocess.run(["git", "-C", REPO, "ls-files"],
                             capture_output=True, text=True, timeout=20)
        if out.returncode == 0:
            found.update(p for p in out.stdout.splitlines() if p)
    except (OSError, subprocess.SubprocessError):
        pass
    for root, dirs, files in os.walk(REPO):
        dirs[:] = [d for d in dirs
                   if d not in (".git", "local", "__pycache__", ".venv")]
        for f in files:
            found.add(os.path.relpath(os.path.join(root, f), REPO))
    return sorted(found)


def emitted_checks():
    """Check names the checkers can actually emit.

    Read from the source rather than maintained by hand, so a new check
    cannot be added to a checker without this test noticing it is
    unclassified.
    """
    names = set()
    pat = re.compile(r'severity_of\(rules,\s*"([a-z-]+)"\)')
    for rel in CHECKERS:
        names.update(pat.findall(read(rel)))
    return names


def main():
    rules = R.load_rules()
    paths = tracked_paths()
    print("Space Peak contract test")
    print()

    # --- severity completeness -------------------------------------------
    print("severity")
    blocking = set(rules["severity"]["blocking"])
    warning = set(rules["severity"]["warning"])
    emitted = emitted_checks()

    check("C1 every emitted check is classified",
          emitted <= (blocking | warning),
          f"unclassified: {sorted(emitted - (blocking | warning))}")
    check("C2 blocking and warning are disjoint",
          not (blocking & warning),
          f"in both: {sorted(blocking & warning)}")
    # frozen-row-edit and secret/local-path/oversized-file are emitted by the
    # register integrity check and the shell checker, so allow those.
    shell_emitted = {"local-path", "oversized-file", "secret", "frozen-row-edit"}
    orphans = (blocking | warning) - emitted - shell_emitted
    check("C3 no classified check is orphaned", not orphans,
          f"classified but never emitted: {sorted(orphans)}")

    # --- exempt list ------------------------------------------------------
    print()
    print("exempt list")
    entries = rules["exempt_paths"]["entries"]
    check("C4 every exempt entry has a reason",
          all(e.get("reason") for e in entries),
          f"missing: {[e['glob'] for e in entries if not e.get('reason')]}")

    import fnmatch
    stale = []
    for e in entries:
        glob = e["glob"]
        hit = any(fnmatch.fnmatch(p, glob) or p == glob
                  or (glob.endswith("/*") and p.startswith(glob[:-1]))
                  for p in paths)
        if not hit:
            stale.append(glob)
    check("C5 every exempt glob still matches a real path", not stale,
          f"stale, would silently widen: {stale}")

    # No call site may carry its own exempt list. An earlier version of this
    # repo duplicated is_exempt() into two shell scripts, which is the drift
    # the house rule names.
    dupes = []
    for rel in paths:
        if not (rel.startswith(".githooks/") or rel.startswith(".github/scripts/")
                or rel.startswith(".claude/hooks/")):
            continue
        try:
            body = read(rel)
        except (OSError, UnicodeDecodeError):
            continue
        if "is_exempt()" in body and "space_peak_rules" not in body:
            dupes.append(rel)
    check("C6 no call site carries its own exempt list", not dupes,
          f"local copies found in: {dupes}")

    # C5 tests the globs with its OWN fnmatch. is_exempt() is what actually
    # runs in the hooks and CI. Those two agreeing is not automatic, and
    # when they diverged the result was silent: is_exempt used
    # path.lstrip("./"), which takes a SET OF CHARACTERS rather than a
    # prefix and therefore ate the leading dot of every dotfile path. Every
    # exemption whose glob began with a dot matched nothing, while C5 kept
    # reporting the list healthy. An exempt list that silently matches
    # nothing is the exact rot the house rule warns about, so the contract
    # is tested through the real function.
    dead = []
    for e in entries:
        glob = e["glob"]
        sample = next((p for p in paths
                       if fnmatch.fnmatch(p, glob) or p == glob
                       or (glob.endswith("/*") and p.startswith(glob[:-1]))),
                      None)
        if sample and not R.is_exempt(rules, sample):
            dead.append(f"{glob} (is_exempt said False for {sample})")
    check("C13 is_exempt() honours every exempt glob", not dead,
          f"globs the real function ignores: {dead}")

    # --- frozen sites -----------------------------------------------------
    print()
    print("frozen sites")
    labels = R.frozen_labels(rules)
    aliases = R.frozen_aliases(rules)
    missing = []
    for rel in rules["required_surface_agreement"]["files"]:
        if not os.path.exists(repo_file(rel)):
            missing.append(f"{rel} (absent)")
            continue
        body = read(rel).lower()
        for key, alias_list in aliases.items():
            if not any(a in body for a in alias_list):
                missing.append(f"{rel} does not name {labels[key]}")
    check("C7 every prose surface still names both exclusions", not missing,
          "; ".join(missing))

    reg_rel = "02_substance/claims_register.md"
    if os.path.exists(repo_file(reg_rel)):
        _reg, frozen_in_register, _unv = R.__dict__ and __import__(
            "space_peak_claims").parse_register(repo_file(reg_rel), rules)
        unsynced = [labels[k] for k, al in aliases.items()
                    if not any(a in frozen_in_register
                               or a.split()[0] in frozen_in_register for a in al)]
        check("C8 data file and register agree on what is frozen", not unsynced,
              f"frozen in data but not in register: {unsynced}")
    else:
        check("C8 data file and register agree on what is frozen", False,
              f"{reg_rel} is absent")

    # --- hook wiring ------------------------------------------------------
    print()
    print("hook wiring (settings file, not header comments)")
    settings_rel = ".claude/settings.json"
    if os.path.exists(repo_file(settings_rel)):
        settings = json.loads(read(settings_rel))
        wired = set(re.findall(r'\.claude/hooks/([A-Za-z0-9._-]+\.sh)',
                               json.dumps(settings)))
        on_disk = {os.path.basename(p) for p in paths
                   if p.startswith(".claude/hooks/") and p.endswith(".sh")}

        absent = [h for h in wired if not os.path.exists(
            repo_file(f".claude/hooks/{h}"))]
        check("C9 every wired hook exists", not absent, f"wired but absent: {absent}")

        not_exec = [h for h in wired
                    if os.path.exists(repo_file(f".claude/hooks/{h}"))
                    and not os.access(repo_file(f".claude/hooks/{h}"), os.X_OK)]
        check("C9b every wired hook is executable", not not_exec,
              f"not executable: {not_exec}")

        unwired = sorted(on_disk - wired)
        check("C10 every hook on disk is wired in settings", not unwired,
              f"present but never fires: {unwired}")
    else:
        check("C9 every wired hook exists", False, f"{settings_rel} is absent")
        check("C10 every hook on disk is wired in settings", False,
              f"{settings_rel} is absent")

    # --- CI must not reimplement checks -----------------------------------
    print()
    print("CI shape")
    inline = []
    for rel in paths:
        if not rel.startswith(".github/workflows/"):
            continue
        body = read(rel)
        # A workflow may call a script or run a checker. It may not grep for
        # a banned term itself, which is how a gate drifts between a laptop,
        # a web edit, and a cloud agent.
        if re.search(r"grep[^\n]*(—|em.dash|local/)", body):
            inline.append(rel)
    check("C11 no workflow reimplements a check inline", not inline,
          f"inline check logic in: {inline}")

    # --- voice.md agreement -----------------------------------------------
    print()
    print("prose agreement")
    voice_rel = "01_doctrine/voice.md"
    if os.path.exists(repo_file(voice_rel)):
        voice = read(voice_rel).lower()
        hedges = [h.lower() for h in R.terms(rules, "hedge_words")]
        allowed = [t.lower() for t in
                   rules["hedge_words"]["deliberately_absent"]["terms"]]

        # voice.md must not claim a term is permitted when the data file bans
        # it. Matched NARROWLY, because voice.md legitimately describes a
        # correction it already made: "an earlier draft un-flagged
        # 'potentially' ... the house file won". An un-narrowed match reads
        # that history as a live permission and fails the file for recording
        # that it was fixed. A guardrail that fires on prose about itself is
        # worse than none, because it trains you to disable it.
        CORRECTION_MARKERS = (
            "earlier draft", "no longer", "was corrected", "house file won",
            "house rules name", "is now banned", "now banned", "previously",
            "used to",
        )
        contradictions = []
        for h in hedges:
            for m in re.finditer(
                    r"[^.]*?(allow|permit|not a hedge|un-?flag)[^.]{0,80}"
                    + re.escape(h) + r"[^.]*\.", voice):
                sentence = m.group(0)
                if any(marker in sentence for marker in CORRECTION_MARKERS):
                    continue  # describing a correction, not granting a licence
                contradictions.append(h)
                break
        check("C12 voice.md does not permit a banned hedge", not contradictions,
              f"voice.md permits what the data file bans: {contradictions}")
        unexplained = [a for a in allowed if a not in voice]
        check("C12b voice.md explains each deliberate divergence",
              not unexplained, f"undocumented divergence: {unexplained}")
    else:
        check("C12 voice.md does not permit a banned hedge", False,
              f"{voice_rel} is absent")

    # README's "What blocks and what warns" lists every check by name and
    # grade. Nothing asserted it, so when spaced-en-dash sat in "warning"
    # here while voice.md filed it under Blocking, README agreed with the
    # JSON and nobody noticed either was wrong. Compared as exact sets, so a
    # check that moves grade, or is added, must be moved in README as well.
    readme_rel = "README.md"
    if os.path.exists(repo_file(readme_rel)):
        readme = read(readme_rel)
        drift = []
        for label, key in (("Blocks", "blocking"), ("Warns", "warning")):
            m = re.search(r"^\*\*" + label + r"\*\*[^\n]*$", readme, re.M)
            named = set(re.findall(r"`([a-z-]+)`", m.group(0))) if m else set()
            data = set(rules["severity"][key])
            if named != data:
                drift.append(f"**{label}** names {sorted(named)}, "
                             f"severity.{key} has {sorted(data)}")
        check("C14 README severity lists match the data file", not drift,
              "; ".join(drift))
    else:
        check("C14 README severity lists match the data file", False,
              f"{readme_rel} is absent")

    print()
    failed = [n for n, ok, _ in results if not ok]
    if failed:
        print(f"contract test: FAIL ({len(failed)} of {len(results)})")
        for n in failed:
            print(f"  broken: {n}")
        return R.EXIT_BLOCKED
    print(f"contract test: PASS ({len(results)} contracts)")
    return R.EXIT_OK


if __name__ == "__main__":
    sys.exit(R.run_guarded(lambda _argv=None: main()))
