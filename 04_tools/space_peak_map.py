#!/usr/bin/env python3
"""space_peak_map.py: build the map data from the claims register.

The map in 03_deliverables/map/ draws nothing the register does not hold.
This script is the only way its GeoJSON is made:

  G- rows   one point per brief site, from USGS GNIS, with its feature ID
  S- rows   the brief's claims about each site, carried with their status
  R- rows   the facts about the Colorado Startups region loop

The loop's ring is the website's, not ours. Pass the website's
data/geo/regions.geojson at WEBSITE_COMMIT, the commit the R- rows cite.
--region-url prints its raw URL, so CI and people fetch the one pin:

  curl -fsSL "$(python3 04_tools/space_peak_map.py --region-url)" -o /tmp/regions.geojson
  python3 04_tools/space_peak_map.py --region-geojson /tmp/regions.geojson

--check rebuilds in memory and exits 1 if the committed file differs or is
missing. A register row that does not parse, a duplicate ID, or a site
without both G- and S- rows also exit 1, as does a first cell that looks
like an ID but is not one (S-01a, s-01, **S-01**). Exit 3 means it could not read an input: could not verify, not
a failure. --self-test runs a known-bad sample for each of those.
"""

import argparse
import datetime
import hashlib
import json
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import space_peak_rules as R  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTER = os.path.join(ROOT, "02_substance", "claims_register.md")
OUT = os.path.join(ROOT, "03_deliverables", "map", "space_peak_map.geojson")

WEBSITE_REPO = "Colorado-Startups/coloradostartups.org"
WEBSITE_COMMIT = "37232431f9bab6a2a3cb2e09701642f40b446187"
REGION_ID = "space-peak"
REGION_URL = (f"https://raw.githubusercontent.com/{WEBSITE_REPO}/"
              f"{WEBSITE_COMMIT}/data/geo/regions.geojson")
GNIS_QUERY = ("https://carto.nationalmap.gov/arcgis/rest/services/geonames/"
              "MapServer/5/query")

ROW_RE = re.compile(r"^\|\s*([SGR]-\d+)\s*\|(.+)\|\s*$")
ID_RE = re.compile(r"^\|\s*[SGR]-\d+\b")
# Near misses: any case, markup around it, a letter after the digits.
NEAR_ID_RE = re.compile(r"^\|\s*[*_`~]*\s*[SGR]\s*-\s*\d", re.IGNORECASE)
MIN_CELLS = {"G-": 4, "S-": 2, "R-": 1}
STATUS_RE = re.compile(r"`(unverified|verified|corrected|unverifiable|open)`")
COORD_RE = re.compile(r"^(.+?),\s*(\d+\.\d+)\s*N,\s*(\d+\.\d+)\s*W")
GNIS_RE = re.compile(r"GNIS\s+(\d+)")


def cells(line):
    """A register row's ID and cells, or None for another line; raise ValueError on a near-miss ID row."""
    m = ROW_RE.match(line.strip())
    if not m:
        if ID_RE.match(line.strip()) or NEAR_ID_RE.match(line.strip()):
            raise ValueError(f"register row does not parse: {line.strip()[:60]}")
        return None
    rest = [c.strip() for c in m.group(2).split("|")]
    if len(rest) < MIN_CELLS[m.group(1)[:2]]:
        raise ValueError(f"{m.group(1)}: too few cells to parse")
    return m.group(1), rest


def parse(text):
    sites, claims, region, seen = [], {}, [], set()
    for line in text.splitlines():
        row = cells(line)
        if not row:
            continue
        rid, c = row
        if rid in seen:
            raise ValueError(f"{rid}: duplicate register ID")
        seen.add(rid)
        status_m = STATUS_RE.search(line)
        status = status_m.group(1) if status_m else None
        if rid.startswith("G-"):
            site, claim, _st, source = c[0], c[1], c[2], c[3]
            m, g = COORD_RE.match(claim), GNIS_RE.search(source)
            if not (m and g):
                raise ValueError(f"{rid}: no coordinate or GNIS ID")
            sites.append({"id": rid, "site": site, "summit": m.group(1).strip(),
                          "lat": float(m.group(2)), "lon": -float(m.group(3)),
                          "gnis": int(g.group(1)), "status": status})
        elif rid.startswith("S-"):
            claims.setdefault(c[0], []).append(
                {"id": rid, "claim": c[1], "status": status})
        elif rid.startswith("R-"):
            region.append({"id": rid, "claim": c[0], "status": status})
    names = {s["site"] for s in sites}
    for site, rows in claims.items():
        if site not in names:
            raise ValueError(f"{rows[0]['id']}: site {site!r} has no G- row")
    return sites, claims, region


