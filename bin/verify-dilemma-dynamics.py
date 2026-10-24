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

for directory in ("research", "research/temperature-zero"):
    episodes = json.loads((source / directory / "episodes.json").read_text())
    if len(episodes) != 1776 or any(r["status"] != "completed" for r in episodes):
        raise SystemExit(f"Expected 1,776 completed episodes: {directory}")
one = json.loads((source / "research/plan.json").read_text())
zero = json.loads((source / "research/temperature-zero/plan.json").read_text())
if (
    one["episodes"] != zero["episodes"]
    or one["procedure"]["temperature"] != 1
    or zero["procedure"]["temperature"] != 0
):
    raise SystemExit("Temperature schedules or settings differ")
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

for asset in (source / "assets").glob("*.js"):
    script = asset.read_text()
    if any(marker in script for marker in ("/api/", "EventSource", "Shut down server")):
        raise SystemExit(f"Local server controls found in {asset.name}")

print(
    f"Dilemma Dynamics verified: {len(files)} files copied byte-for-byte; both temperatures (3,552 episodes), post and asset links verified."
)
