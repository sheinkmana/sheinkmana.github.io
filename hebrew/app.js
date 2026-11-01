// Binyan Studio — Pedagogical Hebrew Verb Explorer & Trainer
(function () {
  const PRONOUN_META = {
    present: [
      { key: "ms", label: "Masculine Singular", hebPronoun: "אֲנִי / אַתָּה / הוּא", badge: "זָכָר יָחִיד (m.sg.)" },
      { key: "fs", label: "Feminine Singular", hebPronoun: "אֲנִי / אַתְּ / הִיא", badge: "נְקֵבָה יְחִידָה (f.sg.)" },
      { key: "mp", label: "Masculine Plural", hebPronoun: "אֲנַחְנוּ / אַתֶּם / הֵם", badge: "זָכָר רַבִּים (m.pl.)" },
      { key: "fp", label: "Feminine Plural", hebPronoun: "אֲנַחְנוּ / אַתֶּן / הֵן", badge: "נְקֵבָה רַבּוֹת (f.pl.)" }
    ],
    pastGroups: [
      {
        groupTitle: "1st Person · המדבר (I / We — same for m. & f.)",
        items: [
          { key: "1s", hebPronoun: "אֲנִי", label: "I (m./f.)" },
          { key: "1p", hebPronoun: "אֲנַחְנוּ", label: "We (m./f.)" }
        ]
      },
      {
        groupTitle: "2nd Person · הנוכח (You)",
        items: [
          { key: "2ms", hebPronoun: "אַתָּה", label: "You (m.sg.)" },
          { key: "2fs", hebPronoun: "אַתְּ", label: "You (f.sg.)" },
          { key: "2mp", hebPronoun: "אַתֶּם", label: "You (pl. / m.pl.)" },
          { key: "2fp", hebPronoun: "אַתֶּן", label: "You (f.pl. formal)" }
        ]
      },
      {
        groupTitle: "3rd Person · הנסתר (He / She / They)",
        items: [
          { key: "3ms", hebPronoun: "הוּא", label: "He / It (Base form)" },
          { key: "3fs", hebPronoun: "הִיא", label: "She / It" },
          { key: "3p", hebPronoun: "הֵם / הֵן", label: "They" }
        ]
      }
    ],
    imperative: [
      { key: "2ms", hebPronoun: "(אַתָּה)", label: "Command m.sg." },
      { key: "2fs", hebPronoun: "(אַתְּ)", label: "Command f.sg." },
      { key: "2mp", hebPronoun: "(אַתֶּם)", label: "Command pl." },
      { key: "2fp", hebPronoun: "(אַתֶּן)", label: "Command f.pl. (formal)" }
    ]
  };

  // App State
  // Clear legacy v1 custom verbs that could have paired an English label with default ש-מ-ר root
  localStorage.removeItem("hebrew_custom_verbs_v1");

  const state = {
    activeView: "explorer", // explorer | binyanim | trainer | notebook
    selectedVerbId: "larutz",
    activeTense: "all", // all | present | past | future | imperative
    binyanFilter: "all",
    searchQuery: "",
    colorMorph: true,
    spokenOnly: true, // hides archaic 2fp/3fp forms by default
    showNikud: true,
    inspectedForm: null, // { tenseLabel, pronoun, formObj }
    selectedRootFamilyIdx: 0,
    quizMode: "spot-binyan", // spot-binyan | conjugate | street-read
    quizQuestion: null,
    quizScore: { correct: 0, total: 0 },
    workshopRoot: "ר-ו-ץ",
    workshopBinyan: "paal",
    workshopMeaning: "to run / jog",
    workshopSearch: "",
    bookmarks: JSON.parse(localStorage.getItem("hebrew_bookmarks_v2") || '["larutz","likhtov","lehitlabesh","lehikanes","lehishtamesh"]'),
    customVerbs: JSON.parse(localStorage.getItem("hebrew_custom_verbs_v2") || "[]")
  };

  // Merge built-in + custom verbs
  function getAllVerbs() {
    return [...window.VERBS_DATA, ...state.customVerbs];
  }

  function getVerbById(id) {
    return getAllVerbs().find((v) => v.id === id) || getAllVerbs()[0];
  }

  // Render a morphologically segmented Hebrew word
  function renderMorphParts(parts, fallbackText) {
    if (!parts || !parts.length) {
      const txt = state.showNikud ? fallbackText : window.stripNikud(fallbackText);
      return `<span class="morph-word">${txt}</span>`;
    }
    const spans = parts
      .map((p) => {
        const txt = state.showNikud ? p.text : window.stripNikud(p.text);
        const cls =
          p.type === "root"
            ? "m-root"
            : p.type === "prefix"
            ? "m-prefix"
            : p.type === "infix"
            ? "m-infix"
            : "m-suffix";
        return `<span class="${cls}">${txt}</span>`;
      })
      .join("");
    return `<span class="morph-word" title="${fallbackText}">${spans}</span>`;
  }

  // Web Speech API Hebrew TTS
  window.speakHebrew = function (text, evt) {
    if (evt) evt.stopPropagation();
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "he-IL";
    utter.rate = 0.88;
    window.speechSynthesis.speak(utter);
  };

  // Search helper: searches infinitive, root, English, translit, AND all conjugated forms!
  function searchVerbs(query, binyanFilter) {
    const q = query.trim().toLowerCase();
    const qStripped = window.stripNikud(q).replace(/[-.\s]/g, "");
    const results = [];

    for (const verb of getAllVerbs()) {
      if (binyanFilter !== "all" && verb.binyan !== binyanFilter) continue;
      if (!q) {
        results.push({ verb, matchedForm: null });
        continue;
      }

      const rootClean = verb.root.replace(/[-.\s]/g, "");
      const infMatch =
        verb.infinitive.includes(q) ||
        (verb.aliases || []).some((alias) => alias.includes(qStripped)) ||
        verb.infinitiveUnvoweled.includes(qStripped) ||
        verb.english.toLowerCase().includes(q) ||
        (window.russianMeaning(verb.english) || "").toLowerCase().includes(q) ||
        verb.translit.replace(/·/g, "").toLowerCase().includes(q) ||
        verb.root.includes(q) ||
        (qStripped.length >= 2 && rootClean.includes(qStripped));

      if (infMatch) {
        results.push({ verb, matchedForm: null });
        continue;
      }

      // Check all conjugated cells for reverse-lookup (like Pealim!)
      let foundCell = null;
      const tenses = ["present", "past"];
      for (const t of tenses) {
        const tbl = verb.tables[t];
        if (!tbl) continue;
        for (const [personKey, cell] of Object.entries(tbl)) {
          if (
            cell.full.includes(q) ||
            (qStripped.length >= 2 && cell.unvoweled.includes(qStripped)) ||
            cell.translit.replace(/·/g, "").toLowerCase().includes(q)
          ) {
            foundCell = { tense: t, personKey, cell };
            break;
          }
        }
        if (foundCell) break;
      }

      if (foundCell) {
        results.push({ verb, matchedForm: foundCell });
      }
    }
    return results;
  }

  // Find matching entries in ENGLISH_ROOT_LEXICON not already shown in results
  function searchLexiconSuggestions(query, binyanFilter, existingResults) {
    const raw = (query || "").trim().toLowerCase();
    if (!raw || !window.ENGLISH_ROOT_LEXICON) return [];
    const stripped = window.stripNikud(raw);
    const existingKeys = new Set(
      existingResults.map(({ verb }) => `${verb.root}__${verb.binyan}`)
    );
    return window.ENGLISH_ROOT_LEXICON.filter((item) => {
      if (binyanFilter !== "all" && item.binyan !== binyanFilter) return false;
      if (existingKeys.has(`${item.root}__${item.binyan}`)) return false;
      const rootClean = item.root.replace(/-/g, "");
      const infClean = window.stripNikud(item.infinitive || "");
      return (
        item.english.toLowerCase().includes(raw) ||
        item.meaning.toLowerCase().includes(raw) ||
        item.root.includes(stripped) ||
        rootClean.includes(stripped) ||
        infClean.includes(stripped)
      );
    });
  }

  // Render Sidebar Verb List
  function renderSidebarList() {
    const listEl = document.getElementById("verb-list");
    const countEl = document.getElementById("verb-count-label");
    const results = searchVerbs(state.searchQuery, state.binyanFilter);
    const lexiconMatches = searchLexiconSuggestions(
      state.searchQuery,
      state.binyanFilter,
      results
    );
    const totalCount = results.length + lexiconMatches.length;
    countEl.textContent = `${totalCount} verb${totalCount === 1 ? "" : "s"}`;

    if (totalCount === 0) {
      const safeQ = (state.searchQuery || "").replace(/'/g, "");
      listEl.innerHTML = `
        <div style="padding: 1.25rem; text-align:center; color: var(--text-muted); font-size:0.88rem;">
          <p style="margin-bottom:0.6rem;">No exact match in local deck for <strong>"${state.searchQuery}"</strong>.</p>
          <button class="primary-btn" onclick="window.openWorkshopWithQuery('${safeQ}')" style="font-size:0.8rem;">
            + Look Up or Build "${state.searchQuery}" in Workshop
          </button>
        </div>`;
      return;
    }

    const dbHtml = results
      .map(({ verb, matchedForm }) => {
        const bInfo = window.BINYANIM_DATA.binyanim[verb.binyan];
        const isActive = verb.id === state.selectedVerbId;
        const matchBadge = matchedForm
          ? `<div style="font-size:0.72rem; color:#0f766e; font-weight:600; margin-top:0.15rem;">
               ↳ Matches form: ${matchedForm.cell.full} (${matchedForm.tense})
             </div>`
          : "";
        return `
          <div class="verb-list-item ${isActive ? "active" : ""}" onclick="window.selectVerb('${verb.id}'); if (window.matchMedia('(max-width: 980px)').matches) document.getElementById('verb-stage').scrollIntoView({behavior: 'smooth', block: 'start'});">
            <div class="vli-left">
              <div class="vli-eng">${verb.english}</div>
              <div class="vli-meta">
                <span style="color:${bInfo.color}; font-weight:700;">${bInfo.name}</span>
                <span>·</span>
                <span>${verb.translit}</span>
              </div>
              ${matchBadge}
            </div>
            <div class="vli-right">
              <div class="vli-heb">${renderMorphParts(verb.infinitiveParts, verb.infinitive)}</div>
              <span class="vli-root-badge">שורש ${verb.root}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const lexHtml = lexiconMatches
      .map((item) => {
        const bInfo = window.BINYANIM_DATA.binyanim[item.binyan];
        const safeMeaning = item.meaning.replace(/'/g, "\\'");
        const safePast = (item.past || "").replace(/'/g, "\\'");
        const trJson = JSON.stringify(item.tr || window.autoTranslitRoot(item.root)).replace(/"/g, "&quot;");
        return `
          <div class="verb-list-item" style="border-style:dashed; background:var(--bg-subtle);"
               onclick="window.synthesizeAndSelect('${item.root}', '${item.binyan}', '${safeMeaning}', ${trJson}, '${safePast}')">
            <div class="vli-left">
              <div class="vli-eng">${item.meaning}</div>
              <div class="vli-meta">
                <span style="color:${bInfo.color}; font-weight:700;">${bInfo.name}</span>
                <span>·</span>
                <span style="color:#0f766e; font-weight:600;">⚡ Instant Build & Open</span>
              </div>
            </div>
            <div class="vli-right">
              <div class="vli-heb">${state.showNikud ? item.infinitive : window.stripNikud(item.infinitive)}</div>
              <span class="vli-root-badge">שורש ${item.root}</span>
            </div>
          </div>
        `;
      })
      .join("");

    listEl.innerHTML = dbHtml + lexHtml;
  }

  // Render Root Family Strip ("Same Shoresh Across the 7 Buildings")
  function renderRootFamilyStrip(verb) {
    const allVerbs = getAllVerbs();
    const siblingsInDb = allVerbs.filter((v) => v.root === verb.root);
    const curatedFamily = window.BINYANIM_DATA.rootFamilies.find((f) => f.root === verb.root);

    const binyanOrder = ["paal", "nifal", "piel", "pual", "hifil", "hufal", "hitpael"];
    const cardsHtml = [];

    for (const bKey of binyanOrder) {
      const bMeta = window.BINYANIM_DATA.binyanim[bKey];
      const dbMatch = siblingsInDb.find((v) => v.binyan === bKey);
      const curatedMatch = curatedFamily && curatedFamily.members[bKey];

      if (!dbMatch && !curatedMatch) continue;

      const isCurrent = verb.binyan === bKey;
      const hebDisplay = dbMatch ? dbMatch.infinitive : curatedMatch.hebrew;
      const engDisplay = dbMatch ? dbMatch.english : curatedMatch.meaning;
      const clickHandler = dbMatch
        ? `window.selectVerb('${dbMatch.id}')`
        : `window.synthesizeAndSelect('${verb.root}', '${bKey}', '${(curatedMatch.meaning || "").replace(/'/g, "")}')`;

      cardsHtml.push(`
        <div class="sibling-card ${isCurrent ? "current" : ""}" onclick="${clickHandler}">
          <div class="sib-binyan">
            <span style="color:${bMeta.color}">${bMeta.name} (${bMeta.hebrew})</span>
            <span>${bMeta.voice.split("/")[0]}</span>
          </div>
          <div class="sib-hebrew">${state.showNikud ? hebDisplay : window.stripNikud(hebDisplay)}</div>
          <div class="sib-meaning">${engDisplay}</div>
        </div>
      `);
    }

    return `
      <div class="root-family-strip">
        <div class="strip-header">
          <div class="strip-title">
            <span>🏗️ Root Family Matrix · שׁוֹרֶשׁ <strong>${verb.root}</strong> Across the Binyanim</span>
          </div>
          <span style="font-size:0.78rem; color:var(--text-muted);">
            Click any building below to see how the same root letters shift voice & meaning
          </span>
        </div>
        <div class="strip-cards">
          ${cardsHtml.join("")}
        </div>
      </div>
    `;
  }

  // Synthesize a verb accurately using morphological Gizrah detection (Hollow, Lamed-He, Guttural, Sibilant, Regular)
  window.synthesizeAndSelect = function (root, binyan, meaning, customTr, pastMeaning) {
    const existing = getAllVerbs().find((v) => v.root === root && v.binyan === binyan);
    if (existing) {
      window.selectVerb(existing.id);
      if (state.activeView !== "explorer") window.switchView("explorer");
      return;
    }

    const bMeta = window.BINYANIM_DATA.binyanim[binyan];
    const rootTranslit =
      Array.isArray(customTr) && customTr.length === 3
        ? customTr
        : window.autoTranslitRoot(root);
    const infSpec = window.buildInfinitiveSpec(root, binyan, rootTranslit);
    const gizrah = window.detectGizrah(root, binyan);
    const cleanMeaning = meaning || `${bMeta.role} of ${root}`;
    const shortMeaning = cleanMeaning
      .replace(/^to\s+/i, "")
      .split(/[\/,]/)[0]
      .trim();

    const newVerb = window.createVerb({
      id: `synth_${root}_${binyan}`,
      infinitive: infSpec.infinitive,
      infinitiveParts: infSpec.infinitiveParts,
      translit: infSpec.translit,
      english: cleanMeaning,
      shortMeaning: shortMeaning || "act",
      pastMeaning: pastMeaning || undefined,
      root,
      rootTranslit,
      binyan,
      gizrah: gizrah.label,
      semanticNote: `${gizrah.note} Built from root ${root} in Binyan ${bMeta.name} (${bMeta.hebrew}).`
    });
    state.customVerbs.push(newVerb);
    localStorage.setItem("hebrew_custom_verbs_v2", JSON.stringify(state.customVerbs));
    window.selectVerb(newVerb.id);
    if (state.activeView !== "explorer") window.switchView("explorer");
  };

  // Render Word Anatomy Inspector Banner
  function renderAnatomyInspector(verb) {
    const info = state.inspectedForm || {
      tenseLabel: "Present (Masculine Singular)",
      pronoun: "אֲנִי / אַתָּה / הוּא",
      formObj: verb.tables.present.ms
    };
    const cell = info.formObj;
    const bMeta = window.BINYANIM_DATA.binyanim[verb.binyan];

    const breakdownBadges = (cell.parts || [])
      .map((p) => {
        const label =
          p.type === "root"
            ? "שורש (Root letter)"
            : p.type === "prefix"
            ? "תחילית (Binyan/Tense Prefix)"
            : p.type === "infix"
            ? "תבנית (Binyan Vowel)"
            : "סיומת (Person/Gender Ending)";
        const bg =
          p.type === "root"
            ? "#fef3c7; color:#92400e"
            : p.type === "prefix"
            ? "#dbeafe; color:#1e40af"
            : p.type === "infix"
            ? "#ccfbf1; color:#115e59"
            : "#ffe4e6; color:#9f1239";
        return `<span class="anat-chip" style="background:${bg}; border:none;">
                  <strong style="font-size:1.05rem; font-family:var(--font-serif-hebrew);">${p.text}</strong> · ${label}
                </span>`;
      })
      .join("<span>+</span>");

    return `
      <div class="anatomy-inspector">
        <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
          <div class="inspector-word-big">${renderMorphParts(cell.parts, cell.full)}</div>
          <div>
            <div style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; opacity:0.8;">
              🔍 Word Anatomy Inspector · Click any cell below to dissect
            </div>
            <div style="font-size:1.1rem; font-weight:700; margin-top:0.15rem;">
              ${info.pronoun} <strong>${cell.full}</strong> (${cell.translit}) — "${cell.english}"
            </div>
            ${cell.note ? `<div style="font-size:0.82rem; color:#fde68a; margin-top:0.2rem;">💡 ${cell.note}</div>` : ""}
          </div>
        </div>
        <div class="inspector-pills" dir="rtl">
          ${breakdownBadges}
        </div>
      </div>
    `;
  }

  // Render Conjugation Tables (Present, Past, Future, Imperative)
  function renderConjugationTables(verb) {
    const bMeta = window.BINYANIM_DATA.binyanim[verb.binyan];
    const blocks = [];

    // 1. PRESENT TENSE (הווה / בינוני)
    if (state.activeTense === "all" || state.activeTense === "present") {
      const pCards = PRONOUN_META.present
        .map((pm) => {
          const cell = verb.tables.present[pm.key];
          if (!cell) return "";
          const inspectPayload = encodeURIComponent(
            JSON.stringify({ tenseLabel: `Present · ${pm.label}`, pronoun: pm.hebPronoun, formObj: cell })
          );
          return `
            <div class="conj-card" onclick="window.inspectCell('${inspectPayload}', '${cell.full}')">
              <div class="conj-card-top">
                <span class="pronoun-chip">${pm.hebPronoun}</span>
                <button class="audio-btn" style="width:28px;height:28px;font-size:0.8rem;" onclick="window.speakHebrew('${cell.full}', event)" title="Listen">🔊</button>
              </div>
              <div class="conj-hebrew">${renderMorphParts(cell.parts, cell.full)}</div>
              <div class="conj-translit">${cell.translit}</div>
              <div class="conj-english">${pm.badge} · ${cell.english}</div>
            </div>
          `;
        })
        .join("");

      blocks.push(`
        <div class="tense-section-block">
          <div class="tense-block-header">
            <div class="tense-block-title">
              <span>הֹוֶה · Present Tense (Participle)</span>
              ${pCards ? `<span class="tense-melody-hint">Melody: <strong>${bMeta.vowelMelody.present}</strong></span>` : ""}
            </div>
            ${pCards ? `<span style="font-size:0.8rem; color:var(--text-muted);">
              Tip: Present tense in Hebrew only changes by Gender & Number (4 forms total!)
            </span>` : ""}
          </div>
          ${pCards ? `<div class="present-grid">${pCards}</div>` : `<div class="pedagogy-callout">${verb.presentNote || "Present forms are not available for this verb."}</div>`}
        </div>
      `);
    }

    // Helper for Past & Future grouped by 1st / 2nd / 3rd Person
    function renderPersonTenseBlock(tenseKey, titleHeb, titleEng, melody, tipText) {
      const tbl = verb.tables[tenseKey];
      if (!tbl) return "";

      const groupsHtml = PRONOUN_META.pastGroups
        .map((grp) => {
          const cards = grp.items
            .map((item) => {
              const cell = tbl[item.key];
              if (!cell) return "";
              if (state.spokenOnly && cell.isFormal) return "";
              const inspectPayload = encodeURIComponent(
                JSON.stringify({ tenseLabel: `${titleEng} · ${item.label}`, pronoun: item.hebPronoun, formObj: cell })
              );
              return `
                <div class="conj-card ${cell.isFormal ? "formal-only" : ""}" onclick="window.inspectCell('${inspectPayload}', '${cell.full}')">
                  <div class="conj-card-top">
                    <span class="pronoun-chip">${item.hebPronoun}</span>
                    <span>${item.label}</span>
                    <button class="audio-btn" style="width:28px;height:28px;font-size:0.8rem;" onclick="window.speakHebrew('${cell.full}', event)" title="Listen">🔊</button>
                  </div>
                  <div class="conj-hebrew">${renderMorphParts(cell.parts, cell.full)}</div>
                  <div class="conj-translit">${cell.translit}</div>
                  <div class="conj-english">${cell.english}</div>
                </div>
              `;
            })
            .join("");
          return `
            <div class="person-group">
              <div class="person-group-label">${grp.groupTitle}</div>
              <div class="person-cards-grid">${cards}</div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="tense-section-block">
          <div class="tense-block-header">
            <div class="tense-block-title">
              <span>${titleHeb} · ${titleEng}</span>
              <span class="tense-melody-hint">Melody: <strong>${melody}</strong></span>
            </div>
            <span style="font-size:0.8rem; color:var(--text-muted);">${tipText}</span>
          </div>
          ${groupsHtml}
        </div>
      `;
    }

    // 2. PAST TENSE (עבר)
    if (state.activeTense === "all" || state.activeTense === "past") {
      blocks.push(
        renderPersonTenseBlock(
          "past",
          "עָבָר",
          "Past Tense (Suffixes tell Who)",
          bMeta.vowelMelody.past,
          "Tip: Past tense adds person endings (-תִּי, -תָּ, -תְּ, -נוּ, -תֶּם, -וּ) to the back of the stem."
        )
      );
    }

    return blocks.join("");
  }

  // Render Main Verb Stage
  function renderVerbStage() {
    const verb = getVerbById(state.selectedVerbId);
    const bMeta = window.BINYANIM_DATA.binyanim[verb.binyan];
    const isSaved = state.bookmarks.includes(verb.id);
    const pealimSearchUrl = verb.sourceUrl || `https://www.pealim.com/search/?q=${encodeURIComponent(verb.infinitiveUnvoweled)}`;

    const stageEl = document.getElementById("verb-stage");
    stageEl.innerHTML = `
      <!-- Hero Summary Card -->
      <div class="verb-hero-card">
        <div class="hero-top-row">
          <div>
            <div class="hero-hebrew-block">
              <span class="hero-infinitive">${renderMorphParts(verb.infinitiveParts, verb.infinitive)}</span>
              <button class="audio-btn" onclick="window.speakHebrew('${verb.infinitive}', event)" title="Pronounce in Hebrew">🔊</button>
              <button class="bookmark-btn ${isSaved ? "saved" : ""}" onclick="window.toggleBookmark('${verb.id}')">
                ${isSaved ? "★ Saved in Study Deck" : "☆ Save to Study Deck"}
              </button>
            </div>
            <div class="hero-english">${verb.english}</div>
            <div class="hero-translit">${verb.translit}</div>
          </div>

          <div style="text-align:right; display:flex; flex-direction:column; gap:0.45rem; align-items:flex-end;">
            <span style="background:${bMeta.bgLight}; color:${bMeta.color}; border:1.5px solid ${bMeta.borderLight}; padding:0.4rem 0.9rem; border-radius:10px; font-weight:700; font-size:0.95rem;">
              בִּנְיַן ${bMeta.hebrew} · ${bMeta.name} (${bMeta.role})
            </span>
            <a href="${pealimSearchUrl}" target="_blank" rel="noopener" style="font-size:0.78rem; color:var(--text-muted); text-decoration:none;">
              ↗ Verify / compare on Pealim.com
            </a>
          </div>
        </div>

        <div class="hero-badges">
          <div class="meta-pill">
            <span class="meta-pill-label">Root (שׁוֹרֶשׁ):</span>
            <span class="meta-pill-val" style="color:var(--morph-root); font-size:1rem;">${verb.root}</span>
          </div>
          <div class="meta-pill">
            <span class="meta-pill-label">Voice:</span>
            <span class="meta-pill-val">${bMeta.voice}</span>
          </div>
          <div class="meta-pill">
            <span class="meta-pill-label">Preposition:</span>
            <span class="meta-pill-val">${verb.preposition}</span>
          </div>
          <div class="meta-pill">
            <span class="meta-pill-label">Pattern Class (גִּזְרָה):</span>
            <span class="meta-pill-val">${verb.gizrah}</span>
          </div>
        </div>

        <div class="pedagogy-callout">
          <div><strong>💡 How this verb works (${bMeta.name}):</strong> ${verb.gizrahTip}</div>
          ${verb.semanticNote ? `<div><strong>🔗 Root Connection:</strong> ${verb.semanticNote}</div>` : ""}
        </div>

        ${verb.vocabularyOnly || verb.verifiedForms ? "" : renderAnatomyInspector(verb)}
      </div>

      <!-- Same Shoresh Across the 7 Binyanim -->
      ${renderRootFamilyStrip(verb)}

      <!-- Conjugation Tables with Focused Tense Tabs -->
      ${verb.vocabularyOnly ? `<div class="pedagogy-callout">Conjugations are not yet available for this verb. Use the reference link above to check its forms.</div>` : `
      <div class="conjugation-container">
        <div class="tense-nav-bar">
          <div class="tense-tabs">
            <button class="tense-tab ${state.activeTense === "all" ? "active" : ""}" onclick="window.setTense('all')">All Tenses Overview</button>
            <button class="tense-tab ${state.activeTense === "present" ? "active" : ""}" onclick="window.setTense('present')">הֹוֶה · Present${Object.keys(verb.tables.present || {}).length ? " (4)" : ""}</button>
            <button class="tense-tab ${state.activeTense === "past" ? "active" : ""}" onclick="window.setTense('past')">עָבָר · Past</button>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            ${state.spokenOnly ? "Showing Everyday Spoken Forms (archaic f.pl. hidden)" : "Showing Full Academic Paradigm"}
          </div>
        </div>

        ${renderConjugationTables(verb)}
      </div>`}

      <!-- Real-Life Context Examples -->
      ${
        verb.examples && verb.examples.length
          ? `
        <div class="examples-card">
          <h3 style="font-size:0.98rem; margin-bottom:0.6rem;">💬 Real-World Context Sentences</h3>
          ${verb.examples
            .map(
              (ex) => `
            <div class="example-row">
              <div>
                <div style="font-weight:600; font-size:0.92rem;">${ex.en}</div>
                <div style="font-size:0.82rem; color:var(--text-muted); font-family:monospace;">${ex.tr}</div>
              </div>
              <div style="display:flex; align-items:center; gap:0.65rem;">
                <span class="ex-hebrew">${state.showNikud ? ex.he : window.stripNikud(ex.he)}</span>
                <button class="audio-btn" style="width:32px;height:32px;" onclick="window.speakHebrew('${ex.he}', event)">🔊</button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    `;
  }

  // Render View 2: The 7 Binyanim Map & Interactive Root Transformer
  function renderBinyanimMapView() {
    const container = document.getElementById("binyanim-view-content");
    const bData = window.BINYANIM_DATA;
    const activeFam = bData.rootFamilies[state.selectedRootFamilyIdx] || bData.rootFamilies[0];

    const rootPillsHtml = bData.rootFamilies
      .map(
        (fam, idx) => `
      <button class="root-pill-btn ${idx === state.selectedRootFamilyIdx ? "active" : ""}" onclick="window.selectRootFamily(${idx})">
        <span style="font-family:var(--font-serif-hebrew); font-size:1.15rem;">${fam.root}</span>
        <span style="font-weight:500; font-size:0.82rem; opacity:0.9;">(${fam.coreMeaning})</span>
      </button>
    `
      )
      .join("");

    const binyanOrder = ["paal", "nifal", "piel", "pual", "hifil", "hufal", "hitpael"];
    const transformerCards = binyanOrder
      .map((bKey) => {
        const bMeta = bData.binyanim[bKey];
        const member = activeFam.members[bKey];
        if (!member) {
          return `
            <div class="sibling-card" style="opacity:0.45; cursor:default;">
              <div class="sib-binyan"><span>${bMeta.name} (${bMeta.hebrew})</span></div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.4rem;">Not commonly used with root ${activeFam.root}</div>
            </div>
          `;
        }
        const clickAction = member.verbId
          ? `window.selectVerb('${member.verbId}'); window.switchView('explorer');`
          : `window.synthesizeAndSelect('${activeFam.root}', '${bKey}', '${member.meaning.replace(/'/g, "")}'); window.switchView('explorer');`;
        return `
          <div class="sibling-card" style="background:${bMeta.bgLight}; border-color:${bMeta.borderLight};" onclick="${clickAction}">
            <div class="sib-binyan" style="color:${bMeta.color};">
              <span>${bMeta.name} · ${bMeta.hebrew}</span>
              <span>${bMeta.role}</span>
            </div>
            <div class="sib-hebrew" style="color:${bMeta.color}; font-size:1.6rem;">${member.hebrew}</div>
            <div style="font-size:0.8rem; font-family:monospace; color:var(--text-secondary);">${member.translit}</div>
            <div class="sib-meaning" style="font-weight:600; color:var(--text-primary); margin-top:0.2rem;">${member.meaning}</div>
            <div style="font-size:0.72rem; color:${bMeta.color}; margin-top:0.3rem; font-weight:600;">→ Open full table</div>
          </div>
        `;
      })
      .join("");

    const floorsHtml = bData.overview.pairs
      .map((floor) => {
        const act = bData.binyanim[floor.active];
        const pas = floor.passive ? bData.binyanim[floor.passive] : null;
        const renderArchCard = (b) => `
          <div class="binyan-arch-card" style="border-color:${b.borderLight}; background:${b.bgLight};">
            <div class="bac-top">
              <div>
                <span class="bac-hebrew" style="color:${b.color};">${b.hebrew}</span>
                <strong style="font-size:1.15rem; margin-left:0.5rem;">${b.name}</strong>
              </div>
              <span class="bac-voice-badge" style="color:${b.color};">${b.role}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-primary);"><strong>How to Spot It:</strong> ${b.hallmark}</div>
            <div class="bac-melody-table">
              <div><strong>Past:</strong> ${b.vowelMelody.past}</div>
              <div><strong>Present:</strong> ${b.vowelMelody.present}</div>
              <div><strong>Infinitive:</strong> ${b.vowelMelody.infinitive}</div>
            </div>
            <div style="font-size:0.82rem; color:var(--text-secondary);">💡 <em>${b.pedagogyTip}</em></div>
          </div>
        `;
        return `
          <div class="floor-row">
            <div class="floor-header">
              <div class="floor-title">${floor.label}</div>
              <div class="floor-desc">${floor.description}</div>
            </div>
            <div class="floor-pair-grid">
              ${renderArchCard(act)}
              ${pas ? renderArchCard(pas) : ""}
            </div>
          </div>
        `;
      })
      .join("");

    const gizrotHtml = bData.irregularitiesGuide
      .map(
        (g) => `
      <div class="floor-row" style="padding:1rem 1.2rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; flex-wrap:wrap; gap:0.5rem;">
          <strong style="font-size:0.98rem; color:var(--accent-primary);">${g.title}</strong>
          <span class="vli-root-badge" style="font-weight:700;">${g.badge}</span>
        </div>
        <div style="font-size:0.88rem; font-weight:600; margin-bottom:0.25rem;">${g.summary}</div>
        <div style="font-size:0.84rem; color:var(--text-secondary);">${g.detail}</div>
      </div>
    `
      )
      .join("");

    container.innerHTML = `
      <div class="binyanim-hero">
        <h2 style="font-size:1.5rem; margin-bottom:0.35rem;">🏛️ ${bData.overview.title}</h2>
        <p style="color:var(--text-secondary); font-size:0.95rem; max-width:900px;">${bData.overview.subtitle}</p>
      </div>

      <!-- Interactive Root Transformer -->
      <div class="transformer-box">
        <h3 style="font-size:1.15rem;">🧪 Interactive Root Transformer: Drop One Root Into All 7 Buildings</h3>
        <p style="font-size:0.86rem; color:var(--text-secondary);">
          Select a 3-letter root below to see how each Binyan reshapes its voice, vowel melody, and meaning:
        </p>
        <div class="root-selector-bar">${rootPillsHtml}</div>
        <div style="background:var(--bg-page); padding:0.75rem 1rem; border-radius:10px; margin-bottom:0.9rem; font-size:0.88rem;">
          <strong>Root ${activeFam.root} (${activeFam.coreMeaning}):</strong> ${activeFam.explanation}
        </div>
        <div class="strip-cards">${transformerCards}</div>
      </div>

      <!-- The 3 Active/Passive Floors + Reflexive Roof -->
      <h3 style="font-size:1.2rem; margin-bottom:0.85rem;">📐 The 3 Active–Passive Pairs + 1 Reflexive Roof</h3>
      <div class="architecture-floors">${floorsHtml}</div>

      <!-- Demystifying Weak & Guttural Roots -->
      <h3 style="font-size:1.2rem; margin-bottom:0.85rem;">🧩 Why Roots Sometimes Change Vowels (Gizrot Without the Scary Jargon)</h3>
      <div class="architecture-floors">${gizrotHtml}</div>
    `;
  }

  // Render View 3: Pattern Trainer & Active Recall
  function generateQuizQuestion() {
    // The trainer requires both tenses and enough distinct answers, while the
    // explorer can also show legitimately incomplete paradigms such as להיות.
    const verbs = getAllVerbs().filter((verb) => !verb.vocabularyOnly &&
      Object.keys(verb.tables.present || {}).length >= 4 &&
      Object.keys(verb.tables.past || {}).length >= 4);
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    const bMeta = window.BINYANIM_DATA.binyanim[verb.binyan];

    const tensePool = ["present", "past"];
    const tKey = tensePool[Math.floor(Math.random() * tensePool.length)];
    const tbl = verb.tables[tKey];
    const entries = Object.entries(tbl).filter(([, c]) => !c.isFormal);
    const [pKey, targetCell] = entries[Math.floor(Math.random() * entries.length)];

    if (state.quizMode === "spot-binyan") {
      const allBinyanim = Object.values(window.BINYANIM_DATA.binyanim);
      const distractors = allBinyanim
        .filter((b) => b.id !== verb.binyan)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [bMeta, ...distractors].sort(() => Math.random() - 0.5);

      state.quizQuestion = {
        promptTitle: "Spot the Root & Binyan (Reverse-Engineer)",
        bigHebrew: renderMorphParts(targetCell.parts, targetCell.full),
        rawHebrew: targetCell.full,
        subtitle: `Meaning: "${targetCell.english}" (${targetCell.translit}) — Root: ${verb.root}`,
        correctId: bMeta.id,
        explanation: `${targetCell.full} belongs to Binyan ${bMeta.name} (${bMeta.hebrew}) from root ${verb.root}. ${bMeta.hallmark}`,
        options: options.map((o) => ({
          id: o.id,
          label: `${o.hebrew} · ${o.name} (${o.role})`
        }))
      };
    } else if (state.quizMode === "conjugate") {
      const distractors = entries
        .filter(([k]) => k !== pKey)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(([, c]) => c);
      const options = [targetCell, ...distractors].sort(() => Math.random() - 0.5);

      state.quizQuestion = {
        promptTitle: `Conjugate in ${tKey.toUpperCase()} Tense`,
        bigHebrew: verb.infinitive,
        rawHebrew: targetCell.full,
        subtitle: `How do you say: "${targetCell.english}" (Root ${verb.root} · ${bMeta.name})?`,
        correctId: targetCell.full,
        explanation: `Correct! "${targetCell.english}" is ${targetCell.full} (${targetCell.translit}).`,
        options: options.map((o) => ({
          id: o.full,
          label: o.full
        }))
      };
    } else {
      // street-read (No nikud!)
      const otherVerbs = verbs
        .filter((v) => v.id !== verb.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [
        { id: "correct", label: `${targetCell.translit} — "${targetCell.english}"` },
        ...otherVerbs.map((ov, i) => ({
          id: `wrong_${i}`,
          label: `${ov.tables.present.ms.translit} — "${ov.tables.present.ms.english}"`
        }))
      ].sort(() => Math.random() - 0.5);

      state.quizQuestion = {
        promptTitle: "Street Hebrew Reader (Read Without Nikud!)",
        bigHebrew: targetCell.unvoweled,
        rawHebrew: targetCell.full,
        subtitle: `Hint: Root ${verb.root} in Binyan ${bMeta.name}`,
        correctId: "correct",
        explanation: `With Nikud: ${targetCell.full} (${targetCell.translit}) — "${targetCell.english}".`,
        options
      };
    }
  }

  function renderTrainerView() {
    if (!state.quizQuestion) generateQuizQuestion();
    const q = state.quizQuestion;
    const container = document.getElementById("trainer-view-content");

    container.innerHTML = `
      <div class="trainer-layout">
        <div class="trainer-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem;">
            <h2 style="font-size:1.35rem;">🎯 Active Pattern Trainer</h2>
            <span class="meta-pill">Score: <strong>${state.quizScore.correct} / ${state.quizScore.total}</strong></span>
          </div>

          <div class="quiz-mode-pills">
            <button class="lens-btn ${state.quizMode === "spot-binyan" ? "active" : ""}" onclick="window.setQuizMode('spot-binyan')">
              1. Spot the Binyan
            </button>
            <button class="lens-btn ${state.quizMode === "conjugate" ? "active" : ""}" onclick="window.setQuizMode('conjugate')">
              2. Build the Conjugation
            </button>
            <button class="lens-btn ${state.quizMode === "street-read" ? "active" : ""}" onclick="window.setQuizMode('street-read')">
              3. Read Without Nikud (כתיב מלא)
            </button>
          </div>

          <div class="quiz-prompt-box">
            <div style="font-size:0.82rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
              ${q.promptTitle}
            </div>
            <div style="font-size:3rem; font-family:var(--font-serif-hebrew); font-weight:700; margin:0.4rem 0;">
              ${q.bigHebrew}
              <button class="audio-btn" onclick="window.speakHebrew('${q.rawHebrew}', event)" title="Hear pronunciation">🔊</button>
            </div>
            <div style="font-size:1rem; color:var(--text-secondary);">${q.subtitle}</div>
          </div>

          <div class="quiz-options-grid" id="quiz-options-box">
            ${q.options
              .map(
                (opt) => `
              <button class="quiz-option-btn" onclick="window.answerQuiz('${opt.id.replace(/'/g, "\\'")}', this)">
                ${opt.label}
              </button>
            `
              )
              .join("")}
          </div>

          <div id="quiz-feedback-box" style="margin-top:1.1rem; display:none;"></div>
        </div>
      </div>
    `;
  }

  window.answerQuiz = function (chosenId, btnEl) {
    const q = state.quizQuestion;
    if (q.answered) return;
    q.answered = true;
    state.quizScore.total += 1;
    const isCorrect = chosenId === q.correctId;
    if (isCorrect) {
      state.quizScore.correct += 1;
      btnEl.classList.add("correct");
    } else {
      btnEl.classList.add("wrong");
    }
    window.speakHebrew(q.rawHebrew);
    const fb = document.getElementById("quiz-feedback-box");
    fb.style.display = "block";
    fb.innerHTML = `
      <div class="pedagogy-callout" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.8rem;">
        <div>
          <strong>${isCorrect ? "✅ Spot on!" : "💡 Keep going!"}</strong> ${q.explanation}
        </div>
        <button class="primary-btn" onclick="window.nextQuizQuestion()">Next Question →</button>
      </div>
    `;
  };

  window.nextQuizQuestion = function () {
    generateQuizQuestion();
    renderTrainerView();
  };

  window.setQuizMode = function (mode) {
    state.quizMode = mode;
    generateQuizQuestion();
    renderTrainerView();
  };

  // Helper: Look up an English meaning in ENGLISH_ROOT_LEXICON
  function findLexiconByEnglish(englishInput) {
    if (!englishInput || !window.ENGLISH_ROOT_LEXICON) return null;
    const clean = englishInput
      .toLowerCase()
      .replace(/^to\s+/i, "")
      .trim();
    if (!clean) return null;
    // Exact match first
    let match = window.ENGLISH_ROOT_LEXICON.find(
      (item) =>
        item.english.toLowerCase() === clean ||
        item.meaning.toLowerCase() === clean ||
        item.meaning.toLowerCase() === `to ${clean}`
    );
    if (match) return match;
    // Word-boundary match
    match = window.ENGLISH_ROOT_LEXICON.find((item) => {
      const words = item.english.toLowerCase().split(/[\/,\s]+/);
      return words.includes(clean);
    });
    return match || null;
  }

  // Helper: Build a preview verb object from (rawRoot, binyan, meaning)
  function buildPreviewVerb(rawRoot, binyan, meaning) {
    const letters = window.stripNikud(rawRoot || "").replace(/[^א-ת]/g, "").split("");
    if (letters.length < 3) return null;
    const rootFormatted = `${letters[0]}-${letters[1]}-${letters[2]}`;
    const bMeta = window.BINYANIM_DATA.binyanim[binyan] || window.BINYANIM_DATA.binyanim.paal;
    const lexMatch = (window.ENGLISH_ROOT_LEXICON || []).find(
      (item) => item.root === rootFormatted && item.binyan === binyan
    );
    const rootTranslit =
      lexMatch && Array.isArray(lexMatch.tr)
        ? lexMatch.tr
        : window.autoTranslitRoot(rootFormatted);
    const infSpec = window.buildInfinitiveSpec(rootFormatted, binyan, rootTranslit);
    const gizrah = window.detectGizrah(rootFormatted, binyan);
    const finalMeaning =
      meaning && meaning.trim()
        ? meaning.trim()
        : lexMatch
        ? lexMatch.meaning
        : `to act (${rootFormatted})`;
    const shortMeaning = finalMeaning
      .replace(/^to\s+/i, "")
      .split(/[\/,]/)[0]
      .trim();

    const verbObj = window.createVerb({
      id: "preview_temp",
      infinitive: infSpec.infinitive,
      infinitiveParts: infSpec.infinitiveParts,
      translit: infSpec.translit,
      english: finalMeaning,
      shortMeaning: shortMeaning || "act",
      pastMeaning: lexMatch ? lexMatch.past : undefined,
      root: rootFormatted,
      rootTranslit,
      binyan,
      gizrah: gizrah.label,
      semanticNote: `${gizrah.note} Built from root ${rootFormatted} in Binyan ${bMeta.name} (${bMeta.hebrew}).`
    });
    return { verbObj, gizrah, lexMatch, rootFormatted };
  }

  // Render the live preview box inside the Workshop
  function renderWorkshopLivePreview() {
    const previewContainer = document.getElementById("workshop-live-preview");
    if (!previewContainer) return;

    const rootInput = document.getElementById("custom-root");
    const binyanSelect = document.getElementById("custom-binyan");
    const meaningInput = document.getElementById("custom-meaning");
    if (!rootInput || !binyanSelect || !meaningInput) return;

    const rawRoot = rootInput.value.trim();
    const binyan = binyanSelect.value;
    const meaning = meaningInput.value.trim();

    // Check if the English meaning matches a DIFFERENT known root in ENGLISH_ROOT_LEXICON
    const englishLexMatch = findLexiconByEnglish(meaning);
    const preview = buildPreviewVerb(rawRoot, binyan, meaning);

    if (!preview) {
      previewContainer.innerHTML = `
        <div style="padding:1rem; border-radius:var(--radius-md); background:var(--bg-subtle); border:1px dashed var(--border-strong); color:var(--text-muted); font-size:0.88rem;">
          Type any <strong>3 Hebrew root letters</strong> (like <code>ר-ו-ץ</code> or <code>ב-ש-ל</code>) OR type an <strong>English verb</strong> (like <code>run</code>, <code>cook</code>, <code>fly</code>, <code>wait</code>) to preview its conjugation table before saving.
        </div>
      `;
      return;
    }

    const { verbObj, gizrah, rootFormatted } = preview;
    const bMeta = window.BINYANIM_DATA.binyanim[binyan];

    let mismatchBanner = "";
    if (
      englishLexMatch &&
      (englishLexMatch.root !== rootFormatted || englishLexMatch.binyan !== binyan)
    ) {
      const safeMeaning = englishLexMatch.meaning.replace(/'/g, "\\'");
      mismatchBanner = `
        <div style="margin-bottom:0.85rem; padding:0.75rem 1rem; border-radius:var(--radius-md); background:#fffbeb; border:1.5px solid #f59e0b; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap;">
          <div style="font-size:0.85rem; color:#92400e;">
            ⚠️ <strong>Root / Meaning Mismatch Detected:</strong> You typed <strong>"${meaning}"</strong>, which in Hebrew is <strong>${englishLexMatch.infinitive}</strong> (Root <strong>${englishLexMatch.root}</strong> in <strong>${window.BINYANIM_DATA.binyanim[englishLexMatch.binyan].name}</strong>), not <code>${rootFormatted}</code>!
          </div>
          <button type="button" class="primary-btn" style="background:#d97706; font-size:0.78rem; padding:0.4rem 0.75rem;"
                  onclick="window.applyWorkshopLexiconItem('${englishLexMatch.root}', '${englishLexMatch.binyan}', '${safeMeaning}')">
            ✓ Switch to ${englishLexMatch.root} (${englishLexMatch.infinitive})
          </button>
        </div>
      `;
    }

    previewContainer.innerHTML = `
      ${mismatchBanner}
      <div style="padding:1rem 1.15rem; border-radius:var(--radius-md); background:var(--bg-subtle); border:1px solid var(--border-subtle);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.65rem;">
          <div>
            <span style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);">
              Live Conjugation Preview
            </span>
            <div style="display:flex; align-items:baseline; flex-wrap:wrap; gap:0.65rem; margin-top:0.15rem;">
              <span style="font-family:var(--font-hebrew); font-size:1.65rem; font-weight:700; direction:rtl;">
                ${renderMorphParts(verbObj.infinitiveParts, verbObj.infinitive)}
              </span>
              <span style="font-weight:700; font-size:1rem; color:var(--text-primary);">${verbObj.english}</span>
              <span style="font-size:0.85rem; color:var(--text-muted);">(${verbObj.translit})</span>
            </div>
          </div>
          <div style="display:flex; gap:0.45rem; flex-wrap:wrap;">
            <span class="meta-pill" style="color:${bMeta.color}; border-color:${bMeta.color}; font-weight:700;">
              ${bMeta.name} (${bMeta.hebrew})
            </span>
            <span class="meta-pill">שורש ${rootFormatted}</span>
            <span class="meta-pill" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0;">
              🧬 ${gizrah.label}
            </span>
          </div>
        </div>

        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.75rem;">
          ${gizrah.note}
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(min(175px, 100%), 1fr)); gap:0.6rem;">
          <div style="background:var(--bg-surface); padding:0.55rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
            <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">PRESENT (הוּא / הִיא)</div>
            <div style="font-family:var(--font-hebrew); font-size:1.2rem; font-weight:700; direction:rtl; margin-top:0.1rem;">
              ${renderMorphParts(verbObj.tables.present.ms.parts, verbObj.tables.present.ms.full)} /
              ${renderMorphParts(verbObj.tables.present.fs.parts, verbObj.tables.present.fs.full)}
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">
              ${verbObj.tables.present.ms.translit} / ${verbObj.tables.present.fs.translit}
            </div>
          </div>

          <div style="background:var(--bg-surface); padding:0.55rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
            <div style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">PAST (אֲנִי / הוּא)</div>
            <div style="font-family:var(--font-hebrew); font-size:1.2rem; font-weight:700; direction:rtl; margin-top:0.1rem;">
              ${renderMorphParts(verbObj.tables.past["1s"].parts, verbObj.tables.past["1s"].full)} /
              ${renderMorphParts(verbObj.tables.past["3ms"].parts, verbObj.tables.past["3ms"].full)}
            </div>
            <div style="font-size:0.75rem; color:var(--text-secondary);">
              ${verbObj.tables.past["1s"].translit} / ${verbObj.tables.past["3ms"].translit}
            </div>
          </div>


        </div>
      </div>
    `;
  }

  // Open Workshop pre-populated with a search query
  window.openWorkshopWithQuery = function (query) {
    state.workshopSearch = query || "";
    const match = findLexiconByEnglish(query);
    if (match) {
      state.workshopRoot = match.root;
      state.workshopBinyan = match.binyan;
      state.workshopMeaning = match.meaning;
    }
    window.switchView("notebook");
  };

  // Apply a lexicon item directly into the Workshop form inputs
  window.applyWorkshopLexiconItem = function (root, binyan, meaning) {
    state.workshopRoot = root;
    state.workshopBinyan = binyan;
    state.workshopMeaning = meaning;
    const rootInput = document.getElementById("custom-root");
    const binyanSelect = document.getElementById("custom-binyan");
    const meaningInput = document.getElementById("custom-meaning");
    if (rootInput) {
      rootInput.value = root;
      rootInput.dataset.userEdited = "true";
    }
    if (binyanSelect) binyanSelect.value = binyan;
    if (meaningInput) meaningInput.value = meaning;
    renderWorkshopLivePreview();
  };

  // Handle typing in the Workshop inputs
  window.onWorkshopFieldInput = function (sourceField) {
    const rootInput = document.getElementById("custom-root");
    const binyanSelect = document.getElementById("custom-binyan");
    const meaningInput = document.getElementById("custom-meaning");
    if (!rootInput || !binyanSelect || !meaningInput) return;

    if (sourceField === "root") {
      rootInput.dataset.userEdited = "true";
      // If the typed root + binyan matches a lexicon entry and meaning wasn't manually edited, sync meaning
      const letters = window.stripNikud(rootInput.value).replace(/[^א-ת]/g, "").split("");
      if (letters.length >= 3) {
        const formatted = `${letters[0]}-${letters[1]}-${letters[2]}`;
        const lex = (window.ENGLISH_ROOT_LEXICON || []).find(
          (i) => i.root === formatted && i.binyan === binyanSelect.value
        );
        if (lex && meaningInput.dataset.userEdited !== "true") {
          meaningInput.value = lex.meaning;
        }
      }
    } else if (sourceField === "meaning") {
      meaningInput.dataset.userEdited = "true";
      // Auto-sync Root & Binyan if the typed English verb matches our lexicon!
      const match = findLexiconByEnglish(meaningInput.value);
      if (match) {
        rootInput.value = match.root;
        binyanSelect.value = match.binyan;
      }
    } else if (sourceField === "binyan") {
      const letters = window.stripNikud(rootInput.value).replace(/[^א-ת]/g, "").split("");
      if (letters.length >= 3) {
        const formatted = `${letters[0]}-${letters[1]}-${letters[2]}`;
        const lex = (window.ENGLISH_ROOT_LEXICON || []).find(
          (i) => i.root === formatted && i.binyan === binyanSelect.value
        );
        if (lex) {
          meaningInput.value = lex.meaning;
        }
      }
    }

    state.workshopRoot = rootInput.value;
    state.workshopBinyan = binyanSelect.value;
    state.workshopMeaning = meaningInput.value;
    renderWorkshopLivePreview();
  };

  // Delete a custom verb
  window.deleteCustomVerb = function (verbId, ev) {
    if (ev) ev.stopPropagation();
    state.customVerbs = state.customVerbs.filter((v) => v.id !== verbId);
    localStorage.setItem("hebrew_custom_verbs_v2", JSON.stringify(state.customVerbs));
    state.bookmarks = state.bookmarks.filter((id) => id !== verbId);
    localStorage.setItem("hebrew_bookmarks_v2", JSON.stringify(state.bookmarks));
    if (state.selectedVerbId === verbId) {
      state.selectedVerbId = "larutz";
    }
    renderSidebarList();
    if (state.activeView === "notebook") renderNotebookView();
  };

  // Filter quick lexicon picker inside Workshop
  window.onWorkshopQuickSearch = function (val) {
    state.workshopSearch = val;
    const gridEl = document.getElementById("workshop-lexicon-grid");
    if (!gridEl) return;
    gridEl.innerHTML = renderWorkshopLexiconCards(val);
  };

  function renderWorkshopLexiconCards(query) {
    const raw = (query || "").trim().toLowerCase();
    const list = window.ENGLISH_ROOT_LEXICON || [];
    const filtered = raw
      ? list.filter(
          (item) =>
            item.english.toLowerCase().includes(raw) ||
            item.meaning.toLowerCase().includes(raw) ||
            item.root.includes(raw) ||
            item.root.replace(/-/g, "").includes(raw) ||
            window.stripNikud(item.infinitive).includes(window.stripNikud(raw))
        )
      : list.slice(0, 12);

    if (filtered.length === 0) {
      return `<div style="grid-column:1/-1; color:var(--text-muted); font-size:0.85rem;">No quick-lexicon match for "${query}". You can still enter any 3-letter Hebrew root in Step 2 below!</div>`;
    }

    return filtered
      .slice(0, 16)
      .map((item) => {
        const bMeta = window.BINYANIM_DATA.binyanim[item.binyan];
        const safeMeaning = item.meaning.replace(/'/g, "\\'");
        const safePast = (item.past || "").replace(/'/g, "\\'");
        const trJson = JSON.stringify(item.tr || window.autoTranslitRoot(item.root)).replace(
          /"/g,
          "&quot;"
        );
        return `
          <div class="sibling-card" style="display:flex; flex-direction:column; justify-content:space-between;"
               onclick="window.synthesizeAndSelect('${item.root}', '${item.binyan}', '${safeMeaning}', ${trJson}, '${safePast}')">
            <div>
              <div class="sib-binyan" style="color:${bMeta.color};">
                <span>${bMeta.name}</span>
                <span>שורש ${item.root}</span>
              </div>
              <div class="sib-hebrew" style="font-size:1.35rem; margin:0.15rem 0;">
                ${state.showNikud ? item.infinitive : window.stripNikud(item.infinitive)}
              </div>
              <div style="font-weight:700; font-size:0.88rem; color:var(--text-primary);">${item.meaning}</div>
            </div>
            <div style="margin-top:0.5rem; padding-top:0.4rem; border-top:1px dashed var(--border-subtle); display:flex; justify-content:space-between; align-items:center; font-size:0.74rem;">
              <span style="color:#0f766e; font-weight:700;">⚡ Click to Open</span>
              <button type="button" class="example-speak-btn" style="font-size:0.72rem; padding:0.15rem 0.45rem;"
                      onclick="event.stopPropagation(); window.applyWorkshopLexiconItem('${item.root}', '${item.binyan}', '${safeMeaning}')">
                Load in Form ↓
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // Render View 4: My Study Deck & Custom Root Workshop
  function renderNotebookView() {
    const container = document.getElementById("notebook-view-content");
    const savedVerbs = getAllVerbs().filter((v) => state.bookmarks.includes(v.id));

    const savedCards = savedVerbs.length
      ? savedVerbs
          .map((v) => {
            const bMeta = window.BINYANIM_DATA.binyanim[v.binyan];
            const isCustom = String(v.id).startsWith("custom_") || String(v.id).startsWith("synth_");
            return `
              <div class="sibling-card" onclick="window.selectVerb('${v.id}'); window.switchView('explorer');">
                <div class="sib-binyan" style="color:${bMeta.color};">
                  <span>${bMeta.name} (${bMeta.hebrew})</span>
                  <span>שורש ${v.root}</span>
                </div>
                <div class="sib-hebrew">${renderMorphParts(v.infinitiveParts, v.infinitive)}</div>
                <div style="font-weight:700; font-size:0.9rem;">${v.english}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem;">
                  <span style="font-size:0.78rem; color:var(--text-muted);">${v.translit}</span>
                  ${
                    isCustom
                      ? `<button type="button" class="example-speak-btn" style="font-size:0.7rem; color:#dc2626;"
                                 onclick="window.deleteCustomVerb('${v.id}', event)" title="Remove custom verb">✕ Remove</button>`
                      : ""
                  }
                </div>
              </div>
            `;
          })
          .join("")
      : `<p style="color:var(--text-muted);">No starred verbs yet. Click "☆ Save to Study Deck" on any verb in the Explorer!</p>`;

    const binyanOptions = ["paal", "nifal", "piel", "pual", "hifil", "hufal", "hitpael"]
      .map((bKey) => {
        const b = window.BINYANIM_DATA.binyanim[bKey];
        const sel = state.workshopBinyan === bKey ? "selected" : "";
        return `<option value="${bKey}" ${sel}>${b.name} (${b.hebrew} — ${b.voice})</option>`;
      })
      .join("");

    container.innerHTML = `
      <div class="binyanim-hero">
        <h2 style="font-size:1.45rem; margin-bottom:0.35rem;">📓 My Study Deck & Smart Verb Workshop (הַמַּחְבֶּרֶת שֶׁלִּי)</h2>
        <p style="color:var(--text-secondary); font-size:0.92rem;">
          Your starred verbs are saved locally in your browser. Want to add a new verb? Search by <strong>English meaning</strong> below (e.g. <em>run, fly, cook, wait, pay, sleep</em>) so we automatically pair it with the right Hebrew root &amp; Binyan, or enter any 3-letter root directly!
        </p>

        <h3 style="margin-top:1.25rem; margin-bottom:0.75rem; font-size:1.05rem;">★ Starred &amp; Custom Study Verbs (${savedVerbs.length})</h3>
        <div class="strip-cards">${savedCards}</div>
      </div>

      <div class="transformer-box" style="margin-bottom:1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.6rem;">
          <h3 style="font-size:1.15rem; margin:0;">⚡ Step 1: Instant English-to-Hebrew Verb Finder (50+ Verbs)</h3>
          <span style="font-size:0.78rem; color:var(--text-muted);">Supports Hollow (ע״ו like ר-ו-ץ "run"), Lamed-He (ל״ה), Guttural &amp; Regular roots</span>
        </div>
        <p style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:0.75rem;">
          Not sure what the 3 Hebrew root letters are for an English verb? Type the English verb here (e.g. <strong>run</strong>, <strong>fly</strong>, <strong>cook</strong>, <strong>wait</strong>, <strong>buy</strong>, <strong>sleep</strong>, <strong>pay</strong>, <strong>drive</strong>) and click any card to open its full conjugation table:
        </p>
        <input
          type="text"
          id="workshop-quick-search"
          placeholder="Search English verb or Hebrew root (e.g. run, fly, cook, pay, sleep, ר-ו-ץ)..."
          value="${(state.workshopSearch || "").replace(/"/g, "&quot;")}"
          oninput="window.onWorkshopQuickSearch(this.value)"
          style="width:100%; padding:0.65rem 0.9rem; border-radius:var(--radius-md); border:1.5px solid var(--border-strong); font-size:0.95rem; margin-bottom:0.9rem; background:var(--bg-surface);"
        />
        <div id="workshop-lexicon-grid" class="strip-cards">
          ${renderWorkshopLexiconCards(state.workshopSearch)}
        </div>
      </div>

      <div class="transformer-box">
        <h3 style="font-size:1.15rem;">🛠️ Step 2: Custom 3-Letter Root Builder (With Live Morphological Preview)</h3>
        <p style="font-size:0.86rem; color:var(--text-secondary); margin-bottom:0.85rem;">
          Type an <strong>English Meaning</strong> (it will automatically look up the matching Hebrew root if known!) or enter any <strong>3-Letter Root (שׁוֹרֶשׁ)</strong> + <strong>Binyan</strong>. Check the live preview below before saving:
        </p>
        <form class="workshop-form" onsubmit="window.handleCustomVerbSubmit(event)" style="margin-bottom:1rem;">
          <div class="form-group">
            <label>English Meaning (auto-matches known roots!)</label>
            <input
              type="text"
              id="custom-meaning"
              placeholder="e.g. to run, to dance, to cook..."
              value="${(state.workshopMeaning || "to dance").replace(/"/g, "&quot;")}"
              oninput="window.onWorkshopFieldInput('meaning')"
              required
            />
          </div>
          <div class="form-group">
            <label>3-Letter Root (שׁוֹרֶשׁ, e.g. ר-ו-ץ, ר-ק-ד, ב-ש-ל)</label>
            <input
              type="text"
              id="custom-root"
              placeholder="ר-ק-ד"
              value="${(state.workshopRoot || "ר-ק-ד").replace(/"/g, "&quot;")}"
              oninput="window.onWorkshopFieldInput('root')"
              required
            />
          </div>
          <div class="form-group">
            <label>Binyan (בִּנְיָן)</label>
            <select id="custom-binyan" onchange="window.onWorkshopFieldInput('binyan')">
              ${binyanOptions}
            </select>
          </div>
          <button type="submit" class="primary-btn">+ Build &amp; Open Verb</button>
        </form>

        <div id="workshop-live-preview"></div>
      </div>
    `;

    renderWorkshopLivePreview();
  }

  window.handleCustomVerbSubmit = function (e) {
    e.preventDefault();
    const rootInput = document.getElementById("custom-root");
    const binyanSelect = document.getElementById("custom-binyan");
    const meaningInput = document.getElementById("custom-meaning");

    let rawRoot = rootInput.value.trim();
    let binyan = binyanSelect.value;
    const english = meaningInput.value.trim();

    // Safety guard: If the user typed a known English verb (e.g. "run") without manually editing the Hebrew root,
    // or if the root doesn't match and they haven't explicitly overridden it, use the known Hebrew root!
    const englishLexMatch = findLexiconByEnglish(english);
    const lettersCheck = window.stripNikud(rawRoot).replace(/[^א-ת]/g, "").split("");
    const currentFormatted =
      lettersCheck.length >= 3 ? `${lettersCheck[0]}-${lettersCheck[1]}-${lettersCheck[2]}` : "";

    if (
      englishLexMatch &&
      englishLexMatch.root !== currentFormatted &&
      rootInput.dataset.userEdited !== "true"
    ) {
      rawRoot = englishLexMatch.root;
      binyan = englishLexMatch.binyan;
    }

    const letters = window.stripNikud(rawRoot).replace(/[^א-ת]/g, "").split("");
    if (letters.length < 3) {
      alert("Please enter 3 Hebrew root letters (for example: ר-ו-ץ or ר-ק-ד).");
      return;
    }
    const rootFormatted = `${letters[0]}-${letters[1]}-${letters[2]}`;

    // If this exact (root, binyan) already exists in built-in or custom verbs, open it directly!
    const existing = getAllVerbs().find(
      (v) => v.root === rootFormatted && v.binyan === binyan
    );
    if (existing) {
      if (!state.bookmarks.includes(existing.id)) {
        state.bookmarks.push(existing.id);
        localStorage.setItem("hebrew_bookmarks_v2", JSON.stringify(state.bookmarks));
      }
      window.selectVerb(existing.id);
      window.switchView("explorer");
      return;
    }

    const preview = buildPreviewVerb(rootFormatted, binyan, english);
    if (!preview) return;

    const id = `custom_${Date.now()}`;
    const customVerb = {
      ...preview.verbObj,
      id
    };

    state.customVerbs.push(customVerb);
    localStorage.setItem("hebrew_custom_verbs_v2", JSON.stringify(state.customVerbs));
    if (!state.bookmarks.includes(id)) {
      state.bookmarks.push(id);
      localStorage.setItem("hebrew_bookmarks_v2", JSON.stringify(state.bookmarks));
    }
    window.selectVerb(id);
    window.switchView("explorer");
  };

  // Global Actions
  window.selectVerb = function (verbId) {
    state.selectedVerbId = verbId;
    state.inspectedForm = null;
    renderSidebarList();
    renderVerbStage();
  };

  window.setTense = function (tense) {
    state.activeTense = tense;
    renderVerbStage();
  };

  window.setBinyanFilter = function (bKey) {
    state.binyanFilter = bKey;
    document.querySelectorAll(".filter-chip").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.binyan === bKey);
    });
    renderSidebarList();
  };

  window.inspectCell = function (encodedPayload, hebText) {
    state.inspectedForm = JSON.parse(decodeURIComponent(encodedPayload));
    window.speakHebrew(hebText);
    renderVerbStage();
  };

  window.toggleBookmark = function (verbId) {
    const idx = state.bookmarks.indexOf(verbId);
    if (idx >= 0) state.bookmarks.splice(idx, 1);
    else state.bookmarks.push(verbId);
    localStorage.setItem("hebrew_bookmarks_v2", JSON.stringify(state.bookmarks));
    renderVerbStage();
  };

  window.selectRootFamily = function (idx) {
    state.selectedRootFamilyIdx = idx;
    renderBinyanimMapView();
  };

  window.toggleLens = function (lens) {
    if (lens === "colorMorph") {
      state.colorMorph = !state.colorMorph;
      document.body.classList.toggle("color-morph-on", state.colorMorph);
      document.getElementById("lens-morph-btn").classList.toggle("active", state.colorMorph);
    } else if (lens === "spokenOnly") {
      state.spokenOnly = !state.spokenOnly;
      document.getElementById("lens-spoken-btn").classList.toggle("active", state.spokenOnly);
    } else if (lens === "showNikud") {
      state.showNikud = !state.showNikud;
      document.getElementById("lens-nikud-btn").classList.toggle("active", !state.showNikud);
      document.getElementById("lens-nikud-btn").innerHTML = state.showNikud
        ? `<span class="lens-dot"></span> Street Mode (Hide Nikud)`
        : `<span class="lens-dot"></span> Street Mode ON (No Nikud)`;
    }
    renderSidebarList();
    renderVerbStage();
    if (state.activeView === "binyanim") renderBinyanimMapView();
    if (state.activeView === "notebook") renderNotebookView();
  };

  window.switchView = function (viewId) {
    state.activeView = viewId;
    document.querySelectorAll(".nav-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.view === viewId);
    });
    document.querySelectorAll(".view-section").forEach((s) => {
      s.classList.toggle("active", s.id === `view-${viewId}`);
    });
    if (viewId === "explorer") {
      renderSidebarList();
      renderVerbStage();
    } else if (viewId === "binyanim") {
      renderBinyanimMapView();
    } else if (viewId === "trainer") {
      renderTrainerView();
    } else if (viewId === "notebook") {
      renderNotebookView();
    }
  };

  // Initialize on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("verb-search-input");
    const clearBtn = document.getElementById("search-clear-btn");

    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      clearBtn.style.display = state.searchQuery ? "block" : "none";
      renderSidebarList();
    });

    clearBtn.addEventListener("click", () => {
      state.searchQuery = "";
      searchInput.value = "";
      clearBtn.style.display = "none";
      renderSidebarList();
    });

    renderSidebarList();
    renderVerbStage();
  });
})();
