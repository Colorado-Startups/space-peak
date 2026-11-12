---
name: space-peak-voice-check
description: Run the Space Peak voice check on a named file. Mechanical pass via 04_tools/space_peak_lint.py, then the judgment checklist from 01_doctrine/voice.md. Use when the user says "voice check this", "lint this draft", "run space-peak-voice-check on X", or wants a draft checked against the Space Peak voice before it ships.
---

# space-peak-voice-check

**Precedence.** Rules source, in order: Code-OS `rules/writing-and-gates.md` (canonical, wins), then `04_tools/space_peak_rules.json`, then `01_doctrine/voice.md`. If this skill disagrees with any of them, they win and **this file gets corrected in the same session**. Do not work around a disagreement; fix it.

**This gate waits.** It runs when someone invokes it. The gate that fires on every edit is `.claude/hooks/space-peak-content-guard.sh`, which runs the same script automatically and advisory. This skill adds the judgment pass that no hook can do.

Two passes over one named file. The script catches what a machine can catch. The judgment pass catches what it cannot.

## When to use

- A draft, memo, or doc needs a voice pass before it ships or a PR opens.
- MASTER_PLAN PT 3.3, the pre-ship gate, is being run.

Do not use for: code, data files, or third-party text quoted as evidence.

## Inputs

1. The target file path. Ask if not given; do not guess, and do not default to the whole repository.

## Pass 1: mechanical

First confirm the checker works. A broken checker reports a clean file, which is worse than no checker because it looks like success:

```bash
python3 04_tools/space_peak_lint.py --self-test
```

It must print `PASS`. Then:

```bash
python3 04_tools/space_peak_lint.py <target file>
```

Report every finding with its line number. Exit 0 is clean, 1 means a blocking finding, **3 means the check could not run** and is not a pass. Say which you got.

Only `em-dash` blocks. Everything else warns, because the rest are heuristics.

## Pass 2: judgment

The script cannot see these. Walk them one at a time, with line numbers.

1. **One idea per sentence, as meaning.** The 30-word warning is a proxy. A 34-word sentence carrying one idea passes. A 22-word sentence carrying three fails, and the script said nothing.
2. **Is speculation labelled beside the claim,** or is the reader expected to infer it from the document's overall tone?
3. **Do the physics and the timeline ship together?** "Physics is sound" without "engineering is 2040s-hard" is marketing.
4. **Are the two permanent exclusions stated rather than argued?** Look for the construction pairing an exclusion with a note about how good the site would otherwise be. That invites the reader to weigh them against each other. They do not weigh against each other.
5. **A hedged source set as an exact number in display type.** "About 200 g" becoming "200 g" in a pull quote. No lint catches this.
6. **A status verb drifting under compression.** "The brief proposes" becoming "the plan is". No lint catches this either.
7. **Would a specialist be embarrassed for us?** Read as someone who knows more about mass drivers, Colorado land status, or FAA regulation than we do.

## Handoffs

- Factual claims and the register: `space-peak-fact-guardrails`. Do not duplicate it here.
- The full pre-ship gate: `space-peak-publish-gate`, which calls both.
- Paths, sizes, secrets: the git hooks. Not this skill's business.

## Output

Mechanical findings, then judgment findings, then one verdict line. **Propose, do not apply:** show the location, what is wrong, and a suggested replacement. The writer decides. Do not edit the file unless asked.
