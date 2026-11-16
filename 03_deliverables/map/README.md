# Map

The Space Peak map: one MapLibre page over OpenFreeMap with Mapterhorn hillshade, built 2026-11-15. It is a repository deliverable, not the thought-leadership piece. Publishing the piece is Paul's decision under MASTER_PLAN UA 3.2.

```mermaid
flowchart LR
  G("USGS GNIS<br/>summit points") --> REG("claims_register.md<br/>G-, S-, R- rows")
  W("coloradostartups.org<br/>regions.geojson at 3723243") --> REG
  RULES("space_peak_rules.json<br/>frozen_sites") --> B
  REG --> B("04_tools/space_peak_map.py")
  W --> B
  B --> D("space_peak_map.geojson") --> P("index.html")
  P --> PAGES("Pages site, /map/")
```

## Files

| File | Holds | Made by |
| --- | --- | --- |
| `index.html` | The page: three toggled layers, a facts panel for the loop, and the site lists that are its accessible alternative | Hand |
| `space_peak_map.geojson` | Every feature the page draws, with the register revision it came from | `04_tools/space_peak_map.py`. Never edit by hand |
| `README.md` | This file | Hand |

## The three layers

| Layer | Symbol | Carries | Register rows |
| --- | --- | --- | --- |
| Region loop | Glow, casing and line over a fill | Roads, cities, area, span and size, each sourced | R-01 to R-05 |
| Summits in the brief | Blue dot, labelled "speculative" | GNIS point and ID; each brief claim and its status | G-01 to G-05 and their `S-` rows |
| Permanent exclusions | A ring with a bar, in its own colour | The name and the reason. No elevation, no lane, no claim list | G-06 and G-07; the exclusions are S-17 to S-20 |

The two site layers never mix. The page lists them in separate sections, and the data keeps them in separate `layer` values, so no page built on this file can rank one against the other. The summits are in register order, which is not a ranking.

The region loop is the website's, not this project's. On coloradostartups.org, "Space Peak" is also the name of the Colorado Startups region for Colorado Springs and Fountain. It is a loop of major roads, and it says nothing about where a mass driver would go.

## Where each point comes from

| Point | Source | Kept off the map |
| --- | --- | --- |
| Five summits in the brief | USGS GNIS, one feature ID each, register G-01 to G-05 | None. Every site in the brief has a GNIS summit |
| Two exclusion markers | USGS GNIS, register G-06 and G-07 | The National Park is drawn as a marker on Crestone Peak, not as an area |

The brief names the Spanish Peaks as a pair. The map pins West Spanish Peak and records East Spanish Peak's feature ID in the register (G-03).

## Rebuild the data

The script reads the register, the rules file and the website's region file. It writes the GeoJSON and records the register's git blob and the date in `generated`.

```bash
gh api "repos/Colorado-Startups/coloradostartups.org/contents/data/geo/regions.geojson?ref=37232431f9bab6a2a3cb2e09701642f40b446187" \
  -H "Accept: application/vnd.github.raw" > /tmp/regions.geojson
python3 04_tools/space_peak_map.py --region-geojson /tmp/regions.geojson
python3 04_tools/space_peak_map.py --region-geojson /tmp/regions.geojson --check
```

The committed file was generated on 2026-11-15 from register blob `2a081370bfe7ba4122ad629bfd8a0d79bdee11f6`, which `git hash-object 02_substance/claims_register.md` reproduces. A new coordinate needs a `G-` row with its source first; the script reads nothing else.

## Look at it locally

```bash
cd 03_deliverables/map && python3 -m http.server 3316 --bind 127.0.0.1
```

Then open `http://localhost:3316/`. A `file://` page cannot fetch the GeoJSON.

## Credits

Summit points: USGS GNIS, public domain. Region loop: US Census TIGERweb road lines, via the coloradostartups.org repository; Census data is not copyrighted. The data here is CC0. The basemap tiles load at view time from OpenFreeMap (OpenMapTiles, OpenStreetMap contributors) and the terrain from Mapterhorn, and the map displays their credit. No OpenStreetMap data is stored in this repository.

## History

| Date | Change |
| --- | --- |
| 2026-10-05 | Felt was the plan; its MCP was not on the workspace plan, and no register row held a coordinate |
| 2026-11-15 | This page replaces an earlier Leaflet site map whose coordinates had no register rows and which drew the exclusions in the same symbol as the summits |

## The three SVGs

`03_deliverables/infographics/` holds three hand-drawn SVGs that predate this map. Each is now superseded, kept because it does a different job, or retired. The mass-driver cross-section is a diagram rather than a map and probably survives. That is a recommendation, not a decision.
