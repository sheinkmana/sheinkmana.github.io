#!/usr/bin/env python3
"""Verify the standalone demo after Jekyll and PurgeCSS, without inference."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import sys


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        self.urls.extend(value for key, value in attrs if key in ("href", "src") and value)


root = Path(__file__).resolve().parent.parent
destination = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "_site"
source = root / "dilemma-dynamics"
files = [path for path in source.rglob("*") if path.is_file()]
if not files:
    raise SystemExit("Missing dilemma-dynamics build. Export it before building Jekyll.")

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
summary = json.loads((source / "research/summary.json").read_text())
review = json.loads((source / "research/publication-review.json").read_text())
if summary["completed"] != 7104 or not summary["complete"] or not review["ready"] or review["evidenceHead"] != summary["evidenceHead"]:
    raise SystemExit("Final completion/release identity differs")
manifest = json.loads((source / "research/manifest.json").read_text())
research_files = {
    p.relative_to(source / "research").as_posix()
    for p in (source / "research").rglob("*")
    if p.is_file()
}
if research_files != set(manifest["files"]) | {"manifest.json"}:
    raise SystemExit("Public research file set differs from manifest")
for name, expected in manifest["files"].items():
    actual = hashlib.sha256((source / "research" / name).read_bytes()).hexdigest()
    if actual != expected:
        raise SystemExit(f"Public research checksum mismatch: {name}")

banner = source / "brands/nebius-nvidia-hackathon.png"
if not banner.is_file() or not banner.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
    raise SystemExit("Missing hackathon banner")

for asset in (source / "assets").glob("*.js"):
    script = asset.read_text()
    if any(marker in script for marker in ("/api/", "EventSource", "Shut down server")):
        raise SystemExit(f"Local server controls found in {asset.name}")

print(
    f"Dilemma Dynamics verified: {len(files)} files copied byte-for-byte; both final temperatures (7,104 episodes), post and asset links verified."
)
