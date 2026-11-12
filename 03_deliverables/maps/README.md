# Maps

Felt map exports land here. The labelling rule for the exclusions is step 9 of the `space-peak-publish-gate` skill.

## Status: not built, and two things block it

### 1. Felt MCP is not on this workspace plan

Verified 2026-10-05. Calling `create_map` returns:

> Felt's MCP server isn't included in the "Colorado Startups, Ltd." workspace's plan, so creating and analyzing maps through MCP isn't available here. MCP access is available on the Business plan and above.

Only `who_am_i`, `help_center`, and `developer_docs` respond. A workspace admin can upgrade from workspace settings, or the map can be imported by hand through the Felt web app once the data exists.

### 2. The data does not exist yet, and inventing it is not allowed

A map needs a coordinate pair per site. `02_substance/claims_register.md` has no coordinates, because the concept brief has none.

Supplying them from memory would mean introducing factual claims the brief never made, which is the one thing this repository is built to prevent. `MASTER_PLAN.md` PT 3.1 permits zero new factual claims, and `04_tools/space_peak_claims.py` fails on a figure about a place with no register row.

So the coordinates are not a detail to fill in on the way to a map. They are twenty new claims that each need a row and a citation first. The rule binds whoever builds the map as much as whoever writes the prose, which is the point of keeping it in data rather than in good intentions.

## What a correct build looks like

1. Add a coordinate column to the `S-` rows in the register, each `unverified` until sourced, each citing where it came from. USGS GNIS is the obvious source for a named summit.
2. Generate GeoJSON from the register. One feature per `S-` row, carrying site, elevation, land status, firing lane, and status.
3. **Two layers, not one.** Candidates in one, permanent exclusions in the other. A map showing seven pins in one style, with Blanca Peak and the Crestones simply further down a ranking, invites the viewer to re-rank them. A symbol is an argument.
4. Exclusion markers carry the site name and the reason, and nothing about elevation or lane quality. Those facts are irrelevant to an exclusion, and including them reopens the question.
5. Record what was generated here, from which register revision, and on what date.

## The three SVGs

`03_deliverables/infographics/` holds three hand-drawn SVGs that predate all of this. Once a real map exists, each is superseded, kept because it does a different job, or retired. The mass-driver cross-section is a diagram rather than a map and probably survives. That is a recommendation, not a decision.
