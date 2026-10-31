# בִּנְיָן · Binyan Studio — Redesigned Hebrew Verb Explorer

A calm, pedagogically designed Hebrew verb reference and trainer inspired by [Pealim.com](https://www.pealim.com), built as a zero-dependency static web app ready for local use or GitHub Pages hosting.

## Run Locally
Open `index.html` directly in any browser, or serve locally:
```bash
python3 -m http.server 8080 --directory /Users/alisasheinkman/Desktop/hebrew
```

## Host on Your GitHub Pages Blog (`sheinkmana.github.io`)
Because all paths in `index.html` are relative (`./styles.css`, `./data/binyanim.js`, `./data/verbs.js`, `./app.js`), you can host it at `https://sheinkmana.github.io/hebrew/` by copying the folder into your blog repo:
```bash
mkdir -p /Users/alisasheinkman/Documents/GitHub/sheinkmana.github.io/hebrew
cp -R /Users/alisasheinkman/Desktop/hebrew/* /Users/alisasheinkman/Documents/GitHub/sheinkmana.github.io/hebrew/
```
