import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { PROFILES } from '../scripts/dataset/profiles.mjs';
import { renderResume } from '../scripts/dataset/render.mjs';
import { runAblation, auditMasking } from '../scripts/dataset/ablation.mjs';
import { parseRulesJson } from '../src/engine/rules.js';

const root = new URL('../data/synthetic/', import.meta.url);
const labels = JSON.parse(readFileSync(new URL('labels.json', root), 'utf8'));
const rules = parseRulesJson(readFileSync(new URL('job.rules.json', root), 'utf8')).rules;

test('dataset: 50 labelled resumes, both languages, three formats, all files present', () => {
  assert.equal(labels.resumes.length, 50);
  assert.equal(new Set(labels.resumes.map((r) => r.id)).size, 50);
  assert.deepEqual([...new Set(labels.resumes.map((r) => r.lang))].sort(), ['en', 'zh']);
  assert.deepEqual([...new Set(labels.resumes.map((r) => r.format))].sort(), ['docx', 'pdf', 'txt']);
  for (const r of labels.resumes) assert.ok(existsSync(new URL(`resumes/${r.file}`, root)), r.file);
  const pos = labels.resumes.filter((r) => r.truth.qualified).length;
  assert.ok(pos >= 20 && pos <= 30, `classes are roughly balanced (${pos} qualified)`);
});

test('dataset: labels follow from the hidden profile, not from the engine', () => {
  for (const r of labels.resumes) {
    const t = r.truth;
    assert.equal(t.qualified, t.has_python && t.has_sql && t.graduation_year >= labels.window.from && t.graduation_year <= labels.window.to, r.id);
  }
});

test('dataset: only placeholder contact details (example.com, 555-01xx, 138-0000-00xx)', () => {
  for (const p of PROFILES) {
    const { text } = renderResume(p);
    for (const m of text.matchAll(/[\w.+-]+@([\w.-]+)/g)) assert.equal(m[1], 'example.com', p.id);
    assert.doesNotMatch(text.replace(/\+1 555-01\d\d|138-0000-00\d\d/g, ''), /\d{3}[- ]\d{4}[- ]\d{4}|\d{3}[- ]\d{3}[- ]\d{4}/, p.id);
  }
});

test('dataset: generation is deterministic and matches the committed text files', () => {
  for (const p of PROFILES.filter((x) => x.format === 'txt')) {
    assert.equal(renderResume(p).text, readFileSync(new URL(`resumes/${p.id}_${p.lang}.txt`, root), 'utf8'), p.id);
  }
});

test('ablation: changing name, gender, age, birth date or photo never changes any score (300 variants)', () => {
  const on = runAblation(rules, { protectedMode: true });
  assert.equal(on.checked, 300);
  assert.deepEqual(on.changed, []);
});

test('ablation: the test has teeth - with masking off, a keyword-like name does change scores', () => {
  const off = runAblation(rules, { protectedMode: false });
  assert.ok(off.changed.length > 0);
  assert.ok(off.changed.every((c) => c.variant === 'keyword_name'), 'only the adversarial name moves scores, even unmasked');
});

test('ablation: every protected value the generator wrote is hidden from the rules', () => {
  assert.deepEqual(auditMasking(rules).leaks, []);
});
