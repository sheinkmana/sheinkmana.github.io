// Curated Hebrew Verbs Database + Dynamic Morphological Generator across all 7 Binyanim
// Each verb form includes morphological segmentation (prefix / root / suffix) for visual learning.

(function () {
  // Strip Hebrew nikud for unvoweled "Street Mode" (Ktiv Male / Bli Nikud) and search
  function stripNikud(str) {
    if (!str) return "";
    return str.replace(/[\u0591-\u05C7]/g, "");
  }

  // Convert final Hebrew letters (אותיות סופיות) when a letter is in final position vs. medial position
  const TO_FINAL = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };
  const FROM_FINAL = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
  function asFinal(letter) {
    const base = stripNikud(letter);
    return TO_FINAL[base] ? letter.replace(base, TO_FINAL[base]) : letter;
  }
  function asMedial(letter) {
    const base = stripNikud(letter);
    return FROM_FINAL[base] ? letter.replace(base, FROM_FINAL[base]) : letter;
  }

  // Automatic Hebrew consonant -> Latin phonetic mapping so users never have to type "sh-m-r" manually!
  const LETTER_TO_LATIN = {
    "א": "'", "ב": "v", "ג": "g", "ד": "d", "ה": "h", "ו": "v", "ז": "z",
    "ח": "ch", "ט": "t", "י": "y", "כ": "kh", "ך": "kh", "ל": "l", "מ": "m", "ם": "m",
    "נ": "n", "ן": "n", "ס": "s", "ע": "'", "פ": "f", "ף": "f", "צ": "tz", "ץ": "tz",
    "ק": "k", "ר": "r", "ש": "sh", "ת": "t"
  };

  function autoTranslitRoot(rootStr) {
    const parts = rootStr.split("-").map((c) => stripNikud(c).trim());
    return parts.map((l, idx) => {
      if (idx === 0 && l === "ב") return "b";
      if (idx === 0 && l === "כ") return "k";
      if (idx === 0 && l === "פ") return "p";
      return LETTER_TO_LATIN[l] || "k";
    });
  }

  // Automatically detect the root pattern (Gizrah) from the 3 root letters
  function detectGizrah(rootStr, binyan) {
    const [raw1, raw2, raw3] = rootStr.split("-").map((s) => stripNikud(s).trim());
    const r1 = asMedial(raw1);
    const r2 = asMedial(raw2);
    const r3 = asMedial(raw3);

    if ((r2 === "ו" || r2 === "י") && ["paal", "hifil", "hufal", "hitpael", "piel"].includes(binyan)) {
      const tip = `Because the middle root letter is ${r2}, it melts into a vowel! In Pa'al Present & Past, only ${r1} and ${asFinal(r3)} appear as consonants (e.g., ${r1}ָ${asFinal(r3)}).`;
      return {
        code: "hollow",
        hollowVowel: r2 === "י" ? "i" : "u",
        label: `גִּזְרַת ע״${r2} (Hollow Root — middle ${r2} becomes a vowel)`,
        tip,
        note: tip
      };
    }
    if (r3 === "ה") {
      const tip = "Because the 3rd root letter is ה, the Infinitive ends in -וֹת (-ot), Present singular ends in -ֶה/-ָה, and Past 1st/2nd person turns ה into י!";
      return {
        code: "lamed-he",
        label: "גִּזְרַת ל״ה (Root ending in ה)",
        tip,
        note: tip
      };
    }
    if (r3 === "ח" || r3 === "ע") {
      const tip = `Because ${r3} is a throat letter, words ending in ${r3} add a 'furtive patach' ('ach'/'a') glide before it, and Future Pa'al uses an 'a' vowel!`;
      return {
        code: "guttural-3",
        label: `גִּזְרַת ל״גרונית (3rd Root Letter Guttural ${r3})`,
        tip,
        note: tip
      };
    }
    if (binyan === "hitpael" && ["ס", "ש", "צ", "ז"].includes(r1)) {
      const tip = `Because the root starts with the sibilant ${r1}, the ת of הִתְ- swaps places with ${r1} for smooth pronunciation!`;
      return {
        code: "shlemim",
        label: `שִׂכּוּל עִצּוּרִים (Hitpa'el Sibilant Swap with ${r1})`,
        tip,
        note: tip
      };
    }
    const tip = "All 3 root letters stay clearly visible across Past, Present, Future, and Infinitive.";
    return {
      code: "shlemim",
      label: "שְׁלֵמִים (Regular 3-Consonant Root)",
      tip,
      note: tip
    };
  }

  // Build accurate Infinitive parts + transliteration for any root & binyan (respecting Hollow & Lamed-He roots!)
  function buildInfinitiveSpec(rootStr, binyan, customRootTranslit) {
    const [raw1, raw2, raw3] = rootStr.split("-").map((s) => stripNikud(s).trim());
    const r1 = asMedial(raw1);
    const r2 = asMedial(raw2);
    const r3Med = asMedial(raw3);
    const r3Fin = asFinal(raw3);
    const [c1, c2, c3] = customRootTranslit || autoTranslitRoot(rootStr);
    const giz = detectGizrah(rootStr, binyan);

    const P = (text) => ({ text, type: "prefix" });
    const R = (text) => ({ text, type: "root" });
    const I = (text) => ({ text, type: "infix" });
    const S = (text) => ({ text, type: "suffix" });

    function pack(parts, translit) {
      return {
        parts,
        infinitiveParts: parts,
        infinitive: parts.map((p) => p.text).join(""),
        translit
      };
    }

    if (giz.code === "hollow") {
      const vHeb = r2 === "י" ? "ִי" : "וּ";
      const vTr = r2 === "י" ? "i" : "u";
      if (binyan === "paal") {
        return pack([P("לָ"), R(r1), I(vHeb), R(r3Fin)], `la·${c1}${vTr}${c3}`);
      }
      if (binyan === "hifil") {
        return pack([P("לְהָ"), R(r1 + "ִ"), I("י"), R(r3Fin)], `le·ha·${c1}i${c3}`);
      }
      if (binyan === "hufal") {
        return pack([P("הוּ"), R(r1 + "ַ"), R(r3Fin)], `hu·${c1}a${c3}`);
      }
      if (binyan === "hitpael") {
        return pack([P("לְהִתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3Fin)], `le·hit·${c1}o·${c3}e${c3}`);
      }
      if (binyan === "piel") {
        return pack([P("לְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3Fin)], `le·${c1}o·${c3}e${c3}`);
      }
    }

    if (giz.code === "lamed-he") {
      if (binyan === "paal") return pack([P("לִ"), R(r1 + "ְ"), R(r2), S("וֹת")], `li${c1}·${c2}ot`);
      if (binyan === "nifal") return pack([P("לְהִ"), R(r1 + "ָּ"), R(r2), S("וֹת")], `le·hi·${c1}a·${c2}ot`);
      if (binyan === "piel") return pack([P("לְ"), R(r1 + "ַ"), R(r2 + "ּ"), S("וֹת")], `le·${c1}a·${c2}ot`);
      if (binyan === "hifil") return pack([P("לְהַ"), R(r1 + "ְ"), R(r2), S("וֹת")], `le·ha${c1}·${c2}ot`);
      if (binyan === "hitpael") return pack([P("לְהִתְ"), R(r1 + "ַ"), R(r2 + "ּ"), S("וֹת")], `le·hit·${c1}a·${c2}ot`);
    }

    if (binyan === "paal") {
      if (giz.code === "guttural-3") {
        return pack([P("לִ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3Fin + "ַ")], `li${c1}·${c2}o·a${c3}`);
      }
      return pack([P("לִ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3Fin)], `li${c1}·${c2}o${c3}`);
    }
    if (binyan === "nifal") return pack([P("לְהִ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3Fin)], `le·hi·${c1}a·${c2}e${c3}`);
    if (binyan === "piel") return pack([P("לְ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3Fin)], `le·${c1}a·${c2}e${c3}`);
    if (binyan === "pual") return pack([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3Fin)], `${c1}u·${c2}a${c3}`);
    if (binyan === "hifil") return pack([P("לְהַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3Fin)], `le·ha${c1}·${c2}i${c3}`);
    if (binyan === "hufal") return pack([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3Fin)], `hu${c1}·${c2}a${c3}`);
    if (binyan === "hitpael" && ["ס", "ש", "צ"].includes(r1)) {
      const midT = r1 === "צ" ? "טַּ" : "תַּ";
      return pack([P("לְהִ"), R(r1 + "ְ"), P(midT), R(r2 + "ֵּ"), R(r3Fin)], `le·hi${c1}·ta·${c2}e${c3}`);
    }
    return pack([P("לְהִתְ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3Fin)], `le·hit·${c1}a·${c2}e${c3}`);
  }

  // Algorithmic conjugation & morphological segmentation across all 7 Binyanim + Hollow & Lamed-He roots!
  function buildRegularParadigm(spec) {
    const [raw1, raw2, raw3] = spec.root.split("-").map((s) => stripNikud(s).trim());
    const r1 = asMedial(raw1);
    const r2 = asMedial(raw2);
    const r3 = asFinal(raw3);
    const r3Med = asMedial(raw3);
    const binyan = spec.binyan;
    const tr = spec.rootTranslit || autoTranslitRoot(spec.root);
    const [c1, c2, c3] = tr;
    const baseMeaning = spec.shortMeaning || "act";
    const pastMeaning = spec.pastMeaning || (baseMeaning + "ed");
    const partMeaning = spec.partMeaning || (baseMeaning + "ing");
    const giz = detectGizrah(spec.root, binyan);

    // Helper to create a form object with explicit morphological parts:
    // parts: array of { text, type: 'prefix'|'root'|'infix'|'suffix' }
    // Also enforces Hebrew orthography: final letters (ך, ם, ן, ף, ץ) in non-final parts automatically convert to medial letters (כ, מ, נ, פ, צ)!
    function form(rawParts, translit, english, note, isFormal) {
      const parts = rawParts.map((p, idx) => {
        if (idx < rawParts.length - 1) {
          const fixedText = p.text.replace(/[ךםןףץ]/g, (m) => FROM_FINAL[m] || m);
          return { ...p, text: fixedText };
        }
        return p;
      });
      const full = parts.map((p) => p.text).join("");
      return {
        full,
        unvoweled: stripNikud(full),
        parts,
        translit,
        english,
        note: note || null,
        isFormal: !!isFormal
      };
    }
    const P = (text) => ({ text, type: "prefix" });
    const R = (text) => ({ text, type: "root" });
    const I = (text) => ({ text, type: "infix" });
    const S = (text) => ({ text, type: "suffix" });

    // --- SPECIAL PARADIGM A: HOLLOW ROOTS (ע״ו / ע״י like ר-ו-ץ "run", ג-ו-ר "live", ק-ו-ם "get up", ש-י-ר "sing") ---
    if (giz.code === "hollow") {
      const vHeb = r2 === "י" ? "ִי" : "וּ";
      const vTr = r2 === "י" ? "I" : "U";
      const vTrLow = r2 === "י" ? "i" : "u";
      const hollowNote = `Hollow root (${spec.root}): the middle ${r2} disappears in Present/Past and becomes '${vTrLow}' in Future/Infinitive!`;

      if (binyan === "paal") {
        return {
          present: {
            ms: form([R(r1 + "ָ"), R(r3)], `${c1}a${c3}`, `I/you/he ${baseMeaning}(s)`, hollowNote),
            fs: form([R(r1 + "ָ"), R(r3Med), S("ָה")], `${c1}a·${c3}A`, `I/you/she ${baseMeaning}(s)`, "In Hollow roots, Present f.sg. is stressed on the final syllable (ra·TZA), whereas Past 3fs is stressed on the first syllable (RA·tza)!"),
            mp: form([R(r1 + "ָ"), R(r3Med), S("ִים")], `${c1}a·${c3}IM`, `we/you/they ${baseMeaning} (m.)`),
            fp: form([R(r1 + "ָ"), R(r3Med), S("וֹת")], `${c1}a·${c3}OT`, `we/you/they ${baseMeaning} (f.)`)
          },
          past: {
            "1s": form([R(r1 + "ַ"), R(r3 + "ְ"), S("תִּי")], `${c1}A${c3}·ti`, `I ${pastMeaning}`, hollowNote),
            "2ms": form([R(r1 + "ַ"), R(r3 + "ְ"), S("תָּ")], `${c1}A${c3}·ta`, `you (m.sg.) ${pastMeaning}`),
            "2fs": form([R(r1 + "ַ"), R(r3 + "ְ"), S("תְּ")], `${c1}a${c3}t`, `you (f.sg.) ${pastMeaning}`),
            "3ms": form([R(r1 + "ָ"), R(r3)], `${c1}a${c3}`, `he ${pastMeaning} (Identical to Present m.sg.!)`, hollowNote),
            "3fs": form([R(r1 + "ָ"), R(r3Med), S("ָה")], `${c1}A·${c3}a`, `she ${pastMeaning}`),
            "1p": form([R(r1 + "ַ"), R(r3 + "ְ"), S("נוּ")], `${c1}A${c3}·nu`, `we ${pastMeaning}`),
            "2mp": form([R(r1 + "ַ"), R(r3 + "ְ"), S("תֶּם")], `${c1}a${c3}·TEM`, `you (m.pl.) ${pastMeaning}`),
            "2fp": form([R(r1 + "ַ"), R(r3 + "ְ"), S("תֶּן")], `${c1}a${c3}·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
            "3p": form([R(r1 + "ָ"), R(r3Med), S("וּ")], `${c1}A·${c3}u`, `they ${pastMeaning}`)
          },
          future: {
            "1s": form([P("אָ"), R(r1), I(vHeb), R(r3)], `a·${c1}${vTr}${c3}`, `I will ${baseMeaning}`, hollowNote),
            "2ms": form([P("תָּ"), R(r1), I(vHeb), R(r3)], `ta·${c1}${vTr}${c3}`, `you (m.sg.) will ${baseMeaning}`),
            "2fs": form([P("תָּ"), R(r1), I(vHeb), R(r3Med), S("ִי")], `ta·${c1}${vTr}·${c3}i`, `you (f.sg.) will ${baseMeaning}`),
            "3ms": form([P("יָ"), R(r1), I(vHeb), R(r3)], `ya·${c1}${vTr}${c3}`, `he will ${baseMeaning}`),
            "3fs": form([P("תָּ"), R(r1), I(vHeb), R(r3)], `ta·${c1}${vTr}${c3}`, `she will ${baseMeaning}`),
            "1p": form([P("נָ"), R(r1), I(vHeb), R(r3)], `na·${c1}${vTr}${c3}`, `we will ${baseMeaning}`),
            "2mp": form([P("תָּ"), R(r1), I(vHeb), R(r3Med), S("וּ")], `ta·${c1}${vTr}·${c3}u`, `you (pl.) will ${baseMeaning}`),
            "2fp": form([P("תְּ"), R(r1), I(vHeb), R(r3Med + "ֶ"), S("ינָה")], `te·${c1}${vTrLow}·${c3}EI·na`, `you/they (f.pl.) will ${baseMeaning}`, "Formal/literary", true),
            "3p": form([P("יָ"), R(r1), I(vHeb), R(r3Med), S("וּ")], `ya·${c1}${vTr}·${c3}u`, `they will ${baseMeaning}`)
          },
          imperative: {
            "2ms": form([R(r1), I(vHeb), R(r3)], `${c1}${vTrLow}${c3}`, `${baseMeaning}! (m.sg.)`, hollowNote),
            "2fs": form([R(r1), I(vHeb), R(r3Med), S("ִי")], `${c1}${vTr}·${c3}i`, `${baseMeaning}! (f.sg.)`),
            "2mp": form([R(r1), I(vHeb), R(r3Med), S("וּ")], `${c1}${vTr}·${c3}u`, `${baseMeaning}! (pl.)`),
            "2fp": form([R(r1 + "ֹ"), R(r3 + "ְ"), S("נָה")], `${c1}O${c3}·na`, `${baseMeaning}! (f.pl.)`, "Formal/literary", true)
          }
        };
      }

      if (binyan === "hifil") {
        return {
          present: {
            ms: form([P("מֵ"), R(r1 + "ִ"), I("י"), R(r3)], `me·${c1}I${c3}`, `I/you/he ${baseMeaning}(s)`, hollowNote),
            fs: form([P("מְ"), R(r1 + "ִ"), I("י"), R(r3Med), S("ָה")], `me·${c1}i·${c3}A`, `I/you/she ${baseMeaning}(s)`),
            mp: form([P("מְ"), R(r1 + "ִ"), I("י"), R(r3Med), S("ִים")], `me·${c1}i·${c3}IM`, `we/you/they ${baseMeaning} (m.)`),
            fp: form([P("מְ"), R(r1 + "ִ"), I("י"), R(r3Med), S("וֹת")], `me·${c1}i·${c3}OT`, `we/you/they ${baseMeaning} (f.)`)
          },
          past: {
            "1s": form([P("הֵ"), R(r1 + "ַ"), R(r3 + "ְ"), S("תִּי")], `he·${c1}A${c3}·ti`, `I ${pastMeaning}`),
            "2ms": form([P("הֵ"), R(r1 + "ַ"), R(r3 + "ְ"), S("תָּ")], `he·${c1}A${c3}·ta`, `you (m.sg.) ${pastMeaning}`),
            "2fs": form([P("הֵ"), R(r1 + "ַ"), R(r3 + "ְ"), S("תְּ")], `he·${c1}a${c3}t`, `you (f.sg.) ${pastMeaning}`),
            "3ms": form([P("הֵ"), R(r1 + "ִ"), I("י"), R(r3)], `he·${c1}I${c3}`, `he ${pastMeaning}`),
            "3fs": form([P("הֵ"), R(r1 + "ִ"), I("י"), R(r3Med), S("ָה")], `he·${c1}I·${c3}a`, `she ${pastMeaning}`),
            "1p": form([P("הֵ"), R(r1 + "ַ"), R(r3 + "ְ"), S("נוּ")], `he·${c1}A${c3}·nu`, `we ${pastMeaning}`),
            "2mp": form([P("הֲ"), R(r1 + "ַ"), R(r3 + "ְ"), S("תֶּם")], `ha·${c1}a${c3}·TEM`, `you (m.pl.) ${pastMeaning}`),
            "2fp": form([P("הֲ"), R(r1 + "ַ"), R(r3 + "ְ"), S("תֶּן")], `ha·${c1}a${c3}·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
            "3p": form([P("הֵ"), R(r1 + "ִ"), I("י"), R(r3Med), S("וּ")], `he·${c1}I·${c3}u`, `they ${pastMeaning}`)
          },
          future: {
            "1s": form([P("אָ"), R(r1 + "ִ"), I("י"), R(r3)], `a·${c1}I${c3}`, `I will ${baseMeaning}`),
            "2ms": form([P("תָּ"), R(r1 + "ִ"), I("י"), R(r3)], `ta·${c1}I${c3}`, `you (m.sg.) will ${baseMeaning}`),
            "2fs": form([P("תָּ"), R(r1 + "ִ"), I("י"), R(r3Med), S("ִי")], `ta·${c1}I·${c3}i`, `you (f.sg.) will ${baseMeaning}`),
            "3ms": form([P("יָ"), R(r1 + "ִ"), I("י"), R(r3)], `ya·${c1}I${c3}`, `he will ${baseMeaning}`),
            "3fs": form([P("תָּ"), R(r1 + "ִ"), I("י"), R(r3)], `ta·${c1}I${c3}`, `she will ${baseMeaning}`),
            "1p": form([P("נָ"), R(r1 + "ִ"), I("י"), R(r3)], `na·${c1}I${c3}`, `we will ${baseMeaning}`),
            "2mp": form([P("תָּ"), R(r1 + "ִ"), I("י"), R(r3Med), S("וּ")], `ta·${c1}I·${c3}u`, `you (pl.) will ${baseMeaning}`),
            "2fp": form([P("תָּ"), R(r1 + "ֵ"), R(r3 + "ְ"), S("נָה")], `ta·${c1}E${c3}·na`, `you/they (f.pl.) will ${baseMeaning}`, "Formal/literary", true),
            "3p": form([P("יָ"), R(r1 + "ִ"), I("י"), R(r3Med), S("וּ")], `ya·${c1}I·${c3}u`, `they will ${baseMeaning}`)
          },
          imperative: {
            "2ms": form([P("הָ"), R(r1 + "ֵ"), R(r3)], `ha·${c1}E${c3}`, `${baseMeaning}! (m.sg.)`),
            "2fs": form([P("הָ"), R(r1 + "ִ"), I("י"), R(r3Med), S("ִי")], `ha·${c1}I·${c3}i`, `${baseMeaning}! (f.sg.)`),
            "2mp": form([P("הָ"), R(r1 + "ִ"), I("י"), R(r3Med), S("וּ")], `ha·${c1}I·${c3}u`, `${baseMeaning}! (pl.)`),
            "2fp": form([P("הָ"), R(r1 + "ֵ"), R(r3 + "ְ"), S("נָה")], `ha·${c1}E${c3}·na`, `${baseMeaning}! (f.pl.)`, "Formal/literary", true)
          }
        };
      }

      if (binyan === "hitpael") {
        // Polel / Hitpolel (like לְהִתְרוֹצֵץ — doubles the 3rd root letter!)
        return {
          present: {
            ms: form([P("מִתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `mit·${c1}o·${c3}E${c3}`, `I/you/he ${baseMeaning}(s)`),
            fs: form([P("מִתְ"), R(r1), I("וֹ"), R(r3Med + "ֶ"), R(r3Med), S("ֶת")], `mit·${c1}o·${c3}E·${c3}et`, `I/you/she ${baseMeaning}(s)`),
            mp: form([P("מִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("ִים")], `mit·${c1}o·${c3}e·${c3}IM`, `we/you/they ${baseMeaning} (m.)`),
            fp: form([P("מִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("וֹת")], `mit·${c1}o·${c3}e·${c3}OT`, `we/you/they ${baseMeaning} (f.)`)
          },
          past: {
            "1s": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ַ"), R(r3 + "ְ"), S("תִּי")], `hit·${c1}o·${c3}A${c3}·ti`, `I ${pastMeaning}`),
            "2ms": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ַ"), R(r3 + "ְ"), S("תָּ")], `hit·${c1}o·${c3}A${c3}·ta`, `you (m.sg.) ${pastMeaning}`),
            "2fs": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ַ"), R(r3 + "ְ"), S("תְּ")], `hit·${c1}o·${c3}a${c3}t`, `you (f.sg.) ${pastMeaning}`),
            "3ms": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `hit·${c1}o·${c3}E${c3}`, `he ${pastMeaning}`),
            "3fs": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("ָה")], `hit·${c1}o·${c3}e·${c3}A`, `she ${pastMeaning}`),
            "1p": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ַ"), R(r3 + "ְ"), S("נוּ")], `hit·${c1}o·${c3}A${c3}·nu`, `we ${pastMeaning}`),
            "2mp": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ַ"), R(r3 + "ְ"), S("תֶּם")], `hit·${c1}o·${c3}a${c3}·TEM`, `you (m.pl.) ${pastMeaning}`),
            "2fp": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ַ"), R(r3 + "ְ"), S("תֶּן")], `hit·${c1}o·${c3}a${c3}·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
            "3p": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("וּ")], `hit·${c1}o·${c3}e·${c3}U`, `they ${pastMeaning}`)
          },
          future: {
            "1s": form([P("אֶתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `et·${c1}o·${c3}E${c3}`, `I will ${baseMeaning}`),
            "2ms": form([P("תִּתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `tit·${c1}o·${c3}E${c3}`, `you (m.sg.) will ${baseMeaning}`),
            "2fs": form([P("תִּתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("ִי")], `tit·${c1}o·${c3}e·${c3}I`, `you (f.sg.) will ${baseMeaning}`),
            "3ms": form([P("יִתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `yit·${c1}o·${c3}E${c3}`, `he will ${baseMeaning}`),
            "3fs": form([P("תִּתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `tit·${c1}o·${c3}E${c3}`, `she will ${baseMeaning}`),
            "1p": form([P("נִתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `nit·${c1}o·${c3}E${c3}`, `we will ${baseMeaning}`),
            "2mp": form([P("תִּתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("וּ")], `tit·${c1}o·${c3}e·${c3}U`, `you (pl.) will ${baseMeaning}`),
            "3p": form([P("יִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("וּ")], `yit·${c1}o·${c3}e·${c3}U`, `they will ${baseMeaning}`)
          },
          imperative: {
            "2ms": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ֵ"), R(r3)], `hit·${c1}o·${c3}E${c3}`, `${baseMeaning}! (m.sg.)`),
            "2fs": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("ִי")], `hit·${c1}o·${c3}e·${c3}I`, `${baseMeaning}! (f.sg.)`),
            "2mp": form([P("הִתְ"), R(r1), I("וֹ"), R(r3Med + "ְ"), R(r3Med), S("וּ")], `hit·${c1}o·${c3}e·${c3}U`, `${baseMeaning}! (pl.)`)
          }
        };
      }
    }

    // --- SPECIAL PARADIGM B: LAMED-HE ROOTS (ל״ה ending in ה like ק-נ-ה "buy", ר-א-ה "see", ח-כ-ה "wait") ---
    if (giz.code === "lamed-he" && (binyan === "paal" || binyan === "piel")) {
      const isPiel = binyan === "piel";
      const lamedHeNote = "In ל״ה roots (ending in ה), the ה turns into י before Past 1st/2nd person suffixes, and drops before -ִים/-וֹת/-וּ!";
      return {
        present: {
          ms: form(isPiel ? [P("מְ"), R(r1 + "ַ"), R(r2 + "ֶּ"), R("ה")] : [R(r1), I("וֹ"), R(r2 + "ֶ"), R("ה")], isPiel ? `me·${c1}a·${c2}E` : `${c1}o·${c2}E`, `I/you/he ${baseMeaning}(s)`),
          fs: form(isPiel ? [P("מְ"), R(r1 + "ַ"), R(r2 + "ָּ"), S("ה")] : [R(r1), I("וֹ"), R(r2 + "ָ"), S("ה")], isPiel ? `me·${c1}a·${c2}A` : `${c1}o·${c2}A`, `I/you/she ${baseMeaning}(s)`),
          mp: form(isPiel ? [P("מְ"), R(r1 + "ַ"), R(r2 + "ִּ"), S("ים")] : [R(r1), I("וֹ"), R(r2 + "ִ"), S("ים")], isPiel ? `me·${c1}a·${c2}IM` : `${c1}o·${c2}IM`, `we/you/they ${baseMeaning} (m.)`),
          fp: form(isPiel ? [P("מְ"), R(r1 + "ַ"), R(r2 + "ּ"), S("וֹת")] : [R(r1), I("וֹ"), R(r2), S("וֹת")], isPiel ? `me·${c1}a·${c2}OT` : `${c1}o·${c2}OT`, `we/you/they ${baseMeaning} (f.)`)
        },
        past: {
          "1s": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2 + "ִ"), I("י"), S("תִי")], `${c1}${isPiel ? "i" : "a"}·${c2}I·ti`, `I ${pastMeaning}`, lamedHeNote),
          "2ms": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2 + "ִ"), I("י"), S("תָ")], `${c1}${isPiel ? "i" : "a"}·${c2}I·ta`, `you (m.sg.) ${pastMeaning}`),
          "2fs": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2 + "ִ"), I("י"), S("ת")], `${c1}${isPiel ? "i" : "a"}·${c2}It`, `you (f.sg.) ${pastMeaning}`),
          "3ms": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2 + "ָ"), R("ה")], `${c1}${isPiel ? "i" : "a"}·${c2}A`, `he ${pastMeaning}`),
          "3fs": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2 + "ְ"), S("תָה")], `${c1}${isPiel ? "i" : "a"}${c2}·TA`, `she ${pastMeaning}`),
          "1p": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2 + "ִ"), I("י"), S("נוּ")], `${c1}${isPiel ? "i" : "a"}·${c2}I·nu`, `we ${pastMeaning}`),
          "2mp": form([R(r1 + (isPiel ? "ִ" : "ְ")), R(r2 + "ִ"), I("י"), S("תֶם")], `${c1}${isPiel ? "i" : "e"}·${c2}i·TEM`, `you (m.pl.) ${pastMeaning}`),
          "3p": form([R(r1 + (isPiel ? "ִ" : "ָ")), R(r2), S("וּ")], `${c1}${isPiel ? "i" : "a"}·${c2}U`, `they ${pastMeaning}`)
        },
        future: {
          "1s": form([P(isPiel ? "אֲ" : "אֶ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2 + "ֶ"), R("ה")], `${isPiel ? "a" : "e"}${c1}·${c2}E`, `I will ${baseMeaning}`),
          "2ms": form([P(isPiel ? "תְּ" : "תִּ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2 + "ֶ"), R("ה")], `t${isPiel ? "e" : "i"}${c1}·${c2}E`, `you (m.sg.) will ${baseMeaning}`),
          "2fs": form([P(isPiel ? "תְּ" : "תִּ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2), S("ִי")], `t${isPiel ? "e" : "i"}${c1}·${c2}I`, `you (f.sg.) will ${baseMeaning}`),
          "3ms": form([P(isPiel ? "יְ" : "יִ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2 + "ֶ"), R("ה")], `y${isPiel ? "e" : "i"}${c1}·${c2}E`, `he will ${baseMeaning}`),
          "3fs": form([P(isPiel ? "תְּ" : "תִּ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2 + "ֶ"), R("ה")], `t${isPiel ? "e" : "i"}${c1}·${c2}E`, `she will ${baseMeaning}`),
          "1p": form([P(isPiel ? "נְ" : "נִ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2 + "ֶ"), R("ה")], `n${isPiel ? "e" : "i"}${c1}·${c2}E`, `we will ${baseMeaning}`),
          "2mp": form([P(isPiel ? "תְּ" : "תִּ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2), S("וּ")], `t${isPiel ? "e" : "i"}${c1}·${c2}U`, `you (pl.) will ${baseMeaning}`),
          "3p": form([P(isPiel ? "יְ" : "יִ"), R(r1 + (isPiel ? "ַ" : "ְ")), R(r2), S("וּ")], `y${isPiel ? "e" : "i"}${c1}·${c2}U`, `they will ${baseMeaning}`)
        },
        imperative: {
          "2ms": form([R(r1 + (isPiel ? "ַ" : "ְ")), R(r2 + "ֵ"), R("ה")], `${c1}${isPiel ? "a" : "e"}·${c2}E`, `${baseMeaning}! (m.sg.)`),
          "2fs": form([R(r1 + (isPiel ? "ַ" : "ְ")), R(r2), S("ִי")], `${c1}${isPiel ? "a" : "e"}·${c2}I`, `${baseMeaning}! (f.sg.)`),
          "2mp": form([R(r1 + (isPiel ? "ַ" : "ְ")), R(r2), S("וּ")], `${c1}${isPiel ? "a" : "e"}·${c2}U`, `${baseMeaning}! (pl.)`)
        }
      };
    }


    if (binyan === "paal") {
      return {
        present: {
          ms: form([R(r1), I("וֹ"), R(r2 + "ֵ"), R(r3)], `${c1}o·${c2}e${c3}`, `I/you/he ${baseMeaning}(s)`),
          fs: form([R(r1), I("וֹ"), R(r2 + "ֶ"), R(r3), S("ֶת")], `${c1}o·${c2}E·${c3}et`, `I/you/she ${baseMeaning}(s)`),
          mp: form([R(r1), I("וֹ"), R(r2 + "ְ"), R(r3), S("ִים")], `${c1}o${c2}·${c3}im`, `we/you/they ${baseMeaning} (m.)`),
          fp: form([R(r1), I("וֹ"), R(r2 + "ְ"), R(r3), S("וֹת")], `${c1}o${c2}·${c3}ot`, `we/you/they ${baseMeaning} (f.)`)
        },
        past: {
          "1s": form([R(r1 + "ָ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תִּי")], `${c1}a·${c2}AV·ti`, `I ${pastMeaning}`),
          "2ms": form([R(r1 + "ָ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תָּ")], `${c1}a·${c2}AV·ta`, `you (m.sg.) ${pastMeaning}`),
          "2fs": form([R(r1 + "ָ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תְּ")], `${c1}a·${c2}avt`, `you (f.sg.) ${pastMeaning}`),
          "3ms": form([R(r1 + "ָ"), R(r2 + "ַ"), R(r3)], `${c1}a·${c2}A${c3}`, `he ${pastMeaning} (Dictionary base)`),
          "3fs": form([R(r1 + "ָ"), R(r2 + "ְ"), R(r3), S("ָה")], `${c1}a${c2}·${c3}A`, `she ${pastMeaning}`),
          "1p": form([R(r1 + "ָ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נוּ")], `${c1}a·${c2}AV·nu`, `we ${pastMeaning}`),
          "2mp": form([R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּם")], `${c1}e·${c2}av·TEM`, `you (m.pl.) ${pastMeaning}`, "In casual speech often pronounced " + `${c1}a·${c2}AV·tem`),
          "2fp": form([R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּן")], `${c1}e·${c2}av·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
          "3p": form([R(r1 + "ָ"), R(r2 + "ְ"), R(r3), S("וּ")], `${c1}a${c2}·${c3}U`, `they ${pastMeaning}`)
        },
        future: {
          "1s": form([P("אֶ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3)], `e${c1}·${c2}O${c3}`, `I will ${baseMeaning}`),
          "2ms": form([P("תִּ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3)], `ti${c1}·${c2}O${c3}`, `you (m.sg.) will ${baseMeaning}`),
          "2fs": form([P("תִּ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("ִי")], `ti${c1}·${c2}e·${c3}I`, `you (f.sg.) will ${baseMeaning}`),
          "3ms": form([P("יִ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3)], `yi${c1}·${c2}O${c3}`, `he will ${baseMeaning}`),
          "3fs": form([P("תִּ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3)], `ti${c1}·${c2}O${c3}`, `she will ${baseMeaning}`),
          "1p": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3)], `ni${c1}·${c2}O${c3}`, `we will ${baseMeaning}`),
          "2mp": form([P("תִּ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("וּ")], `ti${c1}·${c2}e·${c3}U`, `you (pl.) will ${baseMeaning}`),
          "2fp": form([P("תִּ"), R(r1 + "ְ"), R(r2 + "ֹ"), R(r3 + "ְ"), S("נָה")], `ti${c1}·${c2}OV·na`, `you/they (f.pl.) will ${baseMeaning}`, "Literary/formal only; modern Hebrew uses תִּ...וּ", true),
          "3p": form([P("יִ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("וּ")], `yi${c1}·${c2}e·${c3}U`, `they will ${baseMeaning}`)
        },
        imperative: {
          "2ms": form([R(r1 + "ְ"), R(r2 + "ֹ"), R(r3)], `${c1}e·${c2}O${c3}`, `${baseMeaning}! (m.sg.)`),
          "2fs": form([R(r1 + "ִ"), R(r2 + "ְ"), R(r3), S("ִי")], `${c1}i${c2}·${c3}I`, `${baseMeaning}! (f.sg.)`),
          "2mp": form([R(r1 + "ִ"), R(r2 + "ְ"), R(r3), S("וּ")], `${c1}i${c2}·${c3}U`, `${baseMeaning}! (pl.)`),
          "2fp": form([R(r1 + "ְ"), R(r2 + "ֹ"), R(r3 + "ְ"), S("נָה")], `${c1}e·${c2}OV·na`, `${baseMeaning}! (f.pl.)`, "Literary/formal only", true)
        }
      };
    }

    if (binyan === "nifal") {
      return {
        present: {
          ms: form([P("נִ"), R(r1 + "ְ"), R(r2 + "ָ"), R(r3)], `ni${c1}·${c2}A${c3}`, `is ${partMeaning} (m.sg.)`, "Notice the קָמַץ (ָ) under the 2nd root letter, distinguishing Present from Past נִ◌ְ◌ַ◌!"),
          fs: form([P("נִ"), R(r1 + "ְ"), R(r2 + "ֶ"), R(r3), S("ֶת")], `ni${c1}·${c2}E·${c3}et`, `is ${partMeaning} (f.sg.)`),
          mp: form([P("נִ"), R(r1 + "ְ"), R(r2 + "ָ"), R(r3), S("ִים")], `ni${c1}·${c2}a·${c3}IM`, `are ${partMeaning} (m.pl.)`),
          fp: form([P("נִ"), R(r1 + "ְ"), R(r2 + "ָ"), R(r3), S("וֹת")], `ni${c1}·${c2}a·${c3}OT`, `are ${partMeaning} (f.pl.)`)
        },
        past: {
          "1s": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תִּי")], `ni${c1}·${c2}A${c3}·ti`, `I was ${partMeaning}`),
          "2ms": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תָּ")], `ni${c1}·${c2}A${c3}·ta`, `you (m.sg.) were ${partMeaning}`),
          "2fs": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תְּ")], `ni${c1}·${c2}a${c3}t`, `you (f.sg.) were ${partMeaning}`),
          "3ms": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `ni${c1}·${c2}A${c3}`, `he/it was ${partMeaning}`),
          "3fs": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("ָה")], `ni${c1}·${c2}e·${c3}A`, `she/it was ${partMeaning}`),
          "1p": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נוּ")], `ni${c1}·${c2}A${c3}·nu`, `we were ${partMeaning}`),
          "2mp": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּם")], `ni${c1}·${c2}a${c3}·TEM`, `you (m.pl.) were ${partMeaning}`),
          "2fp": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּן")], `ni${c1}·${c2}a${c3}·TEN`, `you (f.pl.) were ${partMeaning}`, null, true),
          "3p": form([P("נִ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("וּ")], `ni${c1}·${c2}e·${c3}U`, `they were ${partMeaning}`)
        },
        future: {
          "1s": form([P("אֶ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3)], `e·${c1}a·${c2}E${c3}`, `I will be ${partMeaning}`),
          "2ms": form([P("תִּ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3)], `ti·${c1}a·${c2}E${c3}`, `you (m.sg.) will be ${partMeaning}`),
          "2fs": form([P("תִּ"), R(r1 + "ָּ"), R(r2 + "ְ"), R(r3), S("ִי")], `ti·${c1}a${c2}·${c3}I`, `you (f.sg.) will be ${partMeaning}`),
          "3ms": form([P("יִ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3)], `yi·${c1}a·${c2}E${c3}`, `he/it will be ${partMeaning}`),
          "3fs": form([P("תִּ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3)], `ti·${c1}a·${c2}E${c3}`, `she/it will be ${partMeaning}`),
          "1p": form([P("נִ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3)], `ni·${c1}a·${c2}E${c3}`, `we will be ${partMeaning}`),
          "2mp": form([P("תִּ"), R(r1 + "ָּ"), R(r2 + "ְ"), R(r3), S("וּ")], `ti·${c1}a${c2}·${c3}U`, `you (pl.) will be ${partMeaning}`),
          "2fp": form([P("תִּ"), R(r1 + "ָּ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נָה")], `ti·${c1}a·${c2}A${c3}·na`, `you/they (f.pl.) will be ${partMeaning}`, "Formal/literary", true),
          "3p": form([P("יִ"), R(r1 + "ָּ"), R(r2 + "ְ"), R(r3), S("וּ")], `yi·${c1}a${c2}·${c3}U`, `they will be ${partMeaning}`)
        },
        imperative: {
          "2ms": form([P("הִ"), R(r1 + "ָּ"), R(r2 + "ֵ"), R(r3)], `hi·${c1}a·${c2}E${c3}`, `be ${partMeaning}! (m.sg.)`),
          "2fs": form([P("הִ"), R(r1 + "ָּ"), R(r2 + "ְ"), R(r3), S("ִי")], `hi·${c1}a${c2}·${c3}I`, `be ${partMeaning}! (f.sg.)`),
          "2mp": form([P("הִ"), R(r1 + "ָּ"), R(r2 + "ְ"), R(r3), S("וּ")], `hi·${c1}a${c2}·${c3}U`, `be ${partMeaning}! (pl.)`),
          "2fp": form([P("הִ"), R(r1 + "ָּ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נָה")], `hi·${c1}a·${c2}A${c3}·na`, `be ${partMeaning}! (f.pl.)`, "Formal/literary", true)
        }
      };
    }

    if (binyan === "piel") {
      return {
        present: {
          ms: form([P("מְ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `me·${c1}a·${c2}E${c3}`, `I/you/he ${baseMeaning}(s)`),
          fs: form([P("מְ"), R(r1 + "ַ"), R(r2 + "ֶּ"), R(r3), S("ֶת")], `me·${c1}a·${c2}E·${c3}et`, `I/you/she ${baseMeaning}(s)`),
          mp: form([P("מְ"), R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("ִים")], `me·${c1}a${c2}·${c3}IM`, `we/you/they ${baseMeaning} (m.)`),
          fp: form([P("מְ"), R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("וֹת")], `me·${c1}a${c2}·${c3}OT`, `we/you/they ${baseMeaning} (f.)`)
        },
        past: {
          "1s": form([R(r1 + "ִ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תִּי")], `${c1}i·${c2}A${c3}·ti`, `I ${pastMeaning}`),
          "2ms": form([R(r1 + "ִ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תָּ")], `${c1}i·${c2}A${c3}·ta`, `you (m.sg.) ${pastMeaning}`),
          "2fs": form([R(r1 + "ִ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תְּ")], `${c1}i·${c2}a${c3}t`, `you (f.sg.) ${pastMeaning}`),
          "3ms": form([R(r1 + "ִ"), R(r2 + "ֵּ"), R(r3)], `${c1}i·${c2}E${c3}`, `he ${pastMeaning}`),
          "3fs": form([R(r1 + "ִ"), R(r2 + "ְּ"), R(r3), S("ָה")], `${c1}i${c2}·${c3}A`, `she ${pastMeaning}`),
          "1p": form([R(r1 + "ִ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("נוּ")], `${c1}i·${c2}A${c3}·nu`, `we ${pastMeaning}`),
          "2mp": form([R(r1 + "ִ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תֶּם")], `${c1}i·${c2}a${c3}·TEM`, `you (m.pl.) ${pastMeaning}`),
          "2fp": form([R(r1 + "ִ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תֶּן")], `${c1}i·${c2}a${c3}·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
          "3p": form([R(r1 + "ִ"), R(r2 + "ְּ"), R(r3), S("וּ")], `${c1}i${c2}·${c3}U`, `they ${pastMeaning}`)
        },
        future: {
          "1s": form([P("אֲ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `a·${c1}a·${c2}E${c3}`, `I will ${baseMeaning}`),
          "2ms": form([P("תְּ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `te·${c1}a·${c2}E${c3}`, `you (m.sg.) will ${baseMeaning}`),
          "2fs": form([P("תְּ"), R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("ִי")], `te·${c1}a${c2}·${c3}I`, `you (f.sg.) will ${baseMeaning}`),
          "3ms": form([P("יְ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `ye·${c1}a·${c2}E${c3}`, `he will ${baseMeaning}`),
          "3fs": form([P("תְּ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `te·${c1}a·${c2}E${c3}`, `she will ${baseMeaning}`),
          "1p": form([P("נְ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `ne·${c1}a·${c2}E${c3}`, `we will ${baseMeaning}`),
          "2mp": form([P("תְּ"), R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("וּ")], `te·${c1}a${c2}·${c3}U`, `you (pl.) will ${baseMeaning}`),
          "2fp": form([P("תְּ"), R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3 + "ְ"), S("נָה")], `te·${c1}a·${c2}E${c3}·na`, `you/they (f.pl.) will ${baseMeaning}`, "Formal/literary", true),
          "3p": form([P("יְ"), R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("וּ")], `ye·${c1}a${c2}·${c3}U`, `they will ${baseMeaning}`)
        },
        imperative: {
          "2ms": form([R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3)], `${c1}a·${c2}E${c3}`, `${baseMeaning}! (m.sg.)`),
          "2fs": form([R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("ִי")], `${c1}a${c2}·${c3}I`, `${baseMeaning}! (f.sg.)`),
          "2mp": form([R(r1 + "ַ"), R(r2 + "ְּ"), R(r3), S("וּ")], `${c1}a${c2}·${c3}U`, `${baseMeaning}! (pl.)`),
          "2fp": form([R(r1 + "ַ"), R(r2 + "ֵּ"), R(r3 + "ְ"), S("נָה")], `${c1}a·${c2}E${c3}·na`, `${baseMeaning}! (f.pl.)`, "Formal/literary", true)
        }
      };
    }

    if (binyan === "pual") {
      return {
        present: {
          ms: form([P("מְ"), R(r1 + "ֻ"), R(r2 + "ָּ"), R(r3)], `me·${c1}u·${c2}A${c3}`, `is ${partMeaning} (m.sg.)`),
          fs: form([P("מְ"), R(r1 + "ֻ"), R(r2 + "ֶּ"), R(r3), S("ֶת")], `me·${c1}u·${c2}E·${c3}et`, `is ${partMeaning} (f.sg.)`),
          mp: form([P("מְ"), R(r1 + "ֻ"), R(r2 + "ָּ"), R(r3), S("ִים")], `me·${c1}u·${c2}a·${c3}IM`, `are ${partMeaning} (m.pl.)`),
          fp: form([P("מְ"), R(r1 + "ֻ"), R(r2 + "ָּ"), R(r3), S("וֹת")], `me·${c1}u·${c2}a·${c3}OT`, `are ${partMeaning} (f.pl.)`)
        },
        past: {
          "1s": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תִּי")], `${c1}u·${c2}A${c3}·ti`, `I was ${partMeaning}`),
          "2ms": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תָּ")], `${c1}u·${c2}A${c3}·ta`, `you (m.sg.) were ${partMeaning}`),
          "2fs": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תְּ")], `${c1}u·${c2}a${c3}t`, `you (f.sg.) were ${partMeaning}`),
          "3ms": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3)], `${c1}u·${c2}A${c3}`, `he/it was ${partMeaning}`),
          "3fs": form([R(r1 + "ֻ"), R(r2 + "ְּ"), R(r3), S("ָה")], `${c1}u${c2}·${c3}A`, `she/it was ${partMeaning}`),
          "1p": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("נוּ")], `${c1}u·${c2}A${c3}·nu`, `we were ${partMeaning}`),
          "2mp": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תֶּם")], `${c1}u·${c2}a${c3}·TEM`, `you (m.pl.) were ${partMeaning}`),
          "2fp": form([R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("תֶּן")], `${c1}u·${c2}a${c3}·TEN`, `you (f.pl.) were ${partMeaning}`, null, true),
          "3p": form([R(r1 + "ֻ"), R(r2 + "ְּ"), R(r3), S("וּ")], `${c1}u${c2}·${c3}U`, `they were ${partMeaning}`)
        },
        future: {
          "1s": form([P("אֲ"), R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3)], `a·${c1}u·${c2}A${c3}`, `I will be ${partMeaning}`),
          "2ms": form([P("תְּ"), R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3)], `te·${c1}u·${c2}A${c3}`, `you (m.sg.) will be ${partMeaning}`),
          "2fs": form([P("תְּ"), R(r1 + "ֻ"), R(r2 + "ְּ"), R(r3), S("ִי")], `te·${c1}u${c2}·${c3}I`, `you (f.sg.) will be ${partMeaning}`),
          "3ms": form([P("יְ"), R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3)], `ye·${c1}u·${c2}A${c3}`, `he/it will be ${partMeaning}`),
          "3fs": form([P("תְּ"), R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3)], `te·${c1}u·${c2}A${c3}`, `she/it will be ${partMeaning}`),
          "1p": form([P("נְ"), R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3)], `ne·${c1}u·${c2}A${c3}`, `we will be ${partMeaning}`),
          "2mp": form([P("תְּ"), R(r1 + "ֻ"), R(r2 + "ְּ"), R(r3), S("וּ")], `te·${c1}u${c2}·${c3}U`, `you (pl.) will be ${partMeaning}`),
          "2fp": form([P("תְּ"), R(r1 + "ֻ"), R(r2 + "ַּ"), R(r3 + "ְ"), S("נָה")], `te·${c1}u·${c2}A${c3}·na`, `you/they (f.pl.) will be ${partMeaning}`, "Formal/literary", true),
          "3p": form([P("יְ"), R(r1 + "ֻ"), R(r2 + "ְּ"), R(r3), S("וּ")], `ye·${c1}u${c2}·${c3}U`, `they will be ${partMeaning}`)
        },
        imperative: null
      };
    }

    if (binyan === "hifil") {
      return {
        present: {
          ms: form([P("מַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `ma${c1}·${c2}I${c3}`, `I/you/he ${baseMeaning}(s)`),
          fs: form([P("מַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("ָה")], `ma${c1}·${c2}i·${c3}A`, `I/you/she ${baseMeaning}(s)`),
          mp: form([P("מַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("ִים")], `ma${c1}·${c2}i·${c3}IM`, `we/you/they ${baseMeaning} (m.)`),
          fp: form([P("מַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("וֹת")], `ma${c1}·${c2}i·${c3}OT`, `we/you/they ${baseMeaning} (f.)`)
        },
        past: {
          "1s": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תִּי")], `hi${c1}·${c2}A${c3}·ti`, `I ${pastMeaning}`, "Notice the 'i' vowel changes to 'a' before 1st/2nd person suffixes!"),
          "2ms": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תָּ")], `hi${c1}·${c2}A${c3}·ta`, `you (m.sg.) ${pastMeaning}`),
          "2fs": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תְּ")], `hi${c1}·${c2}a${c3}t`, `you (f.sg.) ${pastMeaning}`),
          "3ms": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `hi${c1}·${c2}I${c3}`, `he ${pastMeaning}`),
          "3fs": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("ָה")], `hi${c1}·${c2}I·${c3}a`, `she ${pastMeaning}`),
          "1p": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נוּ")], `hi${c1}·${c2}A${c3}·nu`, `we ${pastMeaning}`),
          "2mp": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּם")], `hi${c1}·${c2}a${c3}·TEM`, `you (m.pl.) ${pastMeaning}`),
          "2fp": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּן")], `hi${c1}·${c2}a${c3}·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
          "3p": form([P("הִ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("וּ")], `hi${c1}·${c2}I·${c3}u`, `they ${pastMeaning}`)
        },
        future: {
          "1s": form([P("אַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `a${c1}·${c2}I${c3}`, `I will ${baseMeaning}`),
          "2ms": form([P("תַּ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `ta${c1}·${c2}I${c3}`, `you (m.sg.) will ${baseMeaning}`),
          "2fs": form([P("תַּ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("ִי")], `ta${c1}·${c2}I·${c3}i`, `you (f.sg.) will ${baseMeaning}`),
          "3ms": form([P("יַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `ya${c1}·${c2}I${c3}`, `he will ${baseMeaning}`),
          "3fs": form([P("תַּ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `ta${c1}·${c2}I${c3}`, `she will ${baseMeaning}`),
          "1p": form([P("נַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3)], `na${c1}·${c2}I${c3}`, `we will ${baseMeaning}`),
          "2mp": form([P("תַּ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("וּ")], `ta${c1}·${c2}I·${c3}u`, `you (pl.) will ${baseMeaning}`),
          "2fp": form([P("תַּ"), R(r1 + "ְ"), R(r2 + "ֵ"), R(r3 + "ְ"), S("נָה")], `ta${c1}·${c2}E${c3}·na`, `you/they (f.pl.) will ${baseMeaning}`, "Formal/literary", true),
          "3p": form([P("יַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("וּ")], `ya${c1}·${c2}I·${c3}u`, `they will ${baseMeaning}`)
        },
        imperative: {
          "2ms": form([P("הַ"), R(r1 + "ְ"), R(r2 + "ֵ"), R(r3)], `ha${c1}·${c2}E${c3}`, `${baseMeaning}! (m.sg.)`, "Notice the Imperative m.sg. uses 'e' (צֵירֵי) instead of 'i'!"),
          "2fs": form([P("הַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("ִי")], `ha${c1}·${c2}I·${c3}i`, `${baseMeaning}! (f.sg.)`),
          "2mp": form([P("הַ"), R(r1 + "ְ"), R(r2 + "ִ"), I("י"), R(r3), S("וּ")], `ha${c1}·${c2}I·${c3}u`, `${baseMeaning}! (pl.)`),
          "2fp": form([P("הַ"), R(r1 + "ְ"), R(r2 + "ֵ"), R(r3 + "ְ"), S("נָה")], `ha${c1}·${c2}E${c3}·na`, `${baseMeaning}! (f.pl.)`, "Formal/literary", true)
        }
      };
    }

    if (binyan === "hufal") {
      return {
        present: {
          ms: form([P("מֻ"), R(r1 + "ְ"), R(r2 + "ָ"), R(r3)], `mu${c1}·${c2}A${c3}`, `is ${partMeaning} (m.sg.)`),
          fs: form([P("מֻ"), R(r1 + "ְ"), R(r2 + "ֶ"), R(r3), S("ֶת")], `mu${c1}·${c2}E·${c3}et`, `is ${partMeaning} (f.sg.)`),
          mp: form([P("מֻ"), R(r1 + "ְ"), R(r2 + "ָ"), R(r3), S("ִים")], `mu${c1}·${c2}a·${c3}IM`, `are ${partMeaning} (m.pl.)`),
          fp: form([P("מֻ"), R(r1 + "ְ"), R(r2 + "ָ"), R(r3), S("וֹת")], `mu${c1}·${c2}a·${c3}OT`, `are ${partMeaning} (f.pl.)`)
        },
        past: {
          "1s": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תִּי")], `hu${c1}·${c2}A${c3}·ti`, `I was ${partMeaning}`),
          "2ms": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תָּ")], `hu${c1}·${c2}A${c3}·ta`, `you (m.sg.) were ${partMeaning}`),
          "2fs": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תְּ")], `hu${c1}·${c2}a${c3}t`, `you (f.sg.) were ${partMeaning}`),
          "3ms": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `hu${c1}·${c2}A${c3}`, `he/it was ${partMeaning}`),
          "3fs": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("ָה")], `hu${c1}·${c2}e·${c3}A`, `she/it was ${partMeaning}`),
          "1p": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נוּ")], `hu${c1}·${c2}A${c3}·nu`, `we were ${partMeaning}`),
          "2mp": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּם")], `hu${c1}·${c2}a${c3}·TEM`, `you (m.pl.) were ${partMeaning}`),
          "2fp": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("תֶּן")], `hu${c1}·${c2}a${c3}·TEN`, `you (f.pl.) were ${partMeaning}`, null, true),
          "3p": form([P("הֻ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("וּ")], `hu${c1}·${c2}e·${c3}U`, `they were ${partMeaning}`)
        },
        future: {
          "1s": form([P("אֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `u${c1}·${c2}A${c3}`, `I will be ${partMeaning}`),
          "2ms": form([P("תֻּ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `tu${c1}·${c2}A${c3}`, `you (m.sg.) will be ${partMeaning}`),
          "2fs": form([P("תֻּ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("ִי")], `tu${c1}·${c2}e·${c3}I`, `you (f.sg.) will be ${partMeaning}`),
          "3ms": form([P("יֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `yu${c1}·${c2}A${c3}`, `he/it will be ${partMeaning}`),
          "3fs": form([P("תֻּ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `tu${c1}·${c2}A${c3}`, `she/it will be ${partMeaning}`),
          "1p": form([P("נֻ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3)], `nu${c1}·${c2}A${c3}`, `we will be ${partMeaning}`),
          "2mp": form([P("תֻּ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("וּ")], `tu${c1}·${c2}e·${c3}U`, `you (pl.) will be ${partMeaning}`),
          "2fp": form([P("תֻּ"), R(r1 + "ְ"), R(r2 + "ַ"), R(r3 + "ְ"), S("נָה")], `tu${c1}·${c2}A${c3}·na`, `you/they (f.pl.) will be ${partMeaning}`, "Formal/literary", true),
          "3p": form([P("יֻ"), R(r1 + "ְ"), R(r2 + "ְ"), R(r3), S("וּ")], `yu${c1}·${c2}e·${c3}U`, `they will be ${partMeaning}`)
        },
        imperative: null
      };
    }

    // Hitpa'el (including sibilant swap check for ס, ש, צ, ז!)
    const isSibilant = ["ס", "ש", "צ"].includes(r1);
    const hitMid = r1 === "צ" ? "טַּ" : "תַּ";
    const hitMidTr = r1 === "צ" ? "t" : "t";

    function hitPrefixRoot(leadHeb, leadTr) {
      if (isSibilant) {
        return {
          parts: [P(leadHeb), R(r1 + "ְ"), P(hitMid), R(r2), R(r3)],
          note: `Sibilant Metathesis (שיכול עיצורים): Because the root starts with ${r1}, the ת of הִתְ- swaps places with ${r1}!`
        };
      }
      return {
        parts: [P(leadHeb + "תְ"), R(r1 + "ַ"), R(r2), R(r3)],
        note: null
      };
    }

    const hp = (leadHeb, r2Vowel, r3Vowel) => {
      if (isSibilant) {
        return [P(leadHeb), R(r1 + "ְ"), P(hitMid), R(r2 + r2Vowel), R(r3 + r3Vowel)];
      }
      return [P(leadHeb + "תְ"), R(r1 + "ַ"), R(r2 + r2Vowel), R(r3 + r3Vowel)];
    };
    const htr = (leadTr) => (isSibilant ? `${leadTr}${c1}·${hitMidTr}a` : `${leadTr}t·${c1}a`);
    const sibNote = isSibilant
      ? `Sibilant Swap: הִתְ + ${r1} becomes ${leadSwapExample(r1)} for smoother pronunciation!`
      : null;
    function leadSwapExample(letter) {
      return letter === "צ" ? "הִצְטַ-" : `הִ${letter}ְתַּ-`;
    }

    return {
      present: {
        ms: form(hp("מִ", "ֵּ", ""), `${htr("mi")}·${c2}E${c3}`, `I/you/he ${baseMeaning}(s)`, sibNote),
        fs: form([...hp("מִ", "ֶּ", ""), S("ֶת")], `${htr("mi")}·${c2}E·${c3}et`, `I/you/she ${baseMeaning}(s)`, sibNote),
        mp: form([...hp("מִ", "ְּ", ""), S("ִים")], `${htr("mi")}${c2}·${c3}IM`, `we/you/they ${baseMeaning} (m.)`, sibNote),
        fp: form([...hp("מִ", "ְּ", ""), S("וֹת")], `${htr("mi")}${c2}·${c3}OT`, `we/you/they ${baseMeaning} (f.)`, sibNote)
      },
      past: {
        "1s": form([...hp("הִ", "ַּ", "ְ"), S("תִּי")], `${htr("hi")}·${c2}A${c3}·ti`, `I ${pastMeaning}`, sibNote),
        "2ms": form([...hp("הִ", "ַּ", "ְ"), S("תָּ")], `${htr("hi")}·${c2}A${c3}·ta`, `you (m.sg.) ${pastMeaning}`),
        "2fs": form([...hp("הִ", "ַּ", "ְ"), S("תְּ")], `${htr("hi")}·${c2}a${c3}t`, `you (f.sg.) ${pastMeaning}`),
        "3ms": form(hp("הִ", "ֵּ", ""), `${htr("hi")}·${c2}E${c3}`, `he ${pastMeaning}`, sibNote),
        "3fs": form([...hp("הִ", "ְּ", ""), S("ָה")], `${htr("hi")}${c2}·${c3}A`, `she ${pastMeaning}`),
        "1p": form([...hp("הִ", "ַּ", "ְ"), S("נוּ")], `${htr("hi")}·${c2}A${c3}·nu`, `we ${pastMeaning}`),
        "2mp": form([...hp("הִ", "ַּ", "ְ"), S("תֶּם")], `${htr("hi")}·${c2}a${c3}·TEM`, `you (m.pl.) ${pastMeaning}`),
        "2fp": form([...hp("הִ", "ַּ", "ְ"), S("תֶּן")], `${htr("hi")}·${c2}a${c3}·TEN`, `you (f.pl.) ${pastMeaning}`, null, true),
        "3p": form([...hp("הִ", "ְּ", ""), S("וּ")], `${htr("hi")}${c2}·${c3}U`, `they ${pastMeaning}`)
      },
      future: {
        "1s": form(hp("אֶ", "ֵּ", ""), `${htr("e")}·${c2}E${c3}`, `I will ${baseMeaning}`),
        "2ms": form(hp("תִּ", "ֵּ", ""), `${htr("ti")}·${c2}E${c3}`, `you (m.sg.) will ${baseMeaning}`),
        "2fs": form([...hp("תִּ", "ְּ", ""), S("ִי")], `${htr("ti")}${c2}·${c3}I`, `you (f.sg.) will ${baseMeaning}`),
        "3ms": form(hp("יִ", "ֵּ", ""), `${htr("yi")}·${c2}E${c3}`, `he will ${baseMeaning}`),
        "3fs": form(hp("תִּ", "ֵּ", ""), `${htr("ti")}·${c2}E${c3}`, `she will ${baseMeaning}`),
        "1p": form(hp("נִ", "ֵּ", ""), `${htr("ni")}·${c2}E${c3}`, `we will ${baseMeaning}`),
        "2mp": form([...hp("תִּ", "ְּ", ""), S("וּ")], `${htr("ti")}${c2}·${c3}U`, `you (pl.) will ${baseMeaning}`),
        "2fp": form([...hp("תִּ", "ֵּ", "ְ"), S("נָה")], `${htr("ti")}·${c2}E${c3}·na`, `you/they (f.pl.) will ${baseMeaning}`, "Formal/literary", true),
        "3p": form([...hp("יִ", "ְּ", ""), S("וּ")], `${htr("yi")}${c2}·${c3}U`, `they will ${baseMeaning}`)
      },
      imperative: {
        "2ms": form(hp("הִ", "ֵּ", ""), `${htr("hi")}·${c2}E${c3}`, `${baseMeaning}! (m.sg.)`),
        "2fs": form([...hp("הִ", "ְּ", ""), S("ִי")], `${htr("hi")}${c2}·${c3}I`, `${baseMeaning}! (f.sg.)`),
        "2mp": form([...hp("הִ", "ְּ", ""), S("וּ")], `${htr("hi")}${c2}·${c3}U`, `${baseMeaning}! (pl.)`),
        "2fp": form([...hp("הִ", "ֵּ", "ְ"), S("נָה")], `${htr("hi")}·${c2}E${c3}·na`, `${baseMeaning}! (f.pl.)`, "Formal/literary", true)
      }
    };
  }

  // Helper to build a complete verb entry
  function createVerb(config) {
    const tables = config.customTables || buildRegularParadigm(config);
    return {
      id: config.id,
      infinitive: config.infinitive,
      infinitiveUnvoweled: stripNikud(config.infinitive),
      infinitiveParts: config.infinitiveParts,
      translit: config.translit,
      english: config.english,
      root: config.root,
      binyan: config.binyan,
      gizrah: config.gizrah || "שְׁלֵמִים (Regular Root)",
      gizrahTip: config.gizrahTip || "All 3 root letters stay clearly visible in every tense.",
      preposition: config.preposition || "אֶת (direct object)",
      frequency: config.frequency || "Essential",
      semanticNote: config.semanticNote,
      examples: config.examples || [],
      tables
    };
  }

  const P = (text) => ({ text, type: "prefix" });
  const R = (text) => ({ text, type: "root" });
  const I = (text) => ({ text, type: "infix" });
  const S = (text) => ({ text, type: "suffix" });

  const VERBS_LIST = [
    // ================= FAMILY 1: כ-ת-ב (WRITE) =================
    createVerb({
      id: "likhtov",
      infinitive: "לִכְתֹּב",
      infinitiveParts: [P("לִ"), R("כְ"), R("תֹּ"), R("ב")],
      translit: "likh·tov",
      english: "to write",
      shortMeaning: "write",
      pastMeaning: "wrote",
      partMeaning: "written",
      root: "כ-ת-ב",
      rootTranslit: ["kh", "t", "v"],
      binyan: "paal",
      preposition: "אֶת (what) / לְ- (to someone)",
      gizrah: "שְׁלֵמִים (Regular, Begedkefet כ/ב)",
      gizrahTip: "Notice how כ starts hard (כָּתַב ka·tav) at the beginning of a word, but softens to 'kh' after a vowel prefix (לִכְתֹּב likh·tov, יִכְתֹּב yikh·tov)!",
      semanticNote: "Base active verb of root כ-ת-ב. Compare with נִכְתַּב (was written - Nif'al), הִכְתִּיב (dictated - Hif'il), and הִתְכַּתֵּב (corresponded - Hitpa'el).",
      examples: [
        { he: "אֲנִי כּוֹתֵב הוֹדָעָה בְּעִבְרִית.", tr: "Ani kotev hoda'ah be'ivrit.", en: "I am writing a message in Hebrew." },
        { he: "הִיא כָּתְבָה סֵפֶר מְעַנְיֵן.", tr: "Hi katvah sefer me'anyen.", en: "She wrote an interesting book." }
      ]
    }),
    createVerb({
      id: "lehikatev",
      infinitive: "לְהִכָּתֵב",
      infinitiveParts: [P("לְהִ"), R("כָּ"), R("תֵ"), R("ב")],
      translit: "le·hi·ka·tev",
      english: "to be written / inscribed",
      shortMeaning: "be written",
      pastMeaning: "was written",
      partMeaning: "written",
      root: "כ-ת-ב",
      rootTranslit: ["kh", "t", "v"],
      binyan: "nifal",
      preposition: "עַל יְדֵי (by)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "In Future & Infinitive (לְהִכָּתֵב), the Nif'al נ disappears into the כ, putting a dagesh dot inside כָּ so it stays a hard 'k' sound!",
      semanticNote: "The direct passive partner of לִכְתֹּב (Pa'al). What someone writes in Pa'al 'is written' (נִכְתָּב) in Nif'al.",
      examples: [
        { he: "הַשִּׁיר נִכְתַּב לִפְנֵי עֶשֶׂר שָׁנִים.", tr: "Hashir nikhtav lifnei eser shanim.", en: "The song was written ten years ago." }
      ]
    }),
    createVerb({
      id: "lehakhtiv",
      infinitive: "לְהַכְתִּיב",
      infinitiveParts: [P("לְהַ"), R("כְ"), R("תִּ"), I("י"), R("ב")],
      translit: "le·hakh·tiv",
      english: "to dictate (cause to write)",
      shortMeaning: "dictate",
      pastMeaning: "dictated",
      partMeaning: "dictated",
      root: "כ-ת-ב",
      rootTranslit: ["kh", "t", "v"],
      binyan: "hifil",
      preposition: "אֶת (what) / לְ- (to whom)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Classic Hif'il 'hi...i' / 'ma...i' pattern. Notice how the 'i' vowel turns into 'a' in 1st/2nd person Past: הִכְתַּבְתִּי (hikhtavti).",
      semanticNote: "Causative of כ-ת-ב: making someone else write = dictating (or setting the pace/rules).",
      examples: [
        { he: "הַמּוֹרָה מַכְתִּיבָה מִלִּים חֲדָשׁוֹת.", tr: "Hamorah makhtivah milim chadashot.", en: "The teacher is dictating new words." }
      ]
    }),
    createVerb({
      id: "hukhtav",
      infinitive: "הֻכְתַּב (פָּעִיל סָבִיל)",
      infinitiveParts: [P("הֻ"), R("כְ"), R("תַּ"), R("ב")],
      translit: "hukh·tav",
      english: "to be dictated (passive)",
      shortMeaning: "be dictated",
      pastMeaning: "was dictated",
      partMeaning: "dictated",
      root: "כ-ת-ב",
      rootTranslit: ["kh", "t", "v"],
      binyan: "hufal",
      preposition: "עַל יְדֵי (by)",
      gizrah: "שְׁלֵמִים (Passive Binyan)",
      gizrahTip: "As a pure passive Binyan, Huf'al has no Infinitive or Imperative. It is listed by its 3rd-person masculine singular Past form (הֻכְתַּב).",
      semanticNote: "The passive mirror of לְהַכְתִּיב (Hif'il).",
      examples: [
        { he: "הַמִּכְתָּב הֻכְתַּב מֵרֹאשׁ.", tr: "Hamikhtav hukhtav merosh.", en: "The letter was dictated in advance." }
      ]
    }),
    createVerb({
      id: "lehitkatev",
      infinitive: "לְהִתְכַּתֵּב",
      infinitiveParts: [P("לְהִתְ"), R("כַּ"), R("תֵּ"), R("ב")],
      translit: "le·hit·ka·tev",
      english: "to correspond / text back & forth",
      shortMeaning: "correspond",
      pastMeaning: "corresponded",
      partMeaning: "corresponding",
      root: "כ-ת-ב",
      rootTranslit: ["k", "t", "v"],
      binyan: "hitpael",
      preposition: "עִם (with someone)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Because הִתְ- ends in a closed syllable, the first root letter כ keeps its hard 'k' sound (מִתְכַּתֵּב mit·ka·tev)!",
      semanticNote: "Reciprocal Hitpa'el: writing to each other (used constantly in Modern Hebrew for texting/messaging back and forth on WhatsApp!).",
      examples: [
        { he: "אֲנַחְנוּ מִתְכַּתְּבִים בְּווֹטְסְאַפּ כָּל הַיּוֹם.", tr: "Anachnu mitkatvim be-WhatsApp kol hayom.", en: "We text back and forth on WhatsApp all day." }
      ]
    }),

    // ================= FAMILY 2: ל-ב-ש (WEAR / DRESS) =================
    createVerb({
      id: "lilbosh",
      infinitive: "לִלְבֹּשׁ",
      infinitiveParts: [P("לִ"), R("לְ"), R("בֹּ"), R("שׁ")],
      translit: "lil·bosh",
      english: "to wear / put on (a garment)",
      shortMeaning: "wear",
      pastMeaning: "wore",
      partMeaning: "worn",
      root: "ל-ב-ש",
      rootTranslit: ["l", "v", "sh"],
      binyan: "paal",
      preposition: "אֶת (a piece of clothing)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Use לִלְבֹּשׁ when you name the specific item of clothing ('I wear a coat'). If there's no object ('I get dressed'), switch to Hitpa'el: לְהִתְלַבֵּשׁ!",
      semanticNote: "Transitive Simple Active: takes a garment as its direct object.",
      examples: [
        { he: "הִיא לוֹבֶשֶׁת מְעִיל חַם.", tr: "Hi loveshet me'il cham.", en: "She is wearing a warm coat." }
      ]
    }),
    createVerb({
      id: "lehalbish",
      infinitive: "לְהַלְבִּישׁ",
      infinitiveParts: [P("לְהַ"), R("לְ"), R("בִּ"), I("י"), R("שׁ")],
      translit: "le·hal·bish",
      english: "to dress (someone else)",
      shortMeaning: "dress (someone)",
      pastMeaning: "dressed (someone)",
      partMeaning: "dressed",
      root: "ל-ב-ש",
      rootTranslit: ["l", "b", "sh"],
      binyan: "hifil",
      preposition: "אֶת (the person being dressed)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "After the closed syllable הַלְ-, the ב has a dagesh dot and is pronounced hard 'b' (le·hal·BISH).",
      semanticNote: "Causative Hif'il: causing another person (like a baby or mannequin) to wear clothes.",
      examples: [
        { he: "הָאָב מַלְבִּישׁ אֶת הַתִּינוֹק בַּבֹּקֶר.", tr: "Ha'av malbish et hatinok baboker.", en: "The father dresses the baby in the morning." }
      ]
    }),
    createVerb({
      id: "lehitlabesh",
      infinitive: "לְהִתְלַבֵּשׁ",
      infinitiveParts: [P("לְהִתְ"), R("לַ"), R("בֵּ"), R("שׁ")],
      translit: "le·hit·la·besh",
      english: "to get dressed (dress oneself)",
      shortMeaning: "get dressed",
      pastMeaning: "got dressed",
      partMeaning: "getting dressed",
      root: "ל-ב-ש",
      rootTranslit: ["l", "b", "sh"],
      binyan: "hitpael",
      preposition: "Intransitive (no object)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "The quintessential reflexive Hitpa'el verb: doing the action of ל-ב-ש to yourself!",
      semanticNote: "Reflexive Hitpa'el: dressing oneself. Compare: לָבַשׁ חוּלְצָה (wore a shirt) vs. הִלְבִּישׁ אֶת הַיֶּלֶד (dressed the child) vs. הִתְלַבֵּשׁ מַהֵר (got dressed quickly).",
      examples: [
        { he: "רֶגַע, אֲנִי עֲדַיִן מִתְלַבֵּשׁ!", tr: "Rega, ani adayin mitlabesh!", en: "One second, I'm still getting dressed!" }
      ]
    }),

    // ================= FAMILY 3: ס-ג-ר (CLOSE) =================
    createVerb({
      id: "lisgor",
      infinitive: "לִסְגֹּר",
      infinitiveParts: [P("לִ"), R("סְ"), R("גֹּ"), R("ר")],
      translit: "lis·gor",
      english: "to close / shut / finalize",
      shortMeaning: "close",
      pastMeaning: "closed",
      partMeaning: "closed",
      root: "ס-ג-ר",
      rootTranslit: ["s", "g", "r"],
      binyan: "paal",
      preposition: "אֶת (door, deal) / עַל (agree on)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Completely regular Pa'al verb. Also used in everyday slang for 'finalizing a plan' (סָגַרְנוּ! — Deal / It's settled!).",
      semanticNote: "Active Pa'al. Compare with נִסְגַּר (was closed / closed down - Nif'al) and הִסְתַּגֵּר (shut oneself in - Hitpa'el).",
      examples: [
        { he: "תִּסְגֹּר בְּבַקָּשָׁה אֶת הַדֶּלֶת.", tr: "Tisgor bevakashah et hadelet.", en: "Please close the door." },
        { he: "סָגַרְנוּ עַל שָׁעָה שֶׁבַע?", tr: "Sagarnu al sha'ah sheva?", en: "Did we settle on seven o'clock?" }
      ]
    }),
    createVerb({
      id: "lehisager",
      infinitive: "לְהִסָּגֵר",
      infinitiveParts: [P("לְהִ"), R("סָּ"), R("גֵ"), R("ר")],
      translit: "le·hi·sa·ger",
      english: "to be closed / to close down",
      shortMeaning: "close down",
      pastMeaning: "closed / was closed",
      partMeaning: "closed",
      root: "ס-ג-ר",
      rootTranslit: ["s", "g", "r"],
      binyan: "nifal",
      preposition: "עַל (decide on — slang)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Notice the Nif'al pattern: נִסְגַּר (nisgar) in Past/Present, לְהִסָּגֵר (lehisager) in Infinitive.",
      semanticNote: "Passive/Middle Nif'al: 'The store closes (נִסְגֶּרֶת) at 8 PM.' Also famous in Israeli slang: מָה נִסְגַּר? ('What's the deal / What's going on?').",
      examples: [
        { he: "הַחֲנוּת נִסְגֶּרֶת בְּשָׁעָה שְׁמוֹנֶה.", tr: "Hachanut nisgeret besha'ah shmoneh.", en: "The shop closes at eight o'clock." }
      ]
    }),
    createVerb({
      id: "lehistager",
      infinitive: "לְהִסְתַּגֵּר",
      infinitiveParts: [P("לְהִ"), R("סְ"), P("תַּ"), R("גֵּ"), R("ר")],
      translit: "le·his·ta·ger",
      english: "to shut oneself in / isolate oneself",
      shortMeaning: "shut oneself in",
      pastMeaning: "shut oneself in",
      partMeaning: "shutting oneself in",
      root: "ס-ג-ר",
      rootTranslit: ["s", "g", "r"],
      binyan: "hitpael",
      preposition: "בְּ- (in a room/house)",
      gizrah: "שִׂכּוּל עִצּוּרִים (Hitpa'el Sibilant Swap)",
      gizrahTip: "Look closely at the prefix! Instead of לְהִתְסַגֵּר, the hissing ס and the ת of הִתְ- swap places → לְהִסְתַּגֵּר (le·his·ta·ger)!",
      semanticNote: "Reflexive Hitpa'el of ס-ג-ר: closing oneself inside a room or withdrawing socially.",
      examples: [
        { he: "הוּא הִסְתַּגֵּר בַּחֶדֶר כְּדֵי לִלְמֹד לַמִּבְחָן.", tr: "Hu histager bacheder kedei lilmod lamivchan.", en: "He shut himself in the room to study for the exam." }
      ]
    }),

    // ================= FAMILY 4: ל-מ-ד (LEARN / TEACH) =================
    createVerb({
      id: "lilmod",
      infinitive: "לִלְמֹד",
      infinitiveParts: [P("לִ"), R("לְ"), R("מֹ"), R("ד")],
      translit: "lil·mod",
      english: "to learn / study",
      shortMeaning: "learn",
      pastMeaning: "learned",
      partMeaning: "learned",
      root: "ל-מ-ד",
      rootTranslit: ["l", "m", "d"],
      binyan: "paal",
      preposition: "אֶת / לְ- (plus infinitive)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "One of the most regular and frequent Pa'al verbs in Hebrew.",
      semanticNote: "In Pa'al, ל-מ-ד means 'to learn/study'. Put the exact same root into Pi'el (לְלַמֵּד) and it means 'to teach'!",
      examples: [
        { he: "אֲנִי לוֹמֶדֶת עִבְרִית כָּל יוֹם.", tr: "Ani lomedet ivrit kol yom.", en: "I study Hebrew every day." }
      ]
    }),
    createVerb({
      id: "lelamed",
      infinitive: "לְלַמֵּד",
      infinitiveParts: [P("לְ"), R("לַ"), R("מֵּ"), R("ד")],
      translit: "le·la·med",
      english: "to teach / instruct",
      shortMeaning: "teach",
      pastMeaning: "taught",
      partMeaning: "taught",
      root: "ל-מ-ד",
      rootTranslit: ["l", "m", "d"],
      binyan: "piel",
      preposition: "אֶת (person or subject)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Notice how in unvoweled Hebrew, לְלַמֵּד (lelamed - to teach) and לִלְמֹד (lilmod - to learn, often written ללמוד with ו) are distinguished by the ו in ללמוד!",
      semanticNote: "Intensive/Active Pi'el of ל-מ-ד: transferring learning to others = teaching.",
      examples: [
        { he: "הוּא מְלַמֵּד מָתֵמָטִיקָה בְּבֵית סֵפֶר.", tr: "Hu melamed matematikah beveit sefer.", en: "He teaches math at a school." }
      ]
    }),

    // ================= FAMILY 5: ד-ב-ר & ס-ד-ר (PI'EL / PU'AL PAIR) =================
    createVerb({
      id: "ledaber",
      infinitive: "לְדַבֵּר",
      infinitiveParts: [P("לְ"), R("דַ"), R("בֵּ"), R("ר")],
      translit: "le·da·ber",
      english: "to speak / talk",
      shortMeaning: "speak",
      pastMeaning: "spoke",
      partMeaning: "spoken",
      root: "ד-ב-ר",
      rootTranslit: ["d", "b", "r"],
      binyan: "piel",
      preposition: "עִם (with) / עַל (about)",
      gizrah: "שְׁלֵמִים (Classic Pi'el)",
      gizrahTip: "The flagship model verb for Binyan Pi'el! Remember: Present starts with מְ- (מְדַבֵּר me·da·ber), Past starts with 'i-e' (דִּבֵּר di·ber).",
      semanticNote: "Core Pi'el conversational verb.",
      examples: [
        { he: "אַתָּה מְדַבֵּר עִבְרִית מְצֻיָּן!", tr: "Atah medaber ivrit metzuyan!", en: "You speak Hebrew excellently!" }
      ]
    }),
    createVerb({
      id: "lesader",
      infinitive: "לְסַדֵּר",
      infinitiveParts: [P("לְ"), R("סַ"), R("דֵּ"), R("ר")],
      translit: "le·sa·der",
      english: "to arrange / tidy / organize",
      shortMeaning: "organize",
      pastMeaning: "organized",
      partMeaning: "organized",
      root: "ס-ד-ר",
      rootTranslit: ["s", "d", "r"],
      binyan: "piel",
      preposition: "אֶת (the room, matters)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Shares the root ס-ד-ר with סֵדֶר (Passover Seder / order) and בְּסֵדֶר (b'seder — okay/in order)!",
      semanticNote: "Active Pi'el: putting things in order. Its passive partner in Pu'al is סֻדַּר / מְסֻדָּר (organized/tidy) and in Hitpa'el is לְהִסְתַּדֵּר (to get along / manage).",
      examples: [
        { he: "צָרִיךְ לְסַדֵּר אֶת הַחֶדֶר לִפְנֵי שֶׁהָאוֹרְחִים בָּאִים.", tr: "Tzarikh lesader et hacheder lifnei sheha'orchim ba'im.", en: "We need to tidy the room before the guests arrive." }
      ]
    }),
    createVerb({
      id: "sudar",
      infinitive: "סֻדַּר (מְסֻדָּר)",
      infinitiveParts: [R("סֻ"), R("דַּ"), R("ר")],
      translit: "su·dar (me·su·dar)",
      english: "to be arranged / organized (passive)",
      shortMeaning: "be organized",
      pastMeaning: "was organized",
      partMeaning: "organized / tidy",
      root: "ס-ד-ר",
      rootTranslit: ["s", "d", "r"],
      binyan: "pual",
      preposition: "—",
      gizrah: "שְׁלֵמִים (Passive Pu'al)",
      gizrahTip: "The Present tense מְסֻדָּר (mesudar) is one of the most useful adjectives in Hebrew: 'tidy, organized, or financially set'!",
      semanticNote: "Passive Pu'al counterpart of לְסַדֵּר (Pi'el).",
      examples: [
        { he: "הַכֹּל כְּבָר סֻדַּר, אַל תִּדְאַג.", tr: "Hakol kvar sudar, al tid'ag.", en: "Everything has already been arranged, don't worry." },
        { he: "הַשֻּׁלְחָן שֶׁלָּהּ תָּמִיד מְסֻדָּר.", tr: "Hashulchan shelah tamid mesudar.", en: "Her desk is always tidy/organized." }
      ]
    }),

    // ================= FAMILY 6: ג-ד-ל (GROW / RAISE / ENLARGE) =================
    createVerb({
      id: "ligdol",
      infinitive: "לִגְדֹּל",
      infinitiveParts: [P("לִ"), R("גְ"), R("דֹּ"), R("ל")],
      translit: "lig·dol",
      english: "to grow / grow up (intransitive)",
      shortMeaning: "grow",
      pastMeaning: "grew",
      partMeaning: "grown",
      root: "ג-ד-ל",
      rootTranslit: ["g", "d", "l"],
      binyan: "paal",
      preposition: "בְּ- (in a place)",
      gizrah: "שְׁלֵמִים (Stative/Intransitive Pa'al)",
      gizrahTip: "In Pa'al, לִגְדֹּל means you yourself grow up. If you grow plants or raise children, you must switch to Pi'el (לְגַדֵּל)!",
      semanticNote: "Intransitive Pa'al of ג-ד-ל (related to גָּדוֹל gadol — big).",
      examples: [
        { he: "הַיְּלָדִים גּוֹדְלִים כָּל כָּךְ מַהֵר.", tr: "Hayeladim godlim kol kach maher.", en: "The kids grow up so fast." }
      ]
    }),
    createVerb({
      id: "legadel",
      infinitive: "לְגַדֵּל",
      infinitiveParts: [P("לְ"), R("גַ"), R("דֵּ"), R("ל")],
      translit: "le·ga·del",
      english: "to raise (kids/pets) / grow (plants, beard)",
      shortMeaning: "raise / cultivate",
      pastMeaning: "raised / grew",
      partMeaning: "raised",
      root: "ג-ד-ל",
      rootTranslit: ["g", "d", "l"],
      binyan: "piel",
      preposition: "אֶת (children, dog, tomatoes)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "English uses 'grow' for both 'kids grow' and 'I grow tomatoes'. Hebrew separates them cleanly by Binyan: לִגְדֹּל (Pa'al) vs. לְגַדֵּל (Pi'el)!",
      semanticNote: "Transitive Pi'el: nurturing something so it grows.",
      examples: [
        { he: "אֲנַחְנוּ מְגַדְּלִים עַגְבָנִיּוֹת בַּגִּנָּה.", tr: "Anachnu megadlim agvaniyot baginah.", en: "We grow tomatoes in the garden." }
      ]
    }),
    createVerb({
      id: "lehagdil",
      infinitive: "לְהַגְדִּיל",
      infinitiveParts: [P("לְהַ"), R("גְ"), R("דִּ"), I("י"), R("ל")],
      translit: "le·hag·dil",
      english: "to enlarge / magnify / supersize",
      shortMeaning: "enlarge",
      pastMeaning: "enlarged",
      partMeaning: "enlarged",
      root: "ג-ד-ל",
      rootTranslit: ["g", "d", "l"],
      binyan: "hifil",
      preposition: "אֶת (photo, meal, font)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Famous in Israeli fast food: 'אֶפְשָׁר לְהַגְדִּיל בְּשֶׁקֶל תִּשְׁעִים?' ('Would you like to supersize for 1.90 NIS?').",
      semanticNote: "Causative Hif'il: making something bigger in size or scale (whereas Pi'el לְגַדֵּל is biological/nurturing growth).",
      examples: [
        { he: "אֶפְשָׁר לְהַגְדִּיל אֶת הַפּוֹנְט בַּמָּסָךְ?", tr: "Efshar lehagdil et hafont bamasakh?", en: "Can you enlarge the font on the screen?" }
      ]
    }),

    // ================= FAMILY 7: פ-ת-ח (GUTTURAL ROOT) =================
    createVerb({
      id: "liftoach",
      infinitive: "לִפְתֹּחַ",
      infinitiveParts: [P("לִ"), R("פְ"), R("תֹּ"), R("חַ")],
      translit: "lif·to·ach",
      english: "to open",
      shortMeaning: "open",
      pastMeaning: "opened",
      partMeaning: "opened",
      root: "פ-ת-ח",
      rootTranslit: ["f", "t", "ch"],
      binyan: "paal",
      preposition: "אֶת (door, account, heart)",
      gizrah: "גִּזְרַת ל״גרונית (3rd Root Letter Guttural ח)",
      gizrahTip: "Because ח is a throat letter, Hebrew adds an extra 'a' sound (furtive patach) at the end of words like לִפְתֹּחַ (lif·TO·ach) and פּוֹתֵחַ (po·TE·ach), and uses יִפְתַּח (yif·tach, with 'a' instead of 'o') in the Future!",
      semanticNote: "Simple Active Pa'al. Compare with לְפַתֵּחַ (Pi'el — to develop software/photos/ideas).",
      examples: [
        { he: "אֲנִי פּוֹתֵחַ אֶת הַחַלּוֹן לְאַוִּיר צַח.", tr: "Ani poteach et hachalon le'avir tzach.", en: "I am opening the window for fresh air." }
      ]
    }),
    createVerb({
      id: "lefateach",
      infinitive: "לְפַתֵּחַ",
      infinitiveParts: [P("לְ"), R("פַ"), R("תֵּ"), R("חַ")],
      translit: "le·fa·te·ach",
      english: "to develop / innovate",
      shortMeaning: "develop",
      pastMeaning: "developed",
      partMeaning: "developed",
      root: "פ-ת-ח",
      rootTranslit: ["f", "t", "ch"],
      binyan: "piel",
      preposition: "אֶת (app, idea, skill)",
      gizrah: "גִּזְרַת ל״גרונית (3rd Root Letter Guttural ח)",
      gizrahTip: "Notice how 'open' (לִפְתֹּחַ) in Pa'al becomes metaphorical 'unfold / develop' (לְפַתֵּחַ) in Pi'el! A software developer in Hebrew is a מְפַתֵּחַ (mefateach).",
      semanticNote: "Intensive Pi'el of פ-ת-ח.",
      examples: [
        { he: "הַצֶּוֶת מְפַתֵּחַ אֶפְּלִיקַצְיָה חֲדָשָׁה.", tr: "Hatzevet mefateach aplikatzyah chadashah.", en: "The team is developing a new app." }
      ]
    }),
    createVerb({
      id: "lehikanes",
      infinitive: "לְהִכָּנֵס",
      infinitiveParts: [P("לְהִ"), R("כָּ"), R("נֵ"), R("ס")],
      translit: "le·hi·ka·nes",
      english: "to enter / go in / log in",
      shortMeaning: "enter",
      pastMeaning: "entered",
      partMeaning: "entering",
      root: "כ-נ-ס",
      rootTranslit: ["kh", "n", "s"],
      binyan: "nifal",
      preposition: "לְ- (into a place / website)",
      gizrah: "שְׁלֵמִים (Inchoative/Active Nif'al)",
      gizrahTip: "Not every Nif'al verb is passive in English! לְהִכָּנֵס means 'to enter' (literally 'to bring oneself in'). Its Hif'il partner לְהַכְנִיס means 'to put/let something in'.",
      semanticNote: "Middle-voice Nif'al of כ-נ-ס.",
      examples: [
        { he: "תִּכָּנֵס בְּבַקָּשָׁה, הַדֶּלֶת פְּתוּחָה!", tr: "Tikanes bevakashah, hadelet ptuchah!", en: "Come on in please, the door is open!" }
      ]
    }),
    createVerb({
      id: "lehakhnis",
      infinitive: "לְהַכְנִיס",
      infinitiveParts: [P("לְהַ"), R("כְ"), R("נִ"), I("י"), R("ס")],
      translit: "le·hakh·nis",
      english: "to put in / insert / let in",
      shortMeaning: "put in / let in",
      pastMeaning: "put in",
      partMeaning: "put in",
      root: "כ-נ-ס",
      rootTranslit: ["kh", "n", "s"],
      binyan: "hifil",
      preposition: "אֶת (what) + לְ- (into)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Causative partner of לְהִכָּנֵס (Nif'al): לְהִכָּנֵס = to go in; לְהַכְנִיס = to make someone/something go in.",
      semanticNote: "Causative Hif'il of כ-נ-ס.",
      examples: [
        { he: "הִכְנַסְתִּי אֶת הֶחָלָב לַמְּקָרֵר.", tr: "Hikhnas'ti et hechalav lamekarer.", en: "I put the milk into the fridge." }
      ]
    }),
    createVerb({
      id: "lehishtamesh",
      infinitive: "לְהִשְׁתַּמֵּשׁ",
      infinitiveParts: [P("לְהִ"), R("שְׁ"), P("תַּ"), R("מֵּ"), R("שׁ")],
      translit: "le·hish·ta·mesh",
      english: "to use / make use of",
      shortMeaning: "use",
      pastMeaning: "used",
      partMeaning: "using",
      root: "ש-מ-ש",
      rootTranslit: ["sh", "m", "sh"],
      binyan: "hitpael",
      preposition: "בְּ- (Always takes בְּ-, never אֶת!)",
      gizrah: "שִׂכּוּל עִצּוּרִים (Hitpa'el Sibilant Swap ש+ת)",
      gizrahTip: "Two crucial tips: 1) Because the root starts with שׁ, the ת of הִתְ- jumps after שׁ → מִשְׁתַּמֵּשׁ (mishtamesh). 2) It ALWAYS takes the preposition בְּ- (משתמש בְּטלפון), never אֶת!",
      semanticNote: "Essential everyday Hitpa'el verb.",
      examples: [
        { he: "בְּאֵיזוֹ אֶפְּלִיקַצְיָה אַתְּ מִשְׁתַּמֶּשֶׁת?", tr: "Be'eizo aplikatzyah at mishtameshet?", en: "Which app do you use?" }
      ]
    }),
    createVerb({
      id: "lekabel",
      infinitive: "לְקַבֵּל",
      infinitiveParts: [P("לְ"), R("קַ"), R("בֵּ"), R("ל")],
      translit: "le·ka·bel",
      english: "to receive / accept / get",
      shortMeaning: "receive",
      pastMeaning: "received",
      partMeaning: "received",
      root: "ק-ב-ל",
      rootTranslit: ["k", "b", "l"],
      binyan: "piel",
      preposition: "אֶת (something) / מִ- (from)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Connected to קַבָּלָה (kabalah — receipt / reception / Kabbalah) and לְהִתְקַבֵּל (Hitpa'el — to be accepted to a job/school).",
      semanticNote: "Active Pi'el of ק-ב-ל.",
      examples: [
        { he: "קִבַּלְתִּי אֶת הָאִימֵייל שֶׁלְּךָ הַבֹּקֶר.", tr: "Kibalti et ha-imeil shelkha haboker.", en: "I received your email this morning." }
      ]
    }),
    createVerb({
      id: "lehazmin",
      infinitive: "לְהַזְמִין",
      infinitiveParts: [P("לְהַ"), R("זְ"), R("מִ"), I("י"), R("ן")],
      translit: "le·haz·min",
      english: "to invite / order (food, tickets)",
      shortMeaning: "invite / order",
      pastMeaning: "invited / ordered",
      partMeaning: "invited / ordered",
      root: "ז-מ-נ",
      rootTranslit: ["z", "m", "n"],
      binyan: "hifil",
      preposition: "אֶת (person or food)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "Comes from the root ז-מ-נ (time/occasion). Its Huf'al passive participle מֻזְמָן (muzman — invited / ordered) is heard everywhere!",
      semanticNote: "Causative Hif'il: summoning/inviting a person or ordering at a restaurant.",
      examples: [
        { he: "הִזְמַנּוּ פִּיצָה וְהִזְמַנּוּ חֲבֵרִים.", tr: "Hizmanu pitzah vehizmanu chaverim.", en: "We ordered pizza and invited friends." }
      ]
    }),
    createVerb({
      id: "muzman",
      infinitive: "הֻזְמַן (מֻזְמָן)",
      infinitiveParts: [P("הֻ"), R("זְ"), R("מַ"), R("ן")],
      translit: "huz·man (muz·man)",
      english: "to be invited / ordered (passive)",
      shortMeaning: "be invited",
      pastMeaning: "was invited / ordered",
      partMeaning: "invited / welcome",
      root: "ז-מ-נ",
      rootTranslit: ["z", "m", "n"],
      binyan: "hufal",
      preposition: "לְ- (to an event or to do something)",
      gizrah: "שְׁלֵמִים (Passive Huf'al)",
      gizrahTip: "In everyday Hebrew, 'אַתָּה מֻזְמָן לְ...' (atah muzman le...) means 'You are welcome to / feel free to...'!",
      semanticNote: "Passive Huf'al counterpart of לְהַזְמִין (Hif'il).",
      examples: [
        { he: "אַתֶּם מֻזְמָנִים לָבוֹא בְּכָל זְמַן!", tr: "Atem muzmanim lavo bekhol zman!", en: "You are welcome (invited) to come anytime!" }
      ]
    }),

    // ================= FAMILY 8: ר-ו-ץ (RUN — HOLLOW ROOT ע״ו) =================
    createVerb({
      id: "larutz",
      infinitive: "לָרוּץ",
      infinitiveParts: [P("לָ"), R("ר"), I("וּ"), R("ץ")],
      translit: "la·rutz",
      english: "to run / jog",
      shortMeaning: "run",
      pastMeaning: "ran",
      partMeaning: "running",
      root: "ר-ו-ץ",
      rootTranslit: ["r", "u", "tz"],
      binyan: "paal",
      preposition: "לְ- (to) / בְּ- (in)",
      gizrah: "גִּזְרַת ע״ו (Hollow Root — middle ו becomes a vowel)",
      gizrahTip: "Because the middle root letter is ו, it melts into a vowel! In Present & Past 3ms, only ר and ץ appear: הוּא רָץ (hu ratz — he runs / he ran). In Future & Infinitive, the ו shines as an 'u' vowel: אָרוּץ (arutz), לָרוּץ (larutz)!",
      semanticNote: "Simple Active Pa'al of ר-ו-ץ. Compare with לְהָרִיץ (Hif'il — to run a program/project or make someone run) and לְהִתְרוֹצֵץ (Hitpa'el — to run around busily).",
      examples: [
        { he: "אֲנִי רָץ בַּפַּארְק כָּל בֹּקֶר.", tr: "Ani ratz bapark kol boker.", en: "I run in the park every morning." },
        { he: "הִיא רָצָה מַהֵר כְּדֵי לְהַסְפִּיק לָאוֹטוֹבּוּס.", tr: "Hi ratzah maher kedei lehaspik la'otobus.", en: "She ran fast to catch the bus." }
      ]
    }),
    createVerb({
      id: "leharitz",
      infinitive: "לְהָרִיץ",
      infinitiveParts: [P("לְהָ"), R("רִ"), I("י"), R("ץ")],
      translit: "le·ha·ritz",
      english: "to run (a program / project / test) / make someone run",
      shortMeaning: "run (something)",
      pastMeaning: "ran (something)",
      partMeaning: "running (something)",
      root: "ר-ו-ץ",
      rootTranslit: ["r", "i", "tz"],
      binyan: "hifil",
      preposition: "אֶת (code, project, person)",
      gizrah: "גִּזְרַת ע״ו (Hollow Root in Hif'il)",
      gizrahTip: "In English, 'run' means both 'I run in the park' AND 'I run the code'. Hebrew uses two different Binyanim of ר-ו-ץ: לָרוּץ (Pa'al — you run) vs. לְהָרִיץ (Hif'il — you cause a program/project to run)!",
      semanticNote: "Causative Hif'il of ר-ו-ץ.",
      examples: [
        { he: "הֵרַצְתִּי אֶת הַקּוֹד וְהַכֹּל עוֹבֵד!", tr: "Heratzti et hakod vehakol oved!", en: "I ran the code and everything works!" }
      ]
    }),
    createVerb({
      id: "lehitzrotzetz",
      infinitive: "לְהִתְרוֹצֵץ",
      infinitiveParts: [P("לְהִתְ"), R("ר"), I("וֹ"), R("צֵ"), R("ץ")],
      translit: "le·hit·ro·tzetz",
      english: "to run around / dash back and forth",
      shortMeaning: "run around",
      pastMeaning: "ran around",
      partMeaning: "running around",
      root: "ר-ו-ץ",
      rootTranslit: ["r", "o", "tz"],
      binyan: "hitpael",
      preposition: "בֵּין (between) / בְּ- (in)",
      gizrah: "גִּזְרַת ע״ו (Hitpolel — doubles final root letter)",
      gizrahTip: "When a Hollow Root like ר-ו-ץ enters Hitpa'el, the middle ו becomes 'o' (וֹ) and the 3rd root letter צ doubles: מִתְרוֹצֵץ (mit·ro·tzetz)!",
      semanticNote: "Reflexive/Iterative Hitpa'el of ר-ו-ץ: running back and forth in many directions.",
      examples: [
        { he: "הַיְּלָדִים מִתְרוֹצְצִים בֶּחָצֵר כָּל הַיּוֹם.", tr: "Hayeladim mitrotzetzim bechatzer kol hayom.", en: "The kids are running around in the yard all day." }
      ]
    }),

    // ================= MORE ESSENTIAL HOLLOW & LAMED-HE EVERYDAY VERBS =================
    createVerb({
      id: "lagur",
      infinitive: "לָגוּר",
      infinitiveParts: [P("לָ"), R("ג"), I("וּ"), R("ר")],
      translit: "la·gur",
      english: "to live / reside",
      shortMeaning: "live (reside)",
      pastMeaning: "lived",
      partMeaning: "living",
      root: "ג-ו-ר",
      rootTranslit: ["g", "u", "r"],
      binyan: "paal",
      preposition: "בְּ- (in a city/home) / עִם (with)",
      gizrah: "גִּזְרַת ע״ו (Hollow Root)",
      gizrahTip: "Follows the exact same hollow pattern as לָרוּץ (to run): גָּר (gar), גָּרָה (garah), גַּרְתִּי (garti), אָגוּר (agur)!",
      semanticNote: "Simple Pa'al of ג-ו-ר (residing/dwelling).",
      examples: [
        { he: "אֵיפֹה אַתֶּם גָּרִים?", tr: "Eifo atem garim?", en: "Where do you live?" }
      ]
    }),
    createVerb({
      id: "lakum",
      infinitive: "לָקוּם",
      infinitiveParts: [P("לָ"), R("ק"), I("וּ"), R("ם")],
      translit: "la·kum",
      english: "to get up / wake up / rise",
      shortMeaning: "get up",
      pastMeaning: "got up",
      partMeaning: "getting up",
      root: "ק-ו-מ",
      rootTranslit: ["k", "u", "m"],
      binyan: "paal",
      preposition: "בְּ- (at a time) / מִ- (from)",
      gizrah: "גִּזְרַת ע״ו (Hollow Root)",
      gizrahTip: "Same hollow rhythm as לָרוּץ and לָגוּר: קָם (kam), קָמָה (kamah), קַמְתִּי (kamti), אָקוּם (akum). In Hif'il, לְהָקִים (lehakim) means 'to establish / set up (a company or state)'!",
      semanticNote: "Intransitive Pa'al of ק-ו-מ.",
      examples: [
        { he: "קַמְתִּי הַיּוֹם בְּשֵׁשׁ בַּבֹּקֶר.", tr: "Kamti hayom beshesh baboker.", en: "I got up today at six in the morning." }
      ]
    }),
    createVerb({
      id: "lashir",
      infinitive: "לָשִׁיר",
      infinitiveParts: [P("לָ"), R("שׁ"), I("ִי"), R("ר")],
      translit: "la·shir",
      english: "to sing",
      shortMeaning: "sing",
      pastMeaning: "sang",
      partMeaning: "singing",
      root: "ש-י-ר",
      rootTranslit: ["sh", "i", "r"],
      binyan: "paal",
      preposition: "אֶת (a song)",
      gizrah: "גִּזְרַת ע״י (Hollow Root with middle י)",
      gizrahTip: "Because the middle root letter is י (instead of ו), the Infinitive and Future have an 'i' sound: לָשִׁיר (lashir), אָשִׁיר (ashir), while Present & Past are שָׁר (shar), שַׁרְתִּי (sharti)!",
      semanticNote: "Simple Active Pa'al of ש-י-ר.",
      examples: [
        { he: "הֵם שָׁרִים יַחַד בַּמְּסִבָּה.", tr: "Hem sharim yachad bamesibah.", en: "They are singing together at the party." }
      ]
    }),
    createVerb({
      id: "liknot",
      infinitive: "לִקְנוֹת",
      infinitiveParts: [P("לִ"), R("קְ"), R("נ"), S("וֹת")],
      translit: "lik·not",
      english: "to buy / purchase",
      shortMeaning: "buy",
      pastMeaning: "bought",
      partMeaning: "buying",
      root: "ק-נ-ה",
      rootTranslit: ["k", "n", "h"],
      binyan: "paal",
      preposition: "אֶת (what) / לְ- (for someone)",
      gizrah: "גִּזְרַת ל״ה (Root ending in ה)",
      gizrahTip: "Model verb for all Pa'al verbs ending in ה! Infinitive ends in -וֹת (לִקְנוֹת), Present is קוֹנֶה / קוֹנָה, and Past 1st/2nd person swaps ה for י: קָנִיתִי (kaniti), קָנִיתָ (kanita)!",
      semanticNote: "Simple Active Pa'al of ק-נ-ה.",
      examples: [
        { he: "קָנִיתִי קָפֶה וּמַאֲפֶה בַּדֶּרֶךְ.", tr: "Kaniti kafeh uma'afeh baderekh.", en: "I bought coffee and a pastry on the way." }
      ]
    }),
    createVerb({
      id: "lirtzot",
      infinitive: "לִרְצוֹת",
      infinitiveParts: [P("לִ"), R("רְ"), R("צ"), S("וֹת")],
      translit: "lir·tzot",
      english: "to want",
      shortMeaning: "want",
      pastMeaning: "wanted",
      partMeaning: "wanting",
      root: "ר-צ-ה",
      rootTranslit: ["r", "tz", "h"],
      binyan: "paal",
      preposition: "אֶת (noun) / לְ- (infinitive)",
      gizrah: "גִּזְרַת ל״ה (Root ending in ה)",
      gizrahTip: "Notice the difference between רָץ (ratz — he runs, root ר-ו-ץ) and רוֹצֶה (rotzeh — he wants, root ר-צ-ה)! And in the feminine: הִיא רָצָה (hi ratzah — she runs/ran) vs. הִיא רוֹצָה (hi rotzah — she wants)!",
      semanticNote: "Compare root ר-צ-ה (לִרְצוֹת — to want) with root ר-ו-ץ (לָרוּץ — to run)!",
      examples: [
        { he: "מָה אַתְּ רוֹצָה לִשְׁתּוֹת?", tr: "Mah at rotzah lishtot?", en: "What do you want to drink?" }
      ]
    }),
    createVerb({
      id: "lechakot",
      infinitive: "לְחַכּוֹת",
      infinitiveParts: [P("לְ"), R("חַ"), R("כּ"), S("וֹת")],
      translit: "le·cha·kot",
      english: "to wait / await",
      shortMeaning: "wait",
      pastMeaning: "waited",
      partMeaning: "waiting",
      root: "ח-כ-ה",
      rootTranslit: ["ch", "k", "h"],
      binyan: "piel",
      preposition: "לְ- (Always takes לְ- for 'wait for'!)",
      gizrah: "גִּזְרַת ל״ה (Pi'el ending in ה)",
      gizrahTip: "Shows how ל״ה roots behave in Pi'el: Infinitive לְחַכּוֹת (lechakot), Present מְחַכֶּה / מְחַכָּה (mechakeh / mechakah), Past חִכִּיתִי (chikiti)!",
      semanticNote: "Intensive Pi'el of ח-כ-ה.",
      examples: [
        { he: "אֲנַחְנוּ מְחַכִּים לָךְ לְמַטָּה!", tr: "Anachnu mechakim lakh lematah!", en: "We are waiting for you downstairs!" }
      ]
    }),
    createVerb({
      id: "lishmor",
      infinitive: "לִשְׁמֹר",
      infinitiveParts: [P("לִ"), R("שְׁ"), R("מֹ"), R("ר")],
      translit: "lish·mor",
      english: "to guard / keep / protect / save",
      shortMeaning: "guard / keep",
      pastMeaning: "guarded / kept",
      partMeaning: "guarded / kept",
      root: "ש-מ-ר",
      rootTranslit: ["sh", "m", "r"],
      binyan: "paal",
      preposition: "עַל (watch over) / אֶת (keep/save)",
      gizrah: "שְׁלֵמִים (Regular)",
      gizrahTip: "With עַל (לִשְׁמֹר עַל) it means 'to protect / babysit / take care of'; with אֶת (לִשְׁמֹר אֶת הַקֹּבֶץ) it means 'to save (a file) / keep'!",
      semanticNote: "Simple Active Pa'al of ש-מ-ר.",
      examples: [
        { he: "תִּשְׁמֹר עַל עַצְמְךָ!", tr: "Tishmor al atzmekha!", en: "Take care of yourself!" }
      ]
    })
  ];

  // Comprehensive English-to-Hebrew Root & Binyan Lexicon so the Workshop knows 50+ everyday English verbs immediately!
  const ENGLISH_ROOT_LEXICON = [
    { en: "run", root: "ר-ו-ץ", binyan: "paal", meaning: "to run / jog", past: "ran", tr: ["r", "u", "tz"], verbId: "larutz" },
    { en: "run (program / project)", root: "ר-ו-ץ", binyan: "hifil", meaning: "to run (code/project) / make run", past: "ran", tr: ["r", "i", "tz"], verbId: "leharitz" },
    { en: "run around", root: "ר-ו-ץ", binyan: "hitpael", meaning: "to run around / dash about", past: "ran around", tr: ["r", "o", "tz"], verbId: "lehitzrotzetz" },
    { en: "write", root: "כ-ת-ב", binyan: "paal", meaning: "to write", past: "wrote", tr: ["kh", "t", "v"], verbId: "likhtov" },
    { en: "dictate", root: "כ-ת-ב", binyan: "hifil", meaning: "to dictate", past: "dictated", tr: ["kh", "t", "v"], verbId: "lehakhtiv" },
    { en: "correspond / text", root: "כ-ת-ב", binyan: "hitpael", meaning: "to correspond / text", past: "corresponded", tr: ["k", "t", "v"], verbId: "lehitkatev" },
    { en: "wear", root: "ל-ב-ש", binyan: "paal", meaning: "to wear (a garment)", past: "wore", tr: ["l", "v", "sh"], verbId: "lilbosh" },
    { en: "dress (someone)", root: "ל-ב-ש", binyan: "hifil", meaning: "to dress someone else", past: "dressed", tr: ["l", "b", "sh"], verbId: "lehalbish" },
    { en: "get dressed", root: "ל-ב-ש", binyan: "hitpael", meaning: "to get dressed", past: "got dressed", tr: ["l", "b", "sh"], verbId: "lehitlabesh" },
    { en: "close", root: "ס-ג-ר", binyan: "paal", meaning: "to close / shut", past: "closed", tr: ["s", "g", "r"], verbId: "lisgor" },
    { en: "learn / study", root: "ל-מ-ד", binyan: "paal", meaning: "to learn / study", past: "learned", tr: ["l", "m", "d"], verbId: "lilmod" },
    { en: "teach", root: "ל-מ-ד", binyan: "piel", meaning: "to teach", past: "taught", tr: ["l", "m", "d"], verbId: "lelamed" },
    { en: "speak / talk", root: "ד-ב-ר", binyan: "piel", meaning: "to speak / talk", past: "spoke", tr: ["d", "b", "r"], verbId: "ledaber" },
    { en: "open", root: "פ-ת-ח", binyan: "paal", meaning: "to open", past: "opened", tr: ["f", "t", "ch"], verbId: "liftoach" },
    { en: "develop", root: "פ-ת-ח", binyan: "piel", meaning: "to develop", past: "developed", tr: ["f", "t", "ch"], verbId: "lefateach" },
    { en: "grow / grow up", root: "ג-ד-ל", binyan: "paal", meaning: "to grow up", past: "grew", tr: ["g", "d", "l"], verbId: "ligdol" },
    { en: "raise / cultivate", root: "ג-ד-ל", binyan: "piel", meaning: "to raise / grow", past: "raised", tr: ["g", "d", "l"], verbId: "legadel" },
    { en: "enlarge", root: "ג-ד-ל", binyan: "hifil", meaning: "to enlarge / magnify", past: "enlarged", tr: ["g", "d", "l"], verbId: "lehagdil" },
    { en: "enter / go in", root: "כ-נ-ס", binyan: "nifal", meaning: "to enter / log in", past: "entered", tr: ["kh", "n", "s"], verbId: "lehikanes" },
    { en: "put in / insert", root: "כ-נ-ס", binyan: "hifil", meaning: "to put in / let in", past: "put in", tr: ["kh", "n", "s"], verbId: "lehakhnis" },
    { en: "use", root: "ש-מ-ש", binyan: "hitpael", meaning: "to use", past: "used", tr: ["sh", "m", "sh"], verbId: "lehishtamesh" },
    { en: "receive / get", root: "ק-ב-ל", binyan: "piel", meaning: "to receive / accept", past: "received", tr: ["k", "b", "l"], verbId: "lekabel" },
    { en: "invite / order", root: "ז-מ-נ", binyan: "hifil", meaning: "to invite / order", past: "invited", tr: ["z", "m", "n"], verbId: "lehazmin" },
    { en: "live / reside", root: "ג-ו-ר", binyan: "paal", meaning: "to live / reside", past: "lived", tr: ["g", "u", "r"], verbId: "lagur" },
    { en: "get up / wake up", root: "ק-ו-מ", binyan: "paal", meaning: "to get up / wake up", past: "got up", tr: ["k", "u", "m"], verbId: "lakum" },
    { en: "sing", root: "ש-י-ר", binyan: "paal", meaning: "to sing", past: "sang", tr: ["sh", "i", "r"], verbId: "lashir" },
    { en: "buy", root: "ק-נ-ה", binyan: "paal", meaning: "to buy", past: "bought", tr: ["k", "n", "h"], verbId: "liknot" },
    { en: "want", root: "ר-צ-ה", binyan: "paal", meaning: "to want", past: "wanted", tr: ["r", "tz", "h"], verbId: "lirtzot" },
    { en: "wait", root: "ח-כ-ה", binyan: "piel", meaning: "to wait", past: "waited", tr: ["ch", "k", "h"], verbId: "lechakot" },
    { en: "guard / keep / save", root: "ש-מ-ר", binyan: "paal", meaning: "to guard / keep", past: "kept", tr: ["sh", "m", "r"], verbId: "lishmor" },
    { en: "fly (by plane)", root: "ט-ו-ס", binyan: "paal", meaning: "to fly (by plane)", past: "flew", tr: ["t", "u", "s"] },
    { en: "rest", root: "נ-ו-ח", binyan: "paal", meaning: "to rest", past: "rested", tr: ["n", "u", "ch"] },
    { en: "see", root: "ר-א-ה", binyan: "paal", meaning: "to see", past: "saw", tr: ["r", "'", "h"] },
    { en: "drink", root: "ש-ת-ה", binyan: "paal", meaning: "to drink", past: "drank", tr: ["sh", "t", "h"] },
    { en: "build", root: "ב-נ-ה", binyan: "paal", meaning: "to build", past: "built", tr: ["b", "n", "h"] },
    { en: "try", root: "נ-ס-ה", binyan: "piel", meaning: "to try / attempt", past: "tried", tr: ["n", "s", "h"] },
    { en: "cook", root: "ב-ש-ל", binyan: "piel", meaning: "to cook", past: "cooked", tr: ["v", "sh", "l"] },
    { en: "pay", root: "ש-ל-מ", binyan: "piel", meaning: "to pay", past: "paid", tr: ["sh", "l", "m"] },
    { en: "remember", root: "ז-כ-ר", binyan: "paal", meaning: "to remember", past: "remembered", tr: ["z", "kh", "r"] },
    { en: "forget", root: "ש-כ-ח", binyan: "paal", meaning: "to forget", past: "forgot", tr: ["sh", "kh", "ch"] },
    { en: "hear / listen", root: "ש-מ-ע", binyan: "paal", meaning: "to hear / listen", past: "heard", tr: ["sh", "m", "'"] },
    { en: "send", root: "ש-ל-ח", binyan: "paal", meaning: "to send", past: "sent", tr: ["sh", "l", "ch"] },
    { en: "check / examine", root: "ב-ד-ק", binyan: "paal", meaning: "to check / test", past: "checked", tr: ["b", "d", "k"] },
    { en: "meet", root: "פ-ג-ש", binyan: "paal", meaning: "to meet", past: "met", tr: ["p", "g", "sh"] },
    { en: "meet up (mutual)", root: "פ-ג-ש", binyan: "nifal", meaning: "to meet up with each other", past: "met up", tr: ["p", "g", "sh"] },
    { en: "ask / request", root: "ב-ק-ש", binyan: "piel", meaning: "to request / ask for", past: "asked for", tr: ["v", "k", "sh"] },
    { en: "search / look for", root: "ח-פ-ש", binyan: "piel", meaning: "to look for / search", past: "searched", tr: ["ch", "p", "s"] },
    { en: "travel / drive", root: "נ-ס-ע", binyan: "paal", meaning: "to travel / drive", past: "traveled", tr: ["n", "s", "'"] },
    { en: "explain", root: "ס-ב-ר", binyan: "hifil", meaning: "to explain", past: "explained", tr: ["s", "b", "r"] },
    { en: "decide", root: "ח-ל-ט", binyan: "hifil", meaning: "to decide", past: "decided", tr: ["ch", "l", "t"] },
    { en: "feel", root: "ר-ג-ש", binyan: "hifil", meaning: "to feel", past: "felt", tr: ["r", "g", "sh"] },
    { en: "get excited", root: "ר-ג-ש", binyan: "hitpael", meaning: "to get excited / moved", past: "got excited", tr: ["r", "g", "sh"] },
    { en: "call (phone)", root: "ק-ש-ר", binyan: "hitpael", meaning: "to call on the phone / connect", past: "called", tr: ["k", "sh", "r"] },
    { en: "apologize", root: "נ-צ-ל", binyan: "hitpael", meaning: "to apologize", past: "apologized", tr: ["n", "tz", "l"] },
    { en: "dance", root: "ר-ק-ד", binyan: "paal", meaning: "to dance", past: "danced", tr: ["r", "k", "d"] },
    { en: "laugh", root: "צ-ח-ק", binyan: "paal", meaning: "to laugh", past: "laughed", tr: ["tz", "ch", "k"] }
  ];


  // Vocabulary from Hebrew from Scratch, Book Bet. Conjugations are deliberately
  // omitted until verified; the generic generator cannot handle every root here.
  const BOOK_BET_VERBS = [
    ["לאסוף", "le'esof", "to gather / collect", "א-ס-פ", "paal"],
    ["לבשל", "levashel", "to cook", "ב-ש-ל", "piel"],
    ["לדאוג", "lid'og", "to worry / take care", "ד-א-ג", "paal"],
    ["להשפיע", "lehashpia", "to influence", "ש-פ-ע", "hifil"],
    ["להתגעגע", "lehitga'agea", "to miss / long for someone", "ג-ע-ג-ע", "hitpael"],
    ["להתחבא", "lehitkhabe", "to hide", "ח-ב-א", "hitpael"],
    ["לטפל", "letapel", "to look after / take care of", "ט-פ-ל", "piel"],
    ["למכור", "limkor", "to sell", "מ-כ-ר", "paal"],
    ["להיגמר", "lehigamer", "to end / run out", "ג-מ-ר", "nifal"],
    ["להיזכר", "lehizakher", "to recall / remember", "ז-כ-ר", "nifal"],
    ["לנגן", "lenagen", "to play an instrument", "נ-ג-נ", "piel"],
    ["לשתוק", "lishtok", "to be silent", "ש-ת-ק", "paal"],
    ["לברוא", "livro", "to create (divine)", "ב-ר-א", "paal"],
    ["להביא", "lehavi", "to bring", "ב-ו-א", "hifil"],
    ["להימצא", "lehimatze", "to be found", "מ-צ-א", "nifal"],
    ["לתפוס", "litfos", "to catch", "ת-פ-ס", "paal"],
    ["לשקר", "leshaker", "to lie", "ש-ק-ר", "piel"],
    ["לשנוא", "lisno", "to hate", "ש-נ-א", "paal"],
    ["לשפוט", "lishpot", "to judge", "ש-פ-ט", "paal", "לשפוע"],
    ["לברוח", "livroach", "to escape / flee", "ב-ר-ח", "paal"],
    ["להתווכח", "lehitvakeach", "to argue", "ו-כ-ח", "hitpael"],
    ["לחבק", "lechabek", "to hug", "ח-ב-ק", "piel"],
    ["להימשך", "lehimashekh", "to last / continue", "מ-ש-כ", "nifal"],
    ["לצבוע", "litzboa", "to color / paint", "צ-ב-ע", "paal"],
    ["להפריע", "lehafria", "to disturb", "פ-ר-ע", "hifil"],
    ["לחייך", "lechayekh", "to smile", "ח-י-כ", "piel"],
    ["למסור", "limsor", "to give / hand over", "מ-ס-ר", "paal"],
    ["להיכשל", "lehikashel", "to fail", "כ-ש-ל", "nifal"],
    ["לצעוק", "litz'ok", "to shout", "צ-ע-ק", "paal"],
    ["לגנוב", "lignov", "to steal", "ג-נ-ב", "paal"],
    ["לגעת", "laga'at", "to touch", "נ-ג-ע", "paal"],
    ["להיעלם", "lehe'alem", "to disappear", "ע-ל-מ", "nifal"],
    ["לצלצל", "letzaltzel", "to ring / call", "צ-ל-צ-ל", "piel"],
    ["לתרגם", "letargem", "to translate", "ת-ר-ג-מ", "piel"],
    ["להתחזק", "lehitkhazek", "to gather strength / grow stronger", "ח-ז-ק", "hitpael"],
    ["לחנך", "lechanekh", "to educate", "ח-נ-כ", "piel"],
    ["לכבד", "lekhabed", "to respect / honor", "כ-ב-ד", "piel"],
    ["להיהרג", "lehareg", "to be killed", "ה-ר-ג", "nifal"],
    ["לפטפט", "lefatpet", "to babble / chatter", "פ-ט-פ-ט", "piel"],
    ["לקשקש", "lekashkesh", "to prattle", "ק-ש-ק-ש", "piel"],
    ["לעלות", "la'alot", "to go up / ascend", "ע-ל-ה", "paal"],
    ["לרדת", "laredet", "to go down / descend", "י-ר-ד", "paal"],
    ["לעוף", "la'uf", "to fly", "ע-ו-פ", "paal"],
    ["לטוס", "latus", "to fly in an airplane", "ט-ו-ס", "paal"],
    ["לשתות", "lishtot", "to drink", "ש-ת-ה", "paal"],
    ["להתקלח", "lehitkaleach", "to shower", "ק-ל-ח", "hitpael"],
    ["להשקות", "lehashkot", "to water plants", "ש-ק-ה", "hifil"]
  ];
  BOOK_BET_VERBS.forEach(([infinitive, translit, english, root, binyan, alias], index) => {
    VERBS_LIST.push({
      id: `book_bet_${index + 1}`, infinitive, infinitiveUnvoweled: infinitive,
      infinitiveParts: [], translit, english, root, binyan,
      aliases: alias ? [alias] : [], vocabularyOnly: true,
      preposition: "—", gizrah: "—", gizrahTip: "Conjugations are not yet available for this entry.",
      semanticNote: alias ? "The source prints לשפוע; the intended verb for ‘to judge’ is לשפוט." : "From Hebrew from Scratch, Book Bet.",
      examples: [], tables: {}
    });
  });

  // Use the checked forms for the bundled deck instead of generated paradigms.
  const personLabels = {
    ms: "masculine singular", fs: "feminine singular", mp: "masculine plural", fp: "feminine plural",
    "1s": "I", "1p": "we", "2ms": "you (m. sg.)", "2fs": "you (f. sg.)",
    "2mp": "you (m. pl.)", "2fp": "you (f. pl.)", "3ms": "he / it", "3fs": "she / it", "3p": "they"
  };
  VERBS_LIST.forEach((verb) => {
    const checked = window.VERIFIED_FORMS && window.VERIFIED_FORMS[verb.id];
    if (!checked) return;
    const tables = { present: {}, past: {} };
    Object.entries(checked.forms).forEach(([key, value]) => {
      const [prefix, person] = key.split("-");
      const tense = prefix === "AP" ? "present" : "past";
      const [full, translit, plain] = value;
      tables[tense][person] = {
        full, translit, unvoweled: plain || stripNikud(full), parts: [],
        english: `${personLabels[person]} · ${verb.english}`
      };
    });
    verb.tables = tables;
    if (checked.infinitive) verb.infinitive = checked.infinitive;
    verb.vocabularyOnly = false;
    verb.verifiedForms = true;
    verb.sourceUrl = checked.url;
    verb.gizrahTip = "Present and past forms checked against Pealim.";
  });

  // Normalize each lexicon entry with .english, .infinitive, and .translit
  const NORMALIZED_LEXICON = ENGLISH_ROOT_LEXICON.map((item) => {
    const spec = buildInfinitiveSpec(item.root, item.binyan, item.tr);
    return {
      ...item,
      english: item.en,
      infinitive: spec.infinitive,
      translit: spec.translit
    };
  });

  // Expose API on window
  window.VERBS_DATA = VERBS_LIST;
  window.ENGLISH_ROOT_LEXICON = NORMALIZED_LEXICON;
  window.stripNikud = stripNikud;
  window.autoTranslitRoot = autoTranslitRoot;
  window.detectGizrah = detectGizrah;
  window.buildInfinitiveSpec = buildInfinitiveSpec;
  window.buildRegularParadigm = buildRegularParadigm;
  window.createVerb = createVerb;
})();
