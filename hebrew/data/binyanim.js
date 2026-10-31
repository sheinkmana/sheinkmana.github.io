// Deep pedagogical & morphological data for the 7 Hebrew Binyanim (בניינים)
window.BINYANIM_DATA = {
  overview: {
    title: "The 7 Binyanim: Architecture of Hebrew Verbs",
    subtitle: "In Hebrew, almost every verb is built from a 3-letter Root (שׁוֹרֶשׁ — Shoresh) placed inside one of 7 structural 'Buildings' (בִּנְיָנִים — Binyanim). The root carries the core concept; the binyan controls the voice, intensity, and direction of the action.",
    pairs: [
      {
        id: "simple",
        label: "Floor 1 · Simple Action (Qal)",
        description: "Everyday basic actions and their natural passive or middle-voice counterparts.",
        active: "paal",
        passive: "nifal"
      },
      {
        id: "intensive",
        label: "Floor 2 · Intensive / Deliberate Action",
        description: "Focused, repeated, or state-changing actions and their pure passive forms.",
        active: "piel",
        passive: "pual"
      },
      {
        id: "causative",
        label: "Floor 3 · Causative Action",
        description: "Causing someone/something else to do or become the root concept.",
        active: "hifil",
        passive: "hufal"
      },
      {
        id: "reflexive",
        label: "The Roof · Reflexive & Reciprocal",
        description: "Actions done to oneself, to each other, or gradual processes of becoming.",
        active: "hitpael",
        passive: null
      }
    ]
  },

  binyanim: {
    paal: {
      id: "paal",
      hebrew: "פָּעַל",
      altName: "קַל (Qal)",
      name: "Pa'al",
      role: "Simple Active",
      voice: "Active",
      counterpart: "nifal",
      counterpartRelation: "Passive / Middle counterpart: Nif'al (נִפְעַל)",
      frequency: "Very High (Core conversational)",
      color: "#c86428",
      bgLight: "#fdf4ee",
      borderLight: "#f3d4be",
      vowelMelody: {
        past: "a – a (כָּתַב ka·tav)",
        present: "o – e (כּוֹתֵב ko·tev)",
        future: "yi – o (יִכְתֹּב yikh·tov)",
        infinitive: "li·CCoC (לִכְתֹּב likh·tov)"
      },
      hallmark: "No prefix in Past or Present! Look for the signature 'o' vowel (חוֹלָם) after the first root letter in Present (כּוֹתֵב) and Infinitive (לִכְתּוֹב).",
      pedagogyTip: "Pa'al is called 'Qal' (light/unburdened) because the 3 root letters stand naked in the past and present without extra binyan prefixes.",
      template: {
        past3ms: "◌ָ◌ַ◌",
        presentMs: "◌וֹ◌ֵ◌",
        future3ms: "יִ◌ְ◌ֹ◌",
        infinitive: "לִ◌ְ◌ֹ◌"
      }
    },
    nifal: {
      id: "nifal",
      hebrew: "נִפְעַל",
      altName: "Passive / Middle of Pa'al",
      name: "Nif'al",
      role: "Simple Passive & Inchoative",
      voice: "Passive / Middle",
      counterpart: "paal",
      counterpartRelation: "Active counterpart: Pa'al (פָּעַל)",
      frequency: "High (Everyday passive & state verbs)",
      color: "#2b6cb0",
      bgLight: "#eff6ff",
      borderLight: "#bfdbfe",
      vowelMelody: {
        past: "ni – a (נִכְתַּב nikh·tav)",
        present: "ni – a (נִכְתָּב nikh·tav)",
        future: "yiCaCeC (יִכָּתֵב yi·ka·tev)",
        infinitive: "le·hiCaCeC (לְהִכָּתֵב le·hi·ka·tev)"
      },
      hallmark: "Prefix נִ- (ni-) in Past & Present! In Future and Infinitive, the נ assimilates into the first root letter, creating an unmistakable 'i-a-e' melody (לְהִכָּנֵס le-hi-ka-nes).",
      pedagogyTip: "Nif'al isn't only passive ('was written')! It also expresses entering a state ('got tired', 'entered' — לְהִכָּנֵס) or actions that happen by themselves ('opened up', 'broke'). Notice how Past (נִכְתַּב) and Present (נִכְתָּב) look almost identical without nikud!",
      template: {
        past3ms: "נִ◌ְ◌ַ◌",
        presentMs: "נִ◌ְ◌ָ◌",
        future3ms: "יִ◌ָּ◌ֵ◌",
        infinitive: "לְהִ◌ָּ◌ֵ◌"
      }
    },
    piel: {
      id: "piel",
      hebrew: "פִּעֵל",
      altName: " פיעל (Ktiv Male)",
      name: "Pi'el",
      role: "Intensive / Deliberate Active",
      voice: "Active",
      counterpart: "pual",
      counterpartRelation: "Passive counterpart: Pu'al (פֻּעַל)",
      frequency: "Very High (Action & modern verbs)",
      color: "#0f766e",
      bgLight: "#f0fdfa",
      borderLight: "#99f6e4",
      vowelMelody: {
        past: "i – e (דִּבֵּר di·ber)",
        present: "me – a – e (מְדַבֵּר me·da·ber)",
        future: "ye – a – e (יְדַבֵּר ye·da·ber)",
        infinitive: "le·CaCeC (לְדַבֵּר le·da·ber)"
      },
      hallmark: "Present tense starts with מְ- (me-da-ber), and the Infinitive starts with לְ- (le-da-ber) instead of לִ-. Historically doubles (dagesh) the middle root letter.",
      pedagogyTip: "When Modern Hebrew invents new verbs from nouns or foreign words (even 4-letter roots like לְטַלְפֵּן 'to phone' or לְפַרְסֵם 'to publish'), Pi'el is the go-to workshop!",
      template: {
        past3ms: "◌ִ◌ֵּ◌",
        presentMs: "מְ◌ַ◌ֵּ◌",
        future3ms: "יְ◌ַ◌ֵּ◌",
        infinitive: "לְ◌ַ◌ֵּ◌"
      }
    },
    pual: {
      id: "pual",
      hebrew: "פֻּעַל",
      altName: "פועל (Ktiv Male)",
      name: "Pu'al",
      role: "Intensive Passive",
      voice: "Passive",
      counterpart: "piel",
      counterpartRelation: "Active counterpart: Pi'el (פִּעֵל)",
      frequency: "Moderate (Participles like מְסֻדָּר / מְצֻיָּן are super common!)",
      color: "#0369a1",
      bgLight: "#f0f9ff",
      borderLight: "#bae6fd",
      vowelMelody: {
        past: "u – a (סֻדַּר su·dar)",
        present: "me – u – a (מְסֻדָּר me·su·dar)",
        future: "ye – u – a (יְסֻדַּר ye·su·dar)",
        infinitive: "— (Passive binyanim have no infinitive or imperative!)"
      },
      hallmark: "The 'u – a' vowel melody across every tense! And because a passive action can't be commanded, Pu'al has NO Imperative and NO Infinitive.",
      pedagogyTip: "Don't be scared of Pu'al! You already know its Present tense forms as everyday Hebrew adjectives: מְצֻיָּן (metzuyan - excellent), מְסֻדָּר (mesudar - tidy/organized), מְאֻשָּׁר (me'ushar - happy). Once you know those, you know Pu'al!",
      template: {
        past3ms: "◌ֻ◌ַּ◌",
        presentMs: "מְ◌ֻ◌ָּ◌",
        future3ms: "יְ◌ֻ◌ַּ◌",
        infinitive: "—"
      }
    },
    hifil: {
      id: "hifil",
      hebrew: "הִפְעִיל",
      altName: "Causative Active",
      name: "Hif'il",
      role: "Causative Active",
      voice: "Active",
      counterpart: "hufal",
      counterpartRelation: "Passive counterpart: Huf'al (הֻפְעַל)",
      frequency: "Very High (Causation & everyday actions)",
      color: "#7c3aed",
      bgLight: "#f5f3ff",
      borderLight: "#ddd6fe",
      vowelMelody: {
        past: "hi – i (הִכְתִּיב hikh·tiv)",
        present: "ma – i (מַכְתִּיב makh·tiv)",
        future: "ya – i (יַכְתִּיב yakh·tiv)",
        infinitive: "le·haCCiC (לְהַכְתִּיב le·hakh·tiv)"
      },
      hallmark: "Look for two markers: the prefix הִ-/מַ-/לְהַ- at the front, and the long 'ee' vowel (י — חיריק מלא) squeezed between the 2nd and 3rd root letters!",
      pedagogyTip: "Hif'il often turns a Pa'al verb into 'cause someone to do X': לִלְמוֹד (learn) → לְהַלְמִיד/לְהַכְתִּיב (write → dictate), לִלְבּוֹשׁ (wear) → לְהַלְבִּישׁ (dress someone else), לִגְדּוֹל (grow up) → לְהַגְדִּיל (enlarge).",
      template: {
        past3ms: "הִ◌ְ◌ִ◌",
        presentMs: "מַ◌ְ◌ִ◌",
        future3ms: "יַ◌ְ◌ִ◌",
        infinitive: "לְהַ◌ְ◌ִ◌"
      }
    },
    hufal: {
      id: "hufal",
      hebrew: "הֻפְעַל",
      altName: "הופעל (Ktiv Male)",
      name: "Huf'al",
      role: "Causative Passive",
      voice: "Passive",
      counterpart: "hifil",
      counterpartRelation: "Active counterpart: Hif'il (הִפְעִיל)",
      frequency: "Low–Moderate (News, formal, & adjectives like מֻכָּר / מֻשְׁלָם)",
      color: "#6d28d9",
      bgLight: "#faf5ff",
      borderLight: "#e9d5ff",
      vowelMelody: {
        past: "hu – a (הֻכְתַּב hukh·tav)",
        present: "mu – a (מֻכְתָּב mukh·tav)",
        future: "yu – a (יֻכְתַּב yukh·tav)",
        infinitive: "— (No infinitive or imperative)"
      },
      hallmark: "Starts with הֻ- (hu-) in Past and מֻ- (mu-) in Present, with a consistent 'u – a' melody. Like Pu'al, it has no Imperative or Infinitive.",
      pedagogyTip: "Just like Pu'al, Huf'al is easiest to remember through its famous Present-tense participles: מֻשְׁלָם (mushlam - perfect), מֻכָּר (mukar - familiar/known), מֻזְמָן (muzman - invited).",
      template: {
        past3ms: "הֻ◌ְ◌ַ◌",
        presentMs: "מֻ◌ְ◌ָ◌",
        future3ms: "יֻ◌ְ◌ַ◌",
        infinitive: "—"
      }
    },
    hitpael: {
      id: "hitpael",
      hebrew: "הִתְפַּעֵל",
      altName: "Reflexive / Reciprocal",
      name: "Hitpa'el",
      role: "Reflexive, Reciprocal & Becoming",
      voice: "Reflexive / Mutual",
      counterpart: null,
      counterpartRelation: "Self-contained reflexive & reciprocal building",
      frequency: "Very High (Daily routines & mutual actions)",
      color: "#be185d",
      bgLight: "#fdf2f8",
      borderLight: "#fbcfe8",
      vowelMelody: {
        past: "hit – a – e (הִתְלַבֵּשׁ hit·la·besh)",
        present: "mit – a – e (מִתְלַבֵּשׁ mit·la·besh)",
        future: "yit – a – e (יִתְלַבֵּשׁ yit·la·besh)",
        infinitive: "le·hitCaCeC (לְהִתְלַבֵּשׁ le·hit·la·besh)"
      },
      hallmark: "The easiest Binyan to spot! Always has the 'hit / mit / yit' prefix block (הִתְ- / מִתְ- / יִתְ-) right before the 3 root letters.",
      pedagogyTip: "Watch out for the 'Sibilant Swap' (שיכול עיצורים): when the 1st root letter is a hissing sound (ש, ס, צ, ז), the ת of הִתְ- jumps AFTER the first root letter so it's easier to pronounce! E.g. הִתְ + סגר → הִסְתַּגֵּר (histager), הִתְ + שמש → הִשְׁתַּמֵּשׁ (hishtamesh).",
      template: {
        past3ms: "הִתְ◌ַ◌ֵּ◌",
        presentMs: "מִתְ◌ַ◌ֵּ◌",
        future3ms: "יִתְ◌ַ◌ֵּ◌",
        infinitive: "לְהִתְ◌ַ◌ֵּ◌"
      }
    }
  },

  rootFamilies: [
    {
      root: "ר-ו-ץ",
      coreMeaning: "Running & Motion (Hollow Root ע״ו)",
      explanation: "Shows how a 'Hollow Root' (where the middle ו melts into a vowel) transforms from physical running (Pa'al) to running a program/project (Hif'il) to dashing around (Hitpa'el).",
      members: {
        paal: { hebrew: "לָרוּץ", past: "רָץ", translit: "larutz", meaning: "to run / jog (active)", verbId: "larutz" },
        hifil: { hebrew: "לְהָרִיץ", past: "הֵרִיץ", translit: "leharitz", meaning: "to run (a program/project) / make someone run", verbId: "leharitz" },
        hufal: { hebrew: "הוּרַץ", past: "הוּרַץ", translit: "huratz", meaning: "was run / executed (software/test)", verbId: null },
        hitpael: { hebrew: "לְהִתְרוֹצֵץ", past: "הִתְרוֹצֵץ", translit: "lehitzrotzetz", meaning: "to run around busily / dash back & forth", verbId: "lehitzrotzetz" }
      }
    },
    {
      root: "כ-ת-ב",
      coreMeaning: "Writing & Inscription",
      explanation: "The classic textbook root showing how one concept ('write') travels through 5 different Binyanim.",
      members: {
        paal: { hebrew: "לִכְתֹּב", past: "כָּתַב", translit: "likhtov", meaning: "to write (simple active)", verbId: "likhtov" },
        nifal: { hebrew: "לְהִכָּתֵב", past: "נִכְתַּב", translit: "lehikatev", meaning: "to be written (simple passive)", verbId: "lehikatev" },
        piel: { hebrew: "לְכַתֵּב", past: "כִּתֵּב", translit: "lekhatev", meaning: "to CC / address a copy to", verbId: null },
        pual: { hebrew: "מְכֻתָּב", past: "כֻּתַּב", translit: "mekhutav", meaning: "addressee / CC'd (passive)", verbId: null },
        hifil: { hebrew: "לְהַכְתִּיב", past: "הִכְתִּיב", translit: "lehakhtiv", meaning: "to dictate (cause someone to write)", verbId: "lehakhtiv" },
        hufal: { hebrew: "הֻכְתַּב", past: "הֻכְתַּב", translit: "hukhtav", meaning: "was dictated (causative passive)", verbId: "hukhtav" },
        hitpael: { hebrew: "לְהִתְכַּתֵּב", past: "הִתְכַּתֵּב", translit: "lehitkatev", meaning: "to correspond / text back & forth (reciprocal)", verbId: "lehitkatev" }
      }
    },
    {
      root: "ל-ב-ש",
      coreMeaning: "Clothing & Wearing",
      explanation: "Shows the crystal-clear difference between doing something to an object (Pa'al), to someone else (Hif'il), or to yourself (Hitpa'el).",
      members: {
        paal: { hebrew: "לִלְבֹּשׁ", past: "לָבַשׁ", translit: "lilbosh", meaning: "to wear / put on (a garment)", verbId: "lilbosh" },
        nifal: { hebrew: "נִלְבַּשׁ", past: "נִלְבַּשׁ", translit: "nilbash", meaning: "to be worn", verbId: null },
        hifil: { hebrew: "לְהַלְבִּישׁ", past: "הִלְבִּישׁ", translit: "lehalbish", meaning: "to dress someone else (e.g., a child)", verbId: "lehalbish" },
        hufal: { hebrew: "הֻלְבַּשׁ", past: "הֻלְבַּשׁ", translit: "hulbash", meaning: "was dressed (by someone)", verbId: null },
        hitpael: { hebrew: "לְהִתְלַבֵּשׁ", past: "הִתְלַבֵּשׁ", translit: "lehitlabesh", meaning: "to get dressed (dress oneself)", verbId: "lehitlabesh" }
      }
    },
    {
      root: "ס-ג-ר",
      coreMeaning: "Closing & Enclosing",
      explanation: "Great example of Nif'al passive vs. Hitpa'el reflexive (and shows the הסת- sibilant swap in Hitpa'el!).",
      members: {
        paal: { hebrew: "לִסְגֹּר", past: "סָגַר", translit: "lisgor", meaning: "to close / shut", verbId: "lisgor" },
        nifal: { hebrew: "לְהִסָּגֵר", past: "נִסְגַּר", translit: "lehisager", meaning: "to be closed / close down", verbId: "lehisager" },
        piel: { hebrew: "לְסַגֵּר", past: "סִגֵּר", translit: "lesager", meaning: "to frame / bracket", verbId: null },
        pual: { hebrew: "מְסֻגָּר", past: "סֻגַּר", translit: "mesugar", meaning: "introverted / enclosed", verbId: null },
        hifil: { hebrew: "לְהַסְגִּיר", past: "הִסְגִּיר", translit: "lehasgir", meaning: "to extradite / turn over", verbId: null },
        hitpael: { hebrew: "לְהִסְתַּגֵּר", past: "הִסְתַּגֵּר", translit: "lehistager", meaning: "to shut oneself in / isolate", verbId: "lehistager" }
      }
    },
    {
      root: "ל-מ-ד",
      coreMeaning: "Learning & Teaching",
      explanation: "Notice how Pa'al is 'learn' (acquire knowledge) while Pi'el is 'teach' (actively impart knowledge)!",
      members: {
        paal: { hebrew: "לִלְמֹד", past: "לָמַד", translit: "lilmod", meaning: "to learn / study", verbId: "lilmod" },
        nifal: { hebrew: "לְהִלָּמֵד", past: "נִלְמַד", translit: "lehilamed", meaning: "to be learned / taught", verbId: null },
        piel: { hebrew: "לְלַמֵּד", past: "לִמֵּד", translit: "lelamed", meaning: "to teach / instruct", verbId: "lelamed" },
        pual: { hebrew: "מְלֻמָּד", past: "לֻמַּד", translit: "melumad", meaning: "learned / scholarly / trained", verbId: null },
        hitpael: { hebrew: "לְהִתְלַמֵּד", past: "הִתְלַמֵּד", translit: "lehitlamed", meaning: "to apprentice / train oneself", verbId: null }
      }
    },
    {
      root: "ג-ד-ל",
      coreMeaning: "Growth & Size",
      explanation: "Shows how an intransitive state in Pa'al ('grow up') becomes transitive in Pi'el ('raise/grow') and causative in Hif'il ('enlarge/zoom').",
      members: {
        paal: { hebrew: "לִגְדֹּל", past: "גָּדַל", translit: "ligdol", meaning: "to grow / grow up (intransitive)", verbId: "ligdol" },
        piel: { hebrew: "לְגַדֵּל", past: "גִּדֵּל", translit: "legadel", meaning: "to raise (kids/pets) / grow (plants)", verbId: "legadel" },
        pual: { hebrew: "גֻּדַּל", past: "גֻּדַּל", translit: "gudal", meaning: "was raised / bred", verbId: null },
        hifil: { hebrew: "לְהַגְדִּיל", past: "הִגְדִּיל", translit: "lehagdil", meaning: "to enlarge / magnify / supersize", verbId: "lehagdil" },
        hufal: { hebrew: "הֻגְדַּל", past: "הֻגְדַּל", translit: "hugdal", meaning: "was enlarged / increased", verbId: null }
      }
    },
    {
      root: "פ-ת-ח",
      coreMeaning: "Opening & Developing",
      explanation: "A root ending in a guttural letter (ח), illustrating how physical 'open' (Pa'al) becomes 'develop' (Pi'el / Hitpa'el).",
      members: {
        paal: { hebrew: "לִפְתֹּחַ", past: "פָּתַח", translit: "liftoach", meaning: "to open", verbId: "liftoach" },
        nifal: { hebrew: "לְהִפָּתֵחַ", past: "נִפְתַּח", translit: "lehipateach", meaning: "to be opened / open up", verbId: null },
        piel: { hebrew: "לְפַתֵּחַ", past: "פִּתֵּחַ", translit: "lefateach", meaning: "to develop / cultivate", verbId: "lefateach" },
        pual: { hebrew: "מְפֻתָּח", past: "פֻּתַּח", translit: "mefutach", meaning: "developed / advanced", verbId: null },
        hitpael: { hebrew: "לְהִתְפַּתֵּחַ", past: "הִתְפַּתֵּחַ", translit: "lehitpateach", meaning: "to develop / evolve (intransitive)", verbId: null }
      }
    }
  ],

  irregularitiesGuide: [
    {
      id: "regular",
      title: "שְׁלֵמִים · Regular ('Whole') Roots",
      badge: "Standard Pattern",
      summary: "All 3 root letters stay visible and pronounceable in every tense.",
      detail: "Notice the 'Begedkefet' (בג״ד כפ״ת) rule: letters ב, כ, פ alternate between a hard sound (with a dot/dagesh: b, k, p) at the start of a word or after a closed syllable, and a soft sound (v, kh, f) after a vowel! For example: כָּתַב (ka·tav) → לִכְתֹּב (likh·tov)."
    },
    {
      id: "guttural",
      title: "גְּרוֹנִיּוֹת · Guttural Roots (א, ה, ח, ע, ר)",
      badge: "Loves 'A' Vowels",
      summary: "Throat letters cannot be doubled (no dagesh) and strongly prefer 'a' (פַּתַח) vowels around them.",
      detail: "When ח, ע, or ה is the 3rd root letter, Hebrew slips in a 'furtive patach' (פַּתַח גְּנוּבָה) right before it so your throat can pronounce it: לִפְתֹּחַ is pronounced lif-TO-ach (not lif-toch!). When a guttural is in the middle in Pi'el/Hitpa'el, the preceding vowel lengthens (e.g., לְבָרֵךְ le-va-rekh instead of le-va-rekh)."
    },
    {
      id: "lamed-he",
      title: "גִּזְרַת ל״ה · Roots Ending in ה (like ר-א-ה, ע-ש-ה, ק-נ-ה)",
      badge: "Infinitive ends in -וֹת",
      summary: "Whenever the 3rd root letter is ה, the Infinitive ALWAYS ends in -וֹת (-ot)!",
      detail: "Instead of לִרְאֹה, it becomes לִרְאוֹת (lir'ot — to see), לַעֲשׂוֹת (la'asot — to do), לִקְנוֹת (liknot — to buy), לְחַכּוֹת (lechakot — to wait). In the 1st/2nd person Past tense, that final ה turns into a י (רָאִיתִי ra'iti, עָשִׂיתָ asita)!"
    },
    {
      id: "hollow",
      title: "גִּזְרַת ע״ו / ע״י · Hollow Roots (Middle ו or י)",
      badge: "2-Syllable Rhythm",
      summary: "A weak ו or י in the middle melts into a pure vowel (קָם kam, גָּר gar, טָס tas, שָׁר shar).",
      detail: "In Past and Present tense of Pa'al, the masculines look identical: הוּא גָּר (he lived / he lives), הוּא קָם (he got up / he gets up). Only the feminine singular separates them by stress or vowel!"
    },
    {
      id: "metathesis",
      title: "שִׂכּוּל עִצּוּרִים · Hitpa'el Sibilant Swap (ש, ס, צ, ז)",
      badge: "Hitpa'el Trick",
      summary: "The ת of הִתְ- swaps places with a hissing first root letter (ש, ס, צ, ז).",
      detail: "Try saying 'hit-sager' fast—your tongue trips! So Hebrew swaps the ת and ס: הִתְ + סָגַר → הִסְתַּגֵּר (histager). With צ, the ת even transforms into an emphatic ט: הִתְ + צָלֵם → הִצְטַלֵּם (hitztalem — to take a selfie)!"
    }
  ]
};
