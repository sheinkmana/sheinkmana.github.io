// Run with: node hebrew/test-verb-data.js
const assert = require('node:assert/strict');
global.window = {};
require('./data/verified-forms.js');
require('./data/lilmod-verbs.js');
require('./data/verbs.js');

const verbs = window.VERBS_DATA;
const added = window.LILMOD_VERBS;
const bySpelling = new Map(added.map((v) => [v.spelling, verbs.find((item) => item.id === v.id)]));
const expected = `לאבד לאהוב לומר לאחד לארח לאכול לאפשר לבוא להבין לבקש לבכות לבנות לגנן להיות ללכת להרוס להוליך לזהות לחייב לחפש לחשוב לטייל לטעום להיוודע לישון יכול לדעת לייפות להכין להתכוון לקחת למצוא להפיל לתת לעבוד להתעורר לעשות להפליג לפעום לצחוק להצטער לצוות לצייר לקרוא לקרות לראות להרבות לרחוץ להתרחץ לרקוד להרגיש לשייט לשחות לשוט לשטוף לשחק לשלוח להישלם לשמוע לשים לשרטט`.split(' ');
const existing = ['book_bet_14','book_bet_2','ligdol','ledaber','likhtov','lilmod','lelamed','book_bet_8','lesader','book_bet_41','book_bet_24','lekabel','liknot','lakum','lirtzot','larutz','lashir'];

assert.equal(expected.length, 61);
assert.equal(bySpelling.size, 61);
assert.equal(new Set(verbs.map((v) => v.id)).size, verbs.length, 'verb IDs must be unique');
for (const spelling of expected) {
  const verb = bySpelling.get(spelling);
  assert.ok(verb, `Missing ${spelling}`);
  assert.ok(verb.verifiedForms && !verb.vocabularyOnly, `${spelling} has no checked forms`);
  assert.match(verb.sourceUrl, /^https:\/\/www\.pealim\.com\/dict\/\d+-/);
  assert.equal(Object.keys(verb.tables.past).length, 9, `${spelling}: incomplete past`);
  assert.equal(Object.keys(verb.tables.present).length, spelling === 'להיות' ? 0 : 4, `${spelling}: incorrect present`);
  for (const table of Object.values(verb.tables)) {
    for (const cell of Object.values(table)) assert.ok(cell.full && cell.translit && cell.unvoweled);
  }
}
for (const id of existing) assert.ok(verbs.some((v) => v.id === id), `Missing existing source entry ${id}`);
assert.equal(expected.length + existing.length, 78);
assert.equal(bySpelling.get('לקרות').sourceUrl, 'https://www.pealim.com/dict/1949-likrot/');
assert.equal(window.stripNikud(bySpelling.get('לקרות').tables.past['3ms'].full), 'קרה');
assert.equal(bySpelling.get('לקרות').tables.present.fs.translit, 'kora');
assert.equal(bySpelling.get('לשחות').sourceUrl, 'https://www.pealim.com/dict/2164-lischot/');
assert.equal(bySpelling.get('לשחות').tables.present.ms.translit, 'soche');
assert.equal(bySpelling.get('להוליך').root, 'ו-ל-כ');
assert.equal(bySpelling.get('להתעורר').binyan, 'hitpael');
assert.equal(bySpelling.get('יכול').infinitive, 'יָכוֹל');
assert.match(bySpelling.get('יכול').gizrahTip, /rare/);
assert.match(bySpelling.get('להיות').presentNote, /omits/);
assert.ok(bySpelling.get('לומר').aliases.includes('לאמור'));
console.log('All 78 source entries are present; the 61 additions have checked forms and links.');
