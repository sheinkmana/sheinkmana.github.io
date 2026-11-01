# בִּנְיָן · Binyan Studio — Redesigned Hebrew Verb Explorer

A calm, pedagogically designed Hebrew verb reference and trainer inspired by [Pealim.com](https://www.pealim.com), built as a zero-dependency static web app ready for local use or GitHub Pages hosting.

Verb lookup, conjugation, and training use the bundled data and rules in this folder. They do not call Gemini or any other language model, and the page blocks application network requests with a Content Security Policy. Bookmarks and custom verbs are stored in the browser. The optional pronunciation feature uses the browser's speech synthesis, which depends on the voices and services available on the device. Google Fonts and the optional Pealim reference link require internet access, but are not needed for the core features.

The built-in deck includes all entries from the [Lilmod Aleph Beth verb list](https://lilmod-aleph-beth.com/all-the-verbs/). Their available present and past forms were checked against the individual Pealim links in the explorer. Modern Hebrew normally omits the present-tense copula for להיות, so that entry has past forms and an explanatory note instead of a present-tense paradigm. The trainer excludes incomplete paradigms.

## Run Locally
Open `index.html` directly in any browser, or serve locally:
```bash
python3 -m http.server 8080 --directory hebrew
```

## GitHub Pages
The app uses relative paths and is served from the `hebrew/` folder of this repository.

## Verify the verb data
```bash
node hebrew/test-verb-data.js
```
