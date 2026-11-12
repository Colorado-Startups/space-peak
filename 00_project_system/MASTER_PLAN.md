# MASTER_PLAN.md - Space Peak (Satellite Peak)

Planning architect document for the CodeCraft orchestration system. Written 2026-07-14. Plan only; nothing here authorizes building anything. Per the fleet brief, Space Peak is the lowest priority project in the fleet and is not a hero target, so this is deliberately the shortest master plan in the system: one decision, then branches.

## Terms

This plan predates the repository and uses the vocabulary of the owner's planning system:

- **Astraeon:** the project owner. Only the owner takes a UA step.
- **PT:** a Cowork project task. **DS:** a Claude Code desktop session. **UA:** a user action, taken by the owner.
- **pt_protocol.md, the fleet brief, CodeCraft:** the owner's private planning documents and orchestration system. They are not in this repository. Every rule from them that applies here is restated in this file.
- **Satellite Peak:** the project's earlier name.

## Mission

Satellite Peak is a speculative venture thesis, not an engineering proposal: the choke point of the space economy is cost-to-orbit, and a ground-based electromagnetic mass driver bored through a Colorado granite peak would turn launch from an expensive per-vehicle event into a cheap continuous utility, sited at the foot of a Colorado Springs aerospace corridor that already builds, flies, and defends the things it would launch. The brief itself states the physics is sound, the engineering is 2040s-hard, and every mountain-specific claim (site elevations, land status, firing lanes, ownership, the candidate ranking of Greenhorn over Culebra over the Spanish Peaks) is a starting point for real diligence, not a verified site assessment. This plan inherits that framing: any step below that touches a mountain fact treats it as unverified until diligenced.

## Current state

Idea-stage. Five files, nothing else:

1. Satellite-Peak-Concept-Brief.md (draft v1, July 2026)
2. 01-Aerospace-Alley-map.svg
3. 02-Springs-corridor-vs-Silicon-Valley.svg
4. 03-Mass-driver-cross-section.svg
5. Satellite-Peak-site-map.html

No git, no code, no external commitments. Per pt_protocol.md, work units below are PT (Cowork Project Task), DS (Claude Code Desktop Session), and UA (User Action by Astraeon). The fleet brief marks this project "not a hero target," so no DS steps are planned in any branch; if a future branch ever needs one, that is a plan revision requiring UA approval.

## Phase 1: The decision

**Goal:** Astraeon chooses exactly one disposition for Satellite Peak.

**Exit criteria:** One of the three options below is recorded in this file under a dated "Decision" heading, and exactly one of Phases 2, 3, or 4 becomes active. The other two are struck.

### UA 1.1 - Disposition decision

- **Objective:** Astraeon picks one: (a) **Park** the project as-is, (b) **Publish** the brief as thought leadership, possibly under the Photon Mountain umbrella, or (c) **Develop** the thesis with real pre-diligence.
- **Acceptance checks:** A single unambiguous choice is stated; if (b), Astraeon also states whether it ships under Photon Mountain or standalone; the choice is appended to this file with the decision date.
- **Verification method:** The orchestrator reads the appended Decision entry back to Astraeon in the next session and confirms it matches intent before activating a branch.

## Phase 2: Park (conditional, only if UA 1.1 = Park)

**Goal:** Close the project cleanly so it costs zero attention until deliberately reopened.

**Exit criteria:** A parking note exists in this folder, the orchestrator's records mark Space Peak parked per the PT End steps in pt_protocol.md, and no open items remain.

### PT 2.1 - Park the project

- **Objective:** Write PARKED.md in this folder stating the parking date (absolute), the reason, and the single condition that would reopen it (per the fleet brief: it becomes a content play). Complete PT End bookkeeping per pt_protocol.md.
- **Acceptance checks:** PARKED.md exists with date, reason, reopen condition; no em dashes; no new claims about any mountain; folder otherwise untouched.
- **Verification method:** PT Review gate per pt_protocol.md: read PARKED.md against the checks one by one; confirm the five original files are unmodified.

## Phase 3: Publish as thought leadership (conditional, only if UA 1.1 = Publish)

**Goal:** Ship the idea as a written piece, with every mountain-specific fact either verified or explicitly labeled speculative, without implying a real venture exists.

**Exit criteria:** A final draft approved by Astraeon exists in this folder, has passed fact and voice review, and Astraeon has published it or explicitly declined to.

### PT 3.1 - Adapt the brief into a publishable draft

