#!/usr/bin/env node
// Writes the synthetic dataset: 50 resumes (TXT / PDF / DOCX, English and
// Chinese) plus labels.json. Deterministic: running it twice gives the same files.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { PROFILES, WINDOW } from './dataset/profiles.mjs';
import { renderResume } from './dataset/render.mjs';
import { makePdf } from '../tests/helpers/makePdf.js';
import { makeDocx } from '../tests/helpers/makeDocx.js';
import { defaultRules, serializeRules } from '../src/engine/rules.js';

const out = new URL('../data/synthetic/', import.meta.url);
rmSync(new URL('resumes/', out), { recursive: true, force: true });
mkdirSync(new URL('resumes/', out), { recursive: true });

const labels = [];
for (const p of PROFILES) {
  const { lines, text } = renderResume(p);
  const file = `${p.id}_${p.lang}.${p.format}`;
  const bytes = p.format === 'pdf' ? makePdf(lines) : p.format === 'docx' ? makeDocx(lines) : Buffer.from(text, 'utf8');
  writeFileSync(new URL(`resumes/${file}`, out), bytes);
  labels.push({
    id: p.id,
    file,
    lang: p.lang,
    format: p.format,
    category: p.category,
    how_python_is_written: p.py,
    how_sql_is_written: p.sql,
    graduation_format: p.gradFormat,
    layout: p.layout,
    truth: { has_python: p.truth.hasPython, has_sql: p.truth.hasSql, graduation_year: p.gradYear, school: p.schoolCanonical, qualified: p.truth.qualified },
  });
}
writeFileSync(
  new URL('labels.json', out),
  JSON.stringify({ description: 'Ground truth for the synthetic dataset. qualified = has_python AND has_sql AND graduation_year within the window.', window: WINDOW, resumes: labels }, null, 2) + '\n',
);

// The job the dataset is labelled against, as a rules file the app can load.
const rules = defaultRules();
rules.name = 'Evaluation: graduate data analyst (2025-2026)';
rules.graduation = { enabled: true, from: WINDOW.from, to: WINDOW.to, mode: 'filter' };
writeFileSync(new URL('job.rules.json', out), serializeRules(rules));

const pos = labels.filter((l) => l.truth.qualified).length;
console.log(`wrote ${labels.length} resumes (${labels.filter((l) => l.lang === 'en').length} English, ${labels.filter((l) => l.lang === 'zh').length} Chinese; ${pos} qualified, ${labels.length - pos} not) to data/synthetic/`);
