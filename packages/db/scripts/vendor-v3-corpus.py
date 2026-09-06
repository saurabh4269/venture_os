#!/usr/bin/env python3
"""Vendor illustrative corpus from v3.heisenbug.in JS bundle + public V3 portfolio profiles."""
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

CHUNK_URL = "https://v3.heisenbug.in/_next/static/chunks/651-f14569331a86d75b.js"
OUT = Path(__file__).resolve().parents[3] / "fixtures/v3-onboard/corpus.json"

PUBLIC_PROFILES = [
    {"id": "pattern-brands", "name": "Pattern Brands", "website": "https://www.patternbrands.com/", "sector": "lifestyle", "country": "US"},
    {"id": "suri", "name": "SURI", "website": "https://www.trysuri.com/", "sector": "wellness", "country": "GB"},
    {"id": "cuure", "name": "Cuure", "website": "https://cuure.com/", "sector": "wellness", "country": "FR"},
    {"id": "indu", "name": "Indu", "website": "https://indu.me/", "sector": "beauty", "country": "GB"},
    {"id": "eka-care", "name": "Eka Care", "website": "https://www.eka.care/", "sector": "digital health", "country": "IN"},
    {"id": "entri", "name": "Entri", "website": "https://entri.app/", "sector": "lifestyle", "country": "IN"},
    {"id": "dil-foods", "name": "Dil Foods", "website": "https://dilfoods.in/", "sector": "food", "country": "IN"},
    {"id": "antinorm", "name": "Antinorm", "website": "https://antinorm.co", "sector": "beauty", "country": "IN"},
    {"id": "just-russel", "name": "Just Russel", "website": "https://justrussel.com/", "sector": "pet", "country": "BE"},
    {"id": "baller-league", "name": "Baller League", "website": "https://ballerleague.de/", "sector": "sports", "country": "DE"},
    {"id": "newsoul", "name": "NewSoul", "website": "https://newsoul.de/", "sector": "wellness", "country": "DE"},
    {"id": "be-clinical", "name": "be-clinical", "website": "https://be-clinical.com", "sector": "digital health", "country": "DE"},
    {"id": "doodley", "name": "Doodley", "website": "https://doodley.in", "sector": "lifestyle", "country": "IN"},
    {"id": "litemed", "name": "LiteMed", "website": "https://litemed.co.in", "sector": "digital health", "country": "IN"},
    {"id": "cava-athleisure", "name": "CAVA Athleisure", "website": "https://cavaathleisure.com", "sector": "lifestyle", "country": "IN"},
    {"id": "freaks-of-nature", "name": "Freaks of Nature", "website": "https://freaksofnature.com/", "sector": "beauty", "country": "IN"},
    {"id": "rorra", "name": "Rorra", "website": "https://rorra.com/", "sector": "home", "country": "US"},
    {"id": "xtovia", "name": "Xtovia", "website": "https://xtovia.com/", "sector": "wellness", "country": "IN"},
    {"id": "scrubsy", "name": "Scrubsy", "website": "https://scrubsy.co.in/", "sector": "beauty", "country": "IN"},
    {"id": "feel-reformed", "name": "Feel Reformed", "website": "https://www.feelreformed.com/", "sector": "wellness", "country": "IN"},
]


def main() -> None:
    text = urllib.request.urlopen(CHUNK_URL).read().decode("utf-8")
    match = re.search(r"JSON\.parse\('(.+?)'\)", text)
    if not match:
        sys.exit("Could not locate corpus JSON.parse in heisenbug chunk")
    raw = match.group(1).encode("utf-8").decode("unicode_escape")
    corpus = json.loads(raw)
    ids = {c["id"] for c in corpus["companies"]}
    payload = {
        "vendoredAt": date.today().isoformat(),
        "sourceUrl": CHUNK_URL,
        "attribution": "fixtures/v3-onboard/ATTRIBUTION.txt",
        **corpus,
        "publicProfiles": [p for p in PUBLIC_PROFILES if p["id"] not in ids],
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"Wrote {OUT}: {len(corpus['companies'])} book companies, "
        f"{len(payload['publicProfiles'])} public profiles, {len(corpus.get('inbox', []))} inbox"
    )


if __name__ == "__main__":
    main()
