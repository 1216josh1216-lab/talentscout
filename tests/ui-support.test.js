import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STRINGS, translate } from '../src/i18n/strings.js';
import { toCsv, csvCell } from '../src/engine/csv.js';
import { analyzeResume, rankCandidates } from '../src/engine/score.js';
import { defaultRules } from '../src/engine/rules.js';
import { SAMPLES } from '../src/ui/samples.js';

const rules = defaultRules();

test('i18n: English and Chinese have exactly the same keys, none empty', () => {
  assert.deepEqual(Object.keys(STRINGS.zh).sort(), Object.keys(STRINGS.en).sort());
  for (const lang of ['en', 'zh']) for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(v.trim(), `${lang}:${k}`);
  assert.equal(translate('zh', 'results.candidateN', { n: '03' }), '候选人 03');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
});

test('i18n: every key used by the UI exists', () => {
  const src = readFileSync(new URL('../src/ui/app.js', import.meta.url), 'utf8') + readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const used = new Set([...src.matchAll(/(?:t\('|data-i18n=")([a-zA-Z]+\.[a-zA-Z_]+)['"]/g)].map((m) => m[1]));
  assert.ok(used.size > 40);
  for (const k of used) assert.ok(k in STRINGS.en, `missing string: ${k}`);
});

test('csv: BOM, quoting, Chinese headers and one row per candidate', () => {
  const ranked = rankCandidates(SAMPLES.map((s, i) => ({ id: String(i), analysis: analyzeResume(s.text, rules) }))).map((c) => ({ ...c, label: `Candidate ${c.id}` }));
  const en = toCsv(ranked, 'en');
  assert.ok(en.startsWith('\uFEFF"Rank","Candidate","Score"'));
  assert.equal(en.trim().split('\r\n').length, SAMPLES.length + 1);
  const zh = toCsv(ranked, 'zh');
  assert.ok(zh.startsWith('\uFEFF"排名","候选人","得分"'));
  assert.match(zh, /缺少必备项/);
});

test('csv: cells that look like formulas are neutralised', () => {
  assert.equal(csvCell('=HYPERLINK("http://x","y")'), `"'=HYPERLINK(""http://x"",""y"")"`);
  assert.equal(csvCell('+1 555'), `"'+1 555"`);
  assert.equal(csvCell('@cmd'), `"'@cmd"`);
  assert.equal(csvCell(-3.5), '"-3.5"');
  assert.equal(csvCell('plain, with "quotes"'), '"plain, with ""quotes"""');
});

test('samples: each built-in sample shows the behaviour its file name promises', () => {
  const by = Object.fromEntries(SAMPLES.map((s) => [s.name, analyzeResume(s.text, rules)]));
  assert.equal(by['sample_01_en.txt'].total, 87.5);
  assert.equal(by['sample_02_zh.txt'].total, 85.8);
  assert.deepEqual(by['sample_03_en_missing_must_have.txt'].flags, ['missing_must_have']);
  assert.equal(by['sample_04_en_negated.txt'].results.filter((r) => r.reason.code === 'kw_negated').length, 2);
  assert.deepEqual(by['sample_05_zh_outside_window.txt'].flags, ['outside_window']);
  assert.equal(by['sample_05_zh_outside_window.txt'].extracted.graduationYear, 2012);
  assert.deepEqual(by['sample_06_en_in_progress.txt'].flags, ['grad_unknown']);
  assert.equal(by['sample_07_zh_unlisted_school.txt'].extracted.school, null);
  assert.equal(by['sample_07_zh_unlisted_school.txt'].extracted.graduationYear, 2026);
  assert.deepEqual(by['sample_08_en_keyword_stuffing.txt'].flags, ['outside_window']);
});
