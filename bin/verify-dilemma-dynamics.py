#!/usr/bin/env python3
"""Verify the standalone demo after Jekyll and PurgeCSS, without inference."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import math
import re
from statistics import mean
import sys


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        self.urls.extend(value for key, value in attrs if key in ("href", "src") and value)


root = Path(__file__).resolve().parent.parent
source_only = "--source-only" in sys.argv[1:]
arguments = [arg for arg in sys.argv[1:] if arg != "--source-only"]
destination = Path(arguments[0]) if arguments else root / "_site"
source = root / "dilemma-dynamics"
files = [path for path in source.rglob("*") if path.is_file()]
if not files:
    raise SystemExit("Missing dilemma-dynamics build. Export it before verification.")

if source_only:
    # This validates staged assets and the actual post source, without claiming
    # that the theme's Jekyll/PurgeCSS deployment pipeline has been executed.
    post = root / "_posts/2026-10-23-dilemma-dynamics.md"
    demo_links = re.findall(r"['\"](/dilemma-dynamics/[^'\"]*)['\"]", post.read_text())
    if not demo_links:
        raise SystemExit("Missing demo links in post source")
    for url in demo_links:
        path = unquote(urlsplit(url).path).removeprefix("/dilemma-dynamics/")
        target = source / path
        if target.is_dir():
            target /= "index.html"
        if not target.is_file():
            raise SystemExit(f"Broken post-source demo URL: {url}")
else:
    for path in files:
        published = destination / "dilemma-dynamics" / path.relative_to(source)
        if not published.is_file() or published.read_bytes() != path.read_bytes():
            raise SystemExit(f"Jekyll changed or omitted dilemma-dynamics/{path.relative_to(source)}")
    post = destination / "blog/2026/dilemma-dynamics/index.html"
    for page in (destination / "dilemma-dynamics/index.html", post):
        parser = Links()
        parser.feed(page.read_text())
        demo_links = [url for url in parser.urls if url.startswith("/dilemma-dynamics/")]
        if not demo_links:
            raise SystemExit(f"Missing demo links in {page}")
        for url in demo_links:
            path = unquote(urlsplit(url).path).lstrip("/")
            target = destination / path
            if target.is_dir():
                target /= "index.html"
            if not target.is_file():
                raise SystemExit(f"Broken demo URL: {url}")

episodes = []
for temperature, directory in ((0, "research/temperature-zero"), (1, "research/temperature-one")):
    rows = json.loads((source / directory / "episodes.json").read_text())
    if len(rows) != 3552 or any(r["status"] != "completed" or r["temperature"] != temperature for r in rows):
        raise SystemExit(f"Expected 3,552 final episodes at temperature {temperature}")
    episodes.extend(rows)
if len({e["id"] for e in episodes}) != 7104:
    raise SystemExit("Final observation IDs are not unique")
by_match = {}
for e in episodes:
    by_match.setdefault(e["matchedId"], {})[e["temperature"]] = e
if len(by_match) != 3552:
    raise SystemExit("Wrong paired environment count")
for pair in by_match.values():
    if set(pair) != {0, 1} or any(pair[0][k] != pair[1][k] for k in ("cell", "block", "mapping", "players", "horizon", "rounds", "environmentSeed")):
        raise SystemExit("Temperature environments differ")
viewer = json.loads((source / "research/viewer-study.json").read_text())
summary = viewer["summary"]
if summary["completed"] != 7104 or not summary["complete"]:
    raise SystemExit("Evaluation completion differs")
for arm in summary["arms"]:
    rows = [e for e in episodes if e["temperature"] == arm["temperature"] and e["track"] == "A" and e["cell"].endswith("/" + arm["arm"])]
    if len(rows) != 768 or not math.isclose(mean(e["normalisedOracleLoss"] for e in rows), arm["meanOracleLoss"], abs_tol=1e-10, rel_tol=0):
        raise SystemExit("Viewer benchmark data differs from recorded actions")
for pairing in summary["cooperation"]:
    rows = [e for e in episodes if e["temperature"] == pairing["temperature"] and e["cell"] == pairing["cell"]]
    cc = mean(e["mutualCooperation"]["count"] / e["rounds"] for e in rows)
    if len(rows) != 48 or not math.isclose(cc, pairing["episodeWeightedCC"], abs_tol=1e-10, rel_tol=0):
        raise SystemExit("Viewer episode-weighted cooperation differs from recorded actions")
manifest = json.loads((source / "website-manifest.json").read_text())
website_files = {p.relative_to(source).as_posix() for p in files}
if website_files != set(manifest["files"]) | {"website-manifest.json"}:
    raise SystemExit("Website file set differs from checksum manifest")
required = {"index.html", "LICENSE.txt", "research/figures/primary-results.png", "research/figures/condition-effects.png", "research/figures/autonomous-self-play.png", "brands/nebius.svg", "brands/nvidia.svg", "brands/nebius-nvidia-hackathon.png", "research/paper/report.pdf", "research/viewer-study.json", "research/temperature-zero/episodes.json", "research/temperature-one/episodes.json"}
if not required <= website_files:
    raise SystemExit("Required website assets are missing")
allowed = re.compile(r"(?:index\.html|LICENSE\.txt|assets/[^/]+\.(?:js|css)|brands/(?:nebius\.svg|nvidia\.svg|nebius-nvidia-hackathon\.png)|research/(?:paper/report\.pdf|figures/(?:primary-results|condition-effects|autonomous-self-play)\.png|temperature-(?:zero|one)/episodes\.json|viewer-study\.json))")
private = re.compile(r"uncertainBillingAttempts|accountingAmendment|publication-review\.json|accounting\.json|AGENTS\.md|campaignCapUsd|additionalBudgetUsd|unresolvedMaximumExposure|budgetCeiling|evidenceHead|specSha256|sourceSha256")
for name, expected in manifest["files"].items():
    if not allowed.fullmatch(name):
        raise SystemExit(f"Website asset outside explicit allowlist: {name}")
    path = source / name
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"Website checksum mismatch: {name}")
    if path.suffix in {".js", ".json", ".html"} and private.search(path.read_text()):
        raise SystemExit(f"Local-only field or record in website asset: {name}")

banner = source / "brands/nebius-nvidia-hackathon.png"
if not banner.is_file() or not banner.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
    raise SystemExit("Missing hackathon banner")

for asset in (source / "assets").glob("*.js"):
    script = asset.read_text()
    if any(marker in script for marker in ("/api/", "EventSource", "Shut down server")):
        raise SystemExit(f"Local server controls found in {asset.name}")

mode = "Staged source verification (Jekyll not run)" if source_only else "Jekyll copy verification"
print(f"{mode}: {len(files)} allowlisted files; 7,104 episodes, chart data, checksums, privacy and post links verified.")
