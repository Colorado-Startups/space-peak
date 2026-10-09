---
name: space-peak-publish-gate
description: Run the full Space Peak pre-ship gate on a draft, which is MASTER_PLAN PT 3.3 as an executable checklist. Use when the user says "pre-ship check", "is this ready to publish", "run the publish gate", or before any draft goes for the UA 3.2 decision.
---

# space-peak-publish-gate

**Precedence.** `00_project_system/MASTER_PLAN.md` PT 3.3 is canonical for what this gate must cover. `~/.claude/rules/writing-and-gates.md` is canonical for how a gate behaves. If this skill disagrees, they win and this file gets corrected in the same session.

**This gate waits.** Nothing fires it automatically, by design: it is the deliberate stop before a human decision.

Produces a verdict and a report. It does not publish and does not decide.

## Inputs

1. The draft path. Usually `03_deliverables/DRAFT-thought-leadership.md`.

## The gate

Run all of these. Report each as pass, fail, or not applicable, with evidence. **Do not stop at the first failure**; a complete picture is the point.

### 1. Every checker's self-test, first

```bash
python3 04_tools/space_peak_lint.py --self-test
python3 04_tools/space_peak_claims.py --self-test
python3 04_tools/space_peak_files.py --self-test
python3 04_tools/space_peak_contract_test.py
```

All must pass before any result below means anything. A broken checker reports clean.

### 2. Mechanical checks on the draft

```bash
python3 04_tools/space_peak_lint.py <draft>
python3 04_tools/space_peak_claims.py --register 02_substance/claims_register.md <draft>
```

Zero blocking findings required. Warnings need a judgment call each, stated.

### 3. No new facts

Diff the draft against `02_substance/Space-Peak-Concept-Brief.md` claim by claim. **The draft may introduce zero factual claims the brief did not make.** This is the verification method MASTER_PLAN PT 3.1 names. List every claim in the draft and show where it came from.

### 4. Register completeness

Every claim in the draft has a register row, and no row is bare. Run `space-peak-fact-guardrails` if it has not already run for this draft.

### 5. The framing survives

The draft carries the brief's own framing: a speculative venture thesis, not an engineering proposal. Physics sound, engineering 2040s-hard, both together. Quote the lines doing that work, or report that nothing does.

### 6. The exclusions are intact and unargued

Blanca Peak and the Crestones appear as settled exclusions, stated not argued, with no adjacent note about how good the site would otherwise be.

### 7. The two things no lint catches

- A hedged source set as an exact number in display type.
- A status verb drifting under compression.

### 8. Visuals

The map and any SVG shipping with the piece carry the same labelling discipline as the prose. If the piece is text-only, say so and say it was deliberate.

### 9. Naming

**Resolved 2026-10-08.** The name is **Space Peak** everywhere, with no second name and no project-versus-venture split. Register row N-04 is `corrected`, issue #2 took Route 2, and `01_doctrine/voice.md` carries the decision under Terminology.

So this is now a consistency check rather than a blocker:

```bash
grep -n "Satellite Peak" <draft>
```

Zero hits expected, with one legitimate exception: naming the rejected alternative while explaining why Space won. The brief's own naming section does exactly that. `00_project_system/MASTER_PLAN.md` also still carries the old name, because it is a frozen planning record from 2026-07-14 and is left as written.

The gate fails if the draft uses "Satellite Peak" as the project's name, or argues for it. A draft cannot argue for a name the project does not use.

## Output

A line per check, then one of:

- **Ready for UA 3.2.** Hand to Paul for the publication decision.
- **Not ready.** What must change, in priority order.

Never publish. Never deploy. Never post. The gate ends at a recommendation.