- **Objective:** Produce DRAFT-thought-leadership.md in this folder from the concept brief, reframed for a public audience, preserving the brief's own speculative labeling. If UA 1.1 chose the Photon Mountain umbrella, conform the draft to the Photon Mountain voice doctrine.
- **Acceptance checks:** Draft keeps the "speculative venture thesis, not an engineering proposal" framing verbatim or equivalent; every mountain-specific fact carried over is marked as unverified or removed; sacred-site and National Park exclusions (Blanca, the Crestones) are preserved exactly as the brief states them; no em dashes; no invented facts beyond the brief.
- **Verification method:** Side-by-side pass against Satellite-Peak-Concept-Brief.md confirming no new factual claims were introduced; if under Photon Mountain, run the pm-voice-check and pm-fact-guardrails skills and record their results in the PT Review.

### UA 3.2 - Astraeon reviews and places the piece

- **Objective:** Astraeon reads the draft, approves or requests revisions, and decides venue and byline (Photon Mountain channel or standalone).
- **Acceptance checks:** Written approval or a revision list; venue named; if revisions, PT 3.1 reruns and this UA repeats.
- **Verification method:** Approval recorded in this folder or the PT log before anything ships; no publication occurs without it (publishing is an Astraeon-only action per the escalation rules in pt_protocol.md).

### PT 3.3 - Final pre-ship review

- **Objective:** Run the full pre-ship gate on the approved draft and hand Astraeon a ship-ready file.
- **Acceptance checks:** Facts verified or labeled speculative; voice intact; no em dashes; visuals (the three SVGs and site-map HTML) either included with the same speculative labeling or excluded deliberately.
- **Verification method:** PT Review gate per pt_protocol.md, checklist ticked item by item; a fact-check sweep on the final file with results logged.

## Phase 4: Develop the thesis (conditional, only if UA 1.1 = Develop)

**Goal:** Convert the brief's four make-or-break items into researched memos with real sources, ending in an informed continue-or-park decision. Research and writing only; no engineering, no land contact, no filings.

**Exit criteria:** Three diligence memos exist in this folder with cited sources, and UA 4.4 records a go, pivot, or park decision.

### PT 4.1 - Ruggedized-satellite landscape memo

- **Objective:** Research and write MEMO-1-ruggedized-satellites.md: the state of high-g-tolerant satellite hardware and who is working on it. The brief calls this the actual moat; test that claim against published sources.
- **Acceptance checks:** Every claim cited to a source found during research; the brief's ~200 g survivability figure treated as a hypothesis to check, not a fact; memo ends with an explicit "supports / weakens the thesis" judgment.
- **Verification method:** PT Review gate: spot-check citations resolve; confirm no uncited engineering numbers.

### PT 4.2 - Power and cadence model memo

- **Objective:** Research and write MEMO-2-power-cadence.md: what grid feed and storage a gigawatt-scale pulsed launcher would actually require, and whether the brief's once-an-hour cadence claim survives contact with published numbers.
- **Acceptance checks:** All energy and cadence figures sourced or derived with the derivation shown; the brief's cadence claim explicitly tested; memo states its confidence level.
- **Verification method:** PT Review gate: rerun any arithmetic in the memo independently and confirm it matches before passing.

### PT 4.3 - Firing-lane and land-status pre-diligence memo

- **Objective:** Research and write MEMO-3-sites-and-lanes.md covering the brief's top two candidates only, Greenhorn (DoD Piñon Canyon corridor) and Culebra (single private owner), from public sources. Desk research only; no outreach to any landowner, agency, or the Army.
- **Acceptance checks:** Every land-status, ownership, and corridor claim in the brief's site table is confirmed, corrected, or marked unverifiable from public sources; the brief's hard exclusions (Blanca as sacred, the Crestones / Great Sand Dunes as a National Park) are restated as permanent; no contact with any third party occurred.
- **Verification method:** PT Review gate: diff the memo's findings against the brief's site table row by row and log which cells changed.

### UA 4.4 - Go, pivot, or park

- **Objective:** Astraeon reads the three memos and decides: continue toward a deeper plan revision, pivot to Phase 3 (publish what was learned), or park via Phase 2.
- **Acceptance checks:** A dated decision appended to this file; if continue, Astraeon names what the next plan revision must cover.
- **Verification method:** Orchestrator confirms the decision entry and activates the corresponding branch or drafts the plan revision for approval.

## Open questions for Astraeon

1. UA 1.1 itself: park, publish, or develop? Everything below Phase 1 is inert until you answer.
2. If publish: under the Photon Mountain umbrella or standalone? This changes voice, venue, and which review skills gate the draft.
3. If publish: do the three SVGs and the site-map HTML ship with the piece, or is it text-only?
4. If develop: is the no-outreach constraint in PT 4.3 correct, or do you want quiet public-records-only inquiry to go further (still without contact)?
5. Does this project stay lowest priority in the fleet even if a branch activates, or does a Publish or Develop decision raise it?
6. The concept brief is dated "Draft v1, July 2026" without a day. Should it be stamped with an absolute date for the record, and if so, which?
