# בִּנְיָן · Binyan Studio — Redesigned Hebrew Verb Explorer

A calm, pedagogically designed Hebrew verb reference and trainer inspired by [Pealim.com](https://www.pealim.com), built as a zero-dependency static web app ready for local use or GitHub Pages hosting.

Verb lookup, conjugation, and training use the bundled data and rules in this folder. They do not call Gemini or any other language model, and the page blocks application network requests with a Content Security Policy. Bookmarks and custom verbs are stored in the browser. The optional pronunciation feature uses the browser's speech synthesis, which depends on the voices and services available on the device. Google Fonts and the optional Pealim reference link require internet access, but are not needed for the core features.

## Run Locally
Open `index.html` directly in any browser, or serve locally:
```bash
python3 -m http.server 8080 --directory hebrew
```

## GitHub Pages
The app uses relative paths and is served from the `hebrew/` folder of this repository.
