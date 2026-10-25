# Personal webpage

## Dilemma Dynamics

*Exploring AI strategies, incentives and cooperation.*

`dilemma-dynamics/` is the generated static application, published at
`/dilemma-dynamics/`. It contains the **7,104-episode evaluation** across
**temperatures 0 and 1**, saved recordings and PDF notes. The native post is
`_posts/2026-10-23-dilemma-dynamics.md`.

The app opens **Play & understand** (`#play`): learn the repeated Prisoner's
Dilemma, play yourself, watch bots, or watch saved Nemotron games with round
analysis. **Results** (`#results`) leads with findings and charts; optional
**Study replay** sits below them (`#replay`), followed by detailed tables and
methods. **Recreational games** (`#recreational`) offers Tic-tac-toe and Dots &
Boxes: mathematical grid/lattice games with perfect information and visible
sequential moves. The existing `#dilemma` and `#analysis` links remain supported.

Free browser play, saved history, pause/resume and replay exports need no API
server, key or inference. Both app builds share this interface. For live Nemotron
play through Nebius, [launch the app locally](https://github.com/sheinkmana/dilemma-dynamics#run-locally);
the localhost server keeps the key private and calls use the player's account.

To update, run `npm ci` and `npm run build:public` in the source checkout, then
replace this site's `dilemma-dynamics/` contents with `dist/web/`. The
source license is included as `dilemma-dynamics/LICENSE.txt`. The website build uses an
explicit allowlist of app assets, PDF notes, required figures and viewer data,
saved episodes and a website checksum manifest. Full scientific exports and TeX
source stay in the repository. Local instructions, request records and private
execution evidence stay local.

Build with the existing deployment commands:

```sh
JEKYLL_ENV=production bundle exec jekyll build --trace --lsi
purgecss -c purgecss.config.js
python3 bin/verify-dilemma-dynamics.py
```

For a staged bundle check before Jekyll is available, use
`python3 bin/verify-dilemma-dynamics.py --source-only`. This checks the actual
post source, assets and data without claiming a full site build.

The default verifier checks that Jekyll preserves every demo file byte for byte, the
website checksums match, and post and asset links resolve. Keep
`dilemma-dynamics/**` in `jekyll-minifier.exclude`: Vite already minifies the app.
PurgeCSS processes only the theme's `assets/css/`, leaving demo CSS intact.

The existing deploy workflow publishes on a push to `master` or `main`.
Local changes do not publish until committed and pushed.

### License al-folio

The theme is available as open source under the terms of the [MIT License](https://github.com/alshedivat/al-folio/blob/master/LICENSE).

Originally, **al-folio** was based on the [\*folio theme](https://github.com/bogoli/-folio) (published by [Lia Bogoev](https://liabogoev.com) and under the MIT license).
Since then, it got a full re-write of the styles and many additional cool features.