def gnis_url(name):
    """The USGS GNIS query URL for one Colorado place name."""
    q = {"where": f"gaz_name='{name}' AND state_alpha='CO'",
         "outFields": "*", "outSR": "4326", "f": "json"}
    return GNIS_QUERY + "?" + urllib.parse.urlencode(q)


def build(register_text, region_geojson, today, rules=None):
    """The map GeoJSON: the region loop, then a point per brief site with its claims."""
    sites, claims, region_rows = parse(register_text)

    region = next(f for f in region_geojson["features"]
                  if f["properties"].get("id") == REGION_ID)
    rp = region["properties"]
    features = [{
        "type": "Feature",
        "properties": {
            "layer": "region",
            "name": "Colorado Startups region: " + rp["name"],
            "whose": "The coloradostartups.org region, not this repository's launch complex",
            "roads": rp["roads"],
            "cities": rp["cities"],
            "area_sq_mi": rp["area_sq_mi"],
            "span_mi": rp["span_mi"],
            "vs_silicon_valley": rp["vs_silicon_valley"],
            "note": rp["note"],
            "register": [r["id"] for r in region_rows],
            "source": f"{WEBSITE_REPO} data/geo/regions.geojson at {WEBSITE_COMMIT}",
            "source_url": (f"https://github.com/{WEBSITE_REPO}/blob/"
                           f"{WEBSITE_COMMIT}/data/geo/regions.geojson"),
        },
        "geometry": region["geometry"],
    }]

    for s in sites:
        point = {"type": "Point", "coordinates": [s["lon"], s["lat"]]}
        if s["site"] not in claims:
            raise ValueError(f"{s['id']}: site {s['site']!r} has no S- rows")
        features.append({"type": "Feature", "properties": {
            "layer": "site", "name": s["site"], "summit": s["summit"],
            "register": s["id"], "gnis_id": s["gnis"],
            "source_url": gnis_url(s["summit"]),
            "claims": claims.get(s["site"], []),
        }, "geometry": point})

    blob = hashlib.sha1(b"blob %d\0" % len(register_text.encode())
                        + register_text.encode()).hexdigest()
    return {
        "type": "FeatureCollection",
        "generated": {
            "by": "04_tools/space_peak_map.py",
            "date": today,
            "register": "02_substance/claims_register.md",
            "register_git_blob": blob,
            "license": "CC0-1.0",
        },
        "features": features,
    }


def dump(obj):
    """The GeoJSON text as committed: one-space indent, UTF-8, a final newline."""
    return json.dumps(obj, indent=1, ensure_ascii=False) + "\n"


def check(reg, web, out):
    """Exit 1 when the committed file is missing or differs from a rebuild."""
    name = os.path.basename(out)
    try:
        with open(out, encoding="utf-8") as fh:
            old = json.load(fh)
    except FileNotFoundError:
        print(f"{name} is missing: rerun without --check", file=sys.stderr)
        return 1
    except (OSError, ValueError) as exc:
        print(f"could not verify: {exc}", file=sys.stderr)
        return 3
    new = build(reg, web, old["generated"]["date"])
    if dump(new) != dump(old):
        print(f"{name} is stale: rerun without --check")
        return 1
    print(f"{name} matches the register")
    return 0


SAMPLE_WEB = {"features": [{"properties": {
    "id": REGION_ID, "name": "n", "roads": [], "cities": [], "area_sq_mi": 0,
    "span_mi": 0, "vs_silicon_valley": 0, "note": ""}, "geometry": None}]}
SAMPLE_REG = """\
| S-01 | Pikes Peak | Elevation 14,115 ft | `unverified` | | |
| S-02 | Blanca Peak | Sisnaajini | `unverified` | | |
| G-01 | Pikes Peak | Pikes Peak, 38.84059 N, 105.04491 W, per GNIS | `verified` | GNIS 204770 | |
| G-02 | Blanca Peak | Blanca Peak, 37.57757 N, 105.48561 W, per GNIS | `verified` | GNIS 192735 | |
"""


