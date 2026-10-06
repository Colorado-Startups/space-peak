## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Claims checklist

This repository's core discipline is that every fact about a specific
mountain is unverified until diligenced. Tick each line or say why it does
not apply.

- [ ] Every new mountain-specific claim has a row in `02_substance/claims_register.md`
- [ ] Every claim marked `unverified` is labelled as such in the prose, or cited
- [ ] No figure appears bare (no attribution, no source, no speculative label)
- [ ] Neither permanent exclusion was weakened: **Blanca Peak** (sacred to the Navajo) and **the Crestones / Great Sand Dunes** (National Park)
- [ ] No em dashes anywhere

## Two things no lint catches

- [ ] No hedged source was set as an exact number in display type
- [ ] No status verb drifted under compression (for example "the brief proposes" becoming "the plan is")

## Checks

CI here is **advisory, not blocking**. Colorado-Startups is on GitHub Free,
which does not enforce rulesets or required status checks on private
repositories, so a red check will not stop a merge. Read them anyway; they
are the only automated gate there is.

- [ ] `selftests`, `guardrails`, `fact-guardrails`, `voice-check`, `secret-scan` and `docs-lint` are green, or each red one is explained below

<!-- If a check is red and you are merging anyway, say why. -->

## Publication

- [ ] This PR does **not** publish anything externally. Publication is a
      separate human action under MASTER_PLAN.md UA 3.2.
