#!/usr/bin/env python3
"""space_peak_map.py: build the map data from the claims register.

The map in 03_deliverables/map/ draws nothing the register does not hold.
This script is the only way its GeoJSON is made:

  G- rows   one point per brief site, from USGS GNIS, with its feature ID
  S- rows   the brief's claims about each site, carried with their status
  R- rows   the facts about the Colorado Startups region loop
  frozen    the two permanent exclusions, from 04_tools/space_peak_rules.json

The two layers stay apart in the data, not only on the page. A feature in
the exclusions layer carries its name, its reason and its point. It carries
no elevation, no lane and no claim list, so no page can show one.

The loop's ring is the website's, not ours. Pass the website's
data/geo/regions.geojson at the commit the R- rows cite:

  gh api "repos/Colorado-Startups/coloradostartups.org/contents/data/geo/regions.geojson?ref=COMMIT" \
     -H "Accept: application/vnd.github.raw" > /tmp/regions.geojson
  python3 04_tools/space_peak_map.py --region-geojson /tmp/regions.geojson

--check rebuilds in memory and exits 1 if the committed file differs or is
missing. A register row that does not parse, a duplicate ID, a site without
both G- and S- rows, or exclusions that differ from the rules' frozen sites
also exit 1. Exit 3 means it could not read an input: could not verify, not
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
GNIS_QUERY = ("https://carto.nationalmap.gov/arcgis/rest/services/geonames/"
              "MapServer/5/query")

ROW_RE = re.compile(r"^\|\s*([SGR]-\d+)\s*\|(.+)\|\s*$")
ID_RE = re.compile(r"^\|\s*[SGR]-\d+\b")
MIN_CELLS = {"G-": 4, "S-": 2, "R-": 1}
STATUS_RE = re.compile(r"`(unverified|verified|corrected|unverifiable|frozen|open)`")
COORD_RE = re.compile(r"^(.+?),\s*(\d+\.\d+)\s*N,\s*(\d+\.\d+)\s*W")
GNIS_RE = re.compile(r"GNIS\s+(\d+)")


def cells(line):
    m = ROW_RE.match(line.strip())
    if not m:
        if ID_RE.match(line.strip()):
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


def frozen_key(site, rules):
    low = site.lower()
    for key, aliases in R.frozen_aliases(rules).items():
        if any(a in low for a in aliases):
            return key
    return None


def gnis_url(name):
    q = {"where": f"gaz_name='{name}' AND state_alpha='CO'",
         "outFields": "*", "outSR": "4326", "f": "json"}
    return GNIS_QUERY + "?" + urllib.parse.urlencode(q)


def build(register_text, region_geojson, today, rules=None):
    rules = rules or R.load_rules()
    labels = R.frozen_labels(rules)
    reasons = {k: v["reason"] for k, v in rules["frozen_sites"].items()
               if not k.startswith("_")}
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

    excluded = []
    for s in sites:
        point = {"type": "Point", "coordinates": [s["lon"], s["lat"]]}
        key = frozen_key(s["site"], rules)
        if key:
            excluded.append(key)
            # Name, reason and point. Nothing else, on purpose.
            features.append({"type": "Feature", "properties": {
                "layer": "exclusion", "name": labels[key], "reason": reasons[key],
                "register": s["id"]}, "geometry": point})
            continue
        if frozen_key(s["summit"], rules):
            raise ValueError(f"{s['id']}: excluded summit {s['summit']!r} "
                             "among the candidates")
        if s["site"] not in claims:
            raise ValueError(f"{s['id']}: site {s['site']!r} has no S- rows")
        features.append({"type": "Feature", "properties": {
            "layer": "site", "name": s["site"], "summit": s["summit"],
            "register": s["id"], "gnis_id": s["gnis"],
            "source_url": gnis_url(s["summit"]),
            "claims": claims.get(s["site"], []),
        }, "geometry": point})

    if sorted(excluded) != sorted(labels):
        raise ValueError(f"exclusions {sorted(excluded)} do not match the "
                         f"frozen sites {sorted(labels)} in the rules")

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
| S-02 | Blanca Peak | Sisnaajini | `frozen` | | |
| G-01 | Pikes Peak | Pikes Peak, 38.84059 N, 105.04491 W, per GNIS | `verified` | GNIS 204770 | |
| G-02 | Blanca Peak | Blanca Peak, 37.57757 N, 105.48561 W, per GNIS | `verified` | GNIS 192735 | |
| G-03 | Crestones / Sand Dunes | Crestone Peak, 37.96682 N, 105.58540 W, per GNIS | `verified` | GNIS 192423 | |
"""


def self_test():
    """Each known-bad sample must raise, and the clean sample must build."""
    rules = R.load_rules()
    g03 = SAMPLE_REG.splitlines()[4] + "\n"
    bad = {
        "unparsed row": SAMPLE_REG + "| S-03 | Pikes Peak\n",
        "duplicate ID": SAMPLE_REG + "| S-01 | Pikes Peak | Again | `unverified` | | |\n",
        "S- row with no G- row": SAMPLE_REG + "| S-04 | Mt Nowhere | x | `unverified` | | |\n",
        "G- site with no S- rows": SAMPLE_REG + "| G-04 | Mt Elbert | Mount Elbert, "
            "39.11777 N, 106.44534 W, per GNIS | `verified` | GNIS 1 | |\n",
        "excluded summit among candidates": SAMPLE_REG.replace(
            "| Pikes Peak, 38", "| Blanca Peak, 38"),
        "exclusions short of the frozen sites": SAMPLE_REG.replace(g03, ""),
    }
    ok = True
    try:
        build(SAMPLE_REG, SAMPLE_WEB, "2000-01-01", rules)
        print("self-test: clean sample builds: OK")
    except ValueError as exc:
        print(f"self-test: clean sample raised {exc}: FAIL")
        ok = False
    for label, reg in bad.items():
        try:
            build(reg, SAMPLE_WEB, "2000-01-01", rules)
            print(f"self-test: {label} NOT raised: FAIL")
            ok = False
        except ValueError:
            print(f"self-test: {label} raised: OK")
    missing = os.path.join(ROOT, "no-such-dir", "missing.geojson")
    if check(SAMPLE_REG, SAMPLE_WEB, missing) == R.EXIT_BLOCKED:
        print("self-test: --check on a missing file exits 1: OK")
    else:
        print("self-test: --check on a missing file did not exit 1: FAIL")
        ok = False
    print("self-test:", "PASS" if ok else "FAIL")
    return R.EXIT_OK if ok else R.EXIT_BLOCKED


def main(argv=None):
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n")[0])
    ap.add_argument("--region-geojson",
                    help="the website's data/geo/regions.geojson")
    ap.add_argument("--date", default=datetime.date.today().isoformat())
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--out", default=OUT, help=argparse.SUPPRESS)
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args(argv)
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
          f"{kinds.count('site')} sites, {kinds.count('exclusion')} exclusions, "
          f"{kinds.count('region')} region; register blob "
          f"{data['generated']['register_git_blob'][:12]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
