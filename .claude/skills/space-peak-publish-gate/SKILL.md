---
name: space-peak-publish-gate
description: Run the full Space Peak pre-ship gate on a draft, which is MASTER_PLAN PT 3.3 as an executable checklist. Use when the user says "pre-ship check", "is this ready to publish", "run the publish gate", or before anything goes live on spacepeak.co.
---

# space-peak-publish-gate

**Precedence.** `00_project_system/MASTER_PLAN_PHASE_3.md` PT 3.3 wins on what this gate must cover. Code-OS `rules/writing-and-gates.md` wins on gate behaviour. Where this skill disagrees, it is corrected in the same session.

**This gate waits.** Nothing fires it automatically, by design: it is the deliberate stop before a human decision. It reports and recommends. It does not publish or decide.

Input: the draft or page path. Site pages live under `site/src/`.

Run and report every check as pass, fail or not applicable, with evidence. **Do not stop at the first failure**; a complete picture is the point.

## 1. Self-tests first

```bash
python3 04_tools/space_peak_lint.py --self-test
python3 04_tools/space_peak_claims.py --self-test
python3 04_tools/space_peak_contract_test.py
```

All must pass before any result below means anything. A broken checker reports clean.

## 2. Mechanical checks

```bash
python3 04_tools/space_peak_lint.py <draft>
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md <draft>
```

Zero blocking findings required. State your call on each warning.

## 3. Every claim has a home

List where each claim came from: the concept brief, or a sourced register row. A new claim is fine once it has its row.

## 4. Register completeness

Every claim has a register row, and no row is bare. Run `space-peak-fact-guardrails` if it has not run for this draft.

## 5. Voice, as meaning

Read `01_doctrine/voice.md`, then walk the draft. One idea per sentence, judged by meaning: the 30-word warning is only a proxy. Then read as a specialist in mass drivers, Colorado land status or FAA regulation. Report each line that would embarrass us.

## 6. The framing survives

The draft carries the brief's framing: a speculative venture thesis, not an engineering proposal. Physics sound, engineering 2040s-hard, both together. Quote the lines doing that work, or report that none do.

## 7. What no lint catches

A hedged source set as an exact number in display type. A status verb drifting under compression.

## 8. Visuals

The map and any SVG shipping with the piece follow the register's labelling rule (`02_substance/claims_register.md`, Labelling an unconfirmed figure), as the prose does. If text-only, say so, and that it was deliberate.

## 9. Naming

**Resolved 2026-10-08.** The name is **Space Peak** everywhere: no second name, no project-versus-venture split. Register row N-04 is `corrected`, issue #2 took Route 2, and `01_doctrine/voice-terminology.md` carries the decision. Now a consistency check, not a blocker:

```bash
grep -n "Satellite Peak" <draft>
```

| Case | Result |
|---|---|
| Zero hits | Expected |
| Naming the rejected alternative while explaining why Space won | The one legitimate exception; the brief's own naming section does it |
| `00_project_system/MASTER_PLAN.md` | Still carries the old name: a frozen planning record from 2026-07-14, left as written |
| Using "Satellite Peak" as the project's name, or arguing for it | Fail. A draft cannot argue for a name the project does not use |

## 10. An independent read

Have the `space-peak-fact-reviewer` agent, which did not write the draft, read every claim. Fold its findings into the report.

## Output

A line per check, then the verdict: **Ready** (hand to Paul for the go-live) or **Not ready** (what must change, in priority order).
