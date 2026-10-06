---
name: space-peak-site-map
description: Build or update the Space Peak candidate-site map in Felt from the claims register. Use when the user says "build the site map", "update the Felt map", "map the candidate sites", or wants the concept brief's site table rendered as a real map instead of a hand-drawn SVG.
---

# space-peak-site-map

**Precedence.** `02_substance/claims_register.md` is canonical for which sites exist and what their status is. `01_doctrine/voice.md` is canonical for the labelling discipline, which applies to a map as much as to prose. If this skill disagrees, they win and this file gets corrected in the same session.

Turns the register into a Felt map, following the pipeline Photon Mountain already uses in `03_deliverables/maps/` (`MAP_NOTES.md`, a GeoJSON export, a KML sibling).

## The rule that makes this different from an ordinary map

**Render the two permanent exclusions as exclusions, not as low-ranked candidates.**

A map showing seven pins in one style, with Blanca and the Crestones simply further down a ranking, invites the viewer to re-rank them. A symbol is an argument. Use a visibly different symbol, a different colour, and a label stating the reason, so the exclusion reads as settled rather than as an option that scored badly.

This is the visual half of the rule in `voice.md` about stating the exclusions rather than arguing them.

## Inputs

1. `02_substance/claims_register.md`. The map is generated from it, never hand-maintained alongside it.
2. Nothing else. A site not in the register does not go on the map.

## Steps

1. Read the register. Pull every `S-` row: site, elevation, land status, firing lane, and **status**.
2. Confirm the Felt workspace with `who_am_i`. It should be Colorado Startups, Ltd.
3. Create or update the map. One layer for candidate sites, one for permanent exclusions. They are different kinds of thing and belong on different layers.
4. Each candidate marker carries site name, elevation, land status, and register status. A marker for an `unverified` row must say `unverified` in the popup. The map is prose; the labelling rule applies to it.
5. Each exclusion marker carries the site name and the reason, and **nothing** about elevation or lane quality. Those facts are irrelevant to an exclusion, and including them reopens the question.
6. Export GeoJSON into `03_deliverables/maps/`, and write or update `03_deliverables/maps/MAP_NOTES.md` recording what was generated, from which register revision, and on what date.

## Then recommend the SVGs' fate

Three hand-drawn SVGs predate this map. Once the Felt map exists, each is superseded, kept because it does a different job (the mass-driver cross-section is a diagram, not a map, and probably survives), or retired.

**Recommend, do not decide.** Note it in `MAP_NOTES.md` and let a human choose.

## Do not

Do not publish or share the map externally. Publication is a human action under MASTER_PLAN UA 3.2.