def self_test():
    """Each known-bad sample must raise, and the clean sample must build."""
    rules = R.load_rules()
    tail = " | Pikes Peak | x | `unverified` | | |\n"
    bad = {  # label: (register, the message it must raise)
        "unparsed row": (SAMPLE_REG + "| S-03 | Pikes Peak\n", "does not parse"),
        "too few cells": (SAMPLE_REG + "| G-03 | Pikes Peak | x |\n",
                          "G-03: too few cells"),
        "ID with a letter": (SAMPLE_REG + "| S-01a" + tail, "does not parse: | S-01a"),
        "lower-case ID": (SAMPLE_REG + "| s-05" + tail, "does not parse: | s-05"),
        "bold ID": (SAMPLE_REG + "| **S-06**" + tail, "does not parse: | **S-06**"),
        "duplicate ID": (SAMPLE_REG + "| S-01" + tail, "S-01: duplicate register ID"),
        "S- row with no G- row": (SAMPLE_REG + "| S-04 | Mt Nowhere | x | `unverified` | | |\n",
                                  "site 'Mt Nowhere' has no G- row"),
        "G- site with no S- rows": (SAMPLE_REG + "| G-04 | Mt Elbert | Mount Elbert, "
            "39.11777 N, 106.44534 W, per GNIS | `verified` | GNIS 1 | |\n",
            "site 'Mt Elbert' has no S- rows"),
    }
    ok = True
    try:
        build(SAMPLE_REG, SAMPLE_WEB, "2000-01-01", rules)
        print("self-test: clean sample builds: OK")
    except ValueError as exc:
        print(f"self-test: clean sample raised {exc}: FAIL")
        ok = False
    for label, (reg, want) in bad.items():
        try:
            build(reg, SAMPLE_WEB, "2000-01-01", rules)
            print(f"self-test: {label} NOT raised: FAIL")
            ok = False
        except ValueError as exc:
            if want in str(exc):
                print(f"self-test: {label} raised: OK")
            else:
                print(f"self-test: {label} raised {exc!r}, want {want!r}: FAIL")
                ok = False
    with open(os.path.join(ROOT, ".github", "workflows", "ci.yml"), encoding="utf-8") as fh:
        ci = fh.read()
    if WEBSITE_COMMIT in REGION_URL and "--region-url" in ci and WEBSITE_REPO not in ci:
        print("self-test: CI fetches the region at WEBSITE_COMMIT via --region-url: OK")
    else:
        print("self-test: ci.yml types its own website URL, not --region-url: FAIL")
        ok = False
    missing = os.path.join(ROOT, "no-such-dir", "missing.geojson")
    if check(SAMPLE_REG, SAMPLE_WEB, missing) == R.EXIT_BLOCKED:
        print("self-test: --check on a missing file exits 1: OK")
    else:
        print("self-test: --check on a missing file did not exit 1: FAIL")
        ok = False
    print("self-test:", "PASS" if ok else "FAIL")
    return R.EXIT_OK if ok else R.EXIT_BLOCKED


def main(argv=None):
    """The command line: build or --check the map, run --self-test, or print --region-url."""
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    ap.add_argument("--region-geojson",
                    help="the website's data/geo/regions.geojson")
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--out", default=OUT, help=argparse.SUPPRESS)
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--region-url", action="store_true",
                    help="print the raw URL of regions.geojson at WEBSITE_COMMIT")
    a = ap.parse_args(argv)
    if a.region_url:
        print(REGION_URL)
        return 0
    if a.self_test:
        return self_test()
    if not a.region_geojson:
        ap.error("--region-geojson is required")
    try:
        with open(REGISTER, encoding="utf-8") as fh:
            reg = fh.read()
        with open(a.region_geojson, encoding="utf-8") as fh:
            web = json.load(fh)
    except (OSError, ValueError) as exc:
        print(f"could not verify: {exc}", file=sys.stderr)
        return 3
    try:
        if a.check:
            return check(reg, web, a.out)
        data = build(reg, web, a.date)
    except ValueError as exc:
        print(f"bad map input: {exc}", file=sys.stderr)
        return 1
    with open(a.out, "w", encoding="utf-8") as fh:
        fh.write(dump(data))
    kinds = [f["properties"]["layer"] for f in data["features"]]
    print(f"wrote {os.path.relpath(a.out, ROOT)}: "
          f"{kinds.count('site')} sites, "
          f"{kinds.count('region')} region; register blob "
          f"{data['generated']['register_git_blob'][:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
