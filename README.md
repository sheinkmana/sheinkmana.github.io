# Personal webpage 

## Dilemma Dynamics demo

*Exploring AI strategies, incentives and cooperation.*

`dilemma-dynamics/` is the generated static application, published at `/dilemma-dynamics/`.
Both completed temperature studies and the combined report are included. Replay
and Results default to temperature zero and allow selecting temperature one.
The native post is `_posts/2026-10-23-dilemma-dynamics.md`. The demo opens Study replay
and exposes only replay and Results; it needs no API server, key, or inference.

The main project studies cooperation and incentives in the repeated Prisoner's
Dilemma, where private simultaneous choices can produce mutual gains. The full
local app also has a separate recreational side project: Dots & Boxes and
Tic-tac-toe explore competitive tactics and search on a fully visible board,
with a fixed box total or opposing win/draw/loss objectives. Those games are
outside the published 3,552-episode dilemma evaluation across temperatures 1 and 0 and this hosted demo.

To update it, in the Dilemma Dynamics source checkout run `npm ci` and
`npm run build:public`, then replace this site's `dilemma-dynamics/` contents with
`dist/web/` and copy the source's `LICENSE` to `dilemma-dynamics/LICENSE.txt`.
Do not copy the server build, local databases, credentials, or study output.

Build with the existing deployment commands:

```sh
JEKYLL_ENV=production bundle exec jekyll build --trace --lsi
purgecss -c purgecss.config.js
python3 bin/verify-dilemma-dynamics.py
```

The verifier checks that Jekyll preserved every demo file byte-for-byte,
the public research checksums still match, and the post and asset links resolve.
Keep `dilemma-dynamics/**` in `jekyll-minifier.exclude`: Vite already minifies the app,
and Jekyll's older JavaScript minifier cannot parse its bundle.
PurgeCSS processes only the theme's `assets/css/`, leaving demo CSS intact.

The existing deploy workflow publishes on a push to `master` or `main`.
These local changes do not publish until committed and pushed.

### License al-folio

The theme is available as open source under the terms of the [MIT License](https://github.com/alshedivat/al-folio/blob/master/LICENSE).

Originally, **al-folio** was based on the [\*folio theme](https://github.com/bogoli/-folio) (published by [Lia Bogoev](https://liabogoev.com) and under the MIT license).
Since then, it got a full re-write of the styles and many additional cool features.
