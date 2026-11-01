// Local, offline translations. Hebrew text and user-entered content are left intact.
(function () {
  const phrases = {
    'Calm, morphological Hebrew verb companion · Inspired by Pealim': 'Наглядный справочник по глаголам иврита · По мотивам Pealim',
    'Verb Explorer': 'Справочник глаголов', 'The 7 Binyanim Map': 'Карта семи биньянов', 'Pattern Trainer': 'Тренажёр биньянов', 'Study Deck & Workshop': 'Карточки и мастерская',
    'Color-Code Root & Pattern': 'Выделять корень и модель цветом', 'Everyday Spoken Hebrew': 'Разговорный иврит', 'Street Mode (Hide Nikud)': 'Без огласовок', 'Street Mode ON (No Nikud)': 'Без огласовок: вкл.',
    'Anatomy Key:': 'Обозначения:', 'Prefix (תחילית)': 'Приставка (תחילית)', '3-Letter Root (שׁוֹרֶשׁ)': 'Корень из трёх букв (שׁוֹרֶשׁ)', 'Binyan Vowel (תבנית)': 'Гласная биньяна (תבנית)', 'Person Ending (סיומת)': 'Личное окончание (סיומת)',
    'All (7)': 'Все (7)', 'Reverse-conjugation search enabled': 'Поиск по формам глагола включён',
    'Search English, Hebrew, translit, or root (כ-ת-ב)...': 'Поиск на русском, английском, иврите, по транслитерации или корню (כ-ת-ב)...', 'Clear search': 'Очистить поиск',
    'to write': 'писать', 'to be written / inscribed': 'быть написанным / начертанным', 'to dictate (cause to write)': 'диктовать', 'to be dictated (passive)': 'быть продиктованным', 'to correspond / text back & forth': 'переписываться',
    'to wear / put on (a garment)': 'носить / надевать одежду', 'to dress (someone else)': 'одевать кого-то', 'to get dressed (dress oneself)': 'одеваться', 'to close / shut / finalize': 'закрывать / завершать', 'to be closed / to close down': 'быть закрытым / закрываться', 'to shut oneself in / isolate oneself': 'запираться / изолироваться',
    'to learn / study': 'учиться / изучать', 'to teach / instruct': 'учить / преподавать', 'to speak / talk': 'говорить / разговаривать', 'to arrange / tidy / organize': 'расставлять / приводить в порядок', 'to be arranged / organized (passive)': 'быть организованным', 'to grow / grow up (intransitive)': 'расти / вырастать', 'to raise (kids/pets) / grow (plants, beard)': 'растить / выращивать', 'to enlarge / magnify / supersize': 'увеличивать',
    'to open': 'открывать', 'to develop / innovate': 'разрабатывать / развивать', 'to enter / go in / log in': 'входить / заходить', 'to put in / insert / let in': 'вставлять / впускать', 'to use / make use of': 'использовать', 'to receive / accept / get': 'получать / принимать', 'to invite / order (food, tickets)': 'приглашать / заказывать', 'to be invited / ordered (passive)': 'быть приглашённым / заказанным',
    'to run / jog': 'бегать', 'to run (a program / project / test) / make someone run': 'запускать / заставлять бежать', 'to run around / dash back and forth': 'бегать туда-сюда', 'to live / reside': 'жить / проживать', 'to get up / wake up / rise': 'вставать / просыпаться', 'to sing': 'петь', 'to buy / purchase': 'покупать', 'to want': 'хотеть', 'to wait / await': 'ждать', 'to guard / keep / protect / save': 'охранять / хранить / защищать',
    '★ Saved in Study Deck': '★ Сохранено в карточках', '☆ Save to Study Deck': '☆ Сохранить в карточки', '↗ Verify / compare on Pealim.com': '↗ Проверить на Pealim.com', 'Root (שׁוֹרֶשׁ):': 'Корень (שׁוֹרֶשׁ):', 'Voice:': 'Залог:', 'Preposition:': 'Предлог:', 'Pattern Class (גִּזְרָה):': 'Класс корня (גִּזְרָה):', '🔗 Root Connection:': '🔗 Связь с корнем:',
    'All Tenses Overview': 'Все времена', 'הֹוֶה · Present (4)': 'הֹוֶה · Настоящее (4)', 'עָבָר · Past': 'עָבָר · Прошедшее', 'Showing Everyday Spoken Forms (archaic f.pl. hidden)': 'Разговорные формы (редкие формы женского множественного числа скрыты)', 'Showing Full Academic Paradigm': 'Полная парадигма', '💬 Real-World Context Sentences': '💬 Примеры в контексте',
    'Masculine Singular': 'Мужской род, единственное число', 'Feminine Singular': 'Женский род, единственное число', 'Masculine Plural': 'Мужской род, множественное число', 'Feminine Plural': 'Женский род, множественное число', 'Past:': 'Прошедшее:', 'Present:': 'Настоящее:', 'Infinitive:': 'Инфинитив:', 'How to Spot It:': 'Как распознать:', '→ Open full table': '→ Открыть полную таблицу',
    '🎯 Active Pattern Trainer': '🎯 Тренажёр биньянов', 'Score:': 'Счёт:', '1. Spot the Binyan': '1. Определите биньян', '2. Build the Conjugation': '2. Образуйте форму', '3. Read Without Nikud (כתיב מלא)': '3. Чтение без огласовок (כתיב מלא)', '+ Build & Open Verb': '+ Создать и открыть глагол', 'Binyan (בִּנְיָן)': 'Биньян (בִּנְיָן)', 'English Meaning (auto-matches known roots!)': 'Значение на английском (автоматический поиск корня)',
    'Pronounce in Hebrew': 'Произнести на иврите', 'Hear pronunciation': 'Прослушать произношение', 'Remove custom verb': 'Удалить свой глагол', '✕ Remove': '✕ Удалить'
  };
  let language = 'en';
  const originals = new WeakMap();
  const attrs = new WeakMap();
  function translateText(value) {
    const trimmed = value.trim();
    let translated = phrases[trimmed];
    if (!translated && /^\d+ verbs?$/.test(trimmed)) translated = trimmed.replace(/ verbs?$/, ' глаголов');
    return translated ? value.replace(trimmed, translated) : value;
  }
  window.russianMeaning = text => phrases[text] || '';
  function apply(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!root.parentElement || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.parentElement.tagName)) return;
      let original = originals.get(root);
      if (original === undefined) { original = root.nodeValue; originals.set(root, original); }
      const desired = language === 'ru' ? translateText(original) : original;
      if (root.nodeValue !== desired) root.nodeValue = desired;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of ['placeholder', 'title', 'aria-label']) {
      if (!root.hasAttribute(attr)) continue;
      let original = attrs.get(root) || {};
      if (!(attr in original)) original[attr] = root.getAttribute(attr);
      attrs.set(root, original);
      const desired = language === 'ru' ? translateText(original[attr]) : original[attr];
      if (root.getAttribute(attr) !== desired) root.setAttribute(attr, desired);
    }
    Array.from(root.childNodes).forEach(apply);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('language-select');
    select.addEventListener('change', () => {
      language = select.value;
      document.documentElement.lang = language;
      document.getElementById('translation-notice').hidden = language !== 'ru';
      apply(document.body);
    });
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'childList') record.addedNodes.forEach(apply);
      else if (record.type === 'characterData') {
        const original = originals.get(record.target);
        const expected = language === 'ru' && original !== undefined ? translateText(original) : original;
        if (record.target.nodeValue !== expected) { originals.delete(record.target); apply(record.target); }
      }
    })).observe(document.body, { childList: true, characterData: true, subtree: true });
  });
})();
