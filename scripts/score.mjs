#!/usr/bin/env node
// Command-line match report, using the same engine as the web app.
// Usage: node scripts/score.mjs <resume.(txt|pdf|docx)> [--rules rules.json] [--lang en|zh] [--no-protect]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseResumeFile } from '../src/parsers/index.js';
import { analyzeResume } from '../src/engine/score.js';
import { defaultRules, parseRulesJson } from '../src/engine/rules.js';
import { formatReason, formatFlag } from '../src/i18n/reasons.js';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const rulesPath = opt('--rules');
const lang = opt('--lang') ?? 'en';
const protect = !args.includes('--no-protect');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('Usage: node scripts/score.mjs <resume> [--rules rules.json] [--lang en|zh] [--no-protect]');
  process.exit(2);
}

let rules = defaultRules();
if (rulesPath) {
  const parsed = parseRulesJson(readFileSync(rulesPath, 'utf8'));
  if (!parsed.ok) {
    console.error('Invalid rules:\n  ' + parsed.errors.join('\n  '));
    process.exit(2);
  }
  rules = parsed.rules;
}

const libs = {};
if (/\.pdf$/i.test(file)) {
  libs.pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dir = (rel) => fileURLToPath(new URL(rel, import.meta.url));
  libs.cMapUrl = dir('../node_modules/pdfjs-dist/cmaps/');
  libs.standardFontDataUrl = dir('../node_modules/pdfjs-dist/standard_fonts/');
} else if (/\.docx$/i.test(file)) {
  libs.mammoth = (await import('mammoth')).default;
}

const parsed = await parseResumeFile({ name: file, bytes: new Uint8Array(readFileSync(file)) }, libs);
if (parsed.error) {
  console.error(`Could not parse ${file}: ${parsed.error} ${parsed.detail ?? ''}`);
  process.exit(1);
}
const a = analyzeResume(parsed.text, rules, { protectedMode: protect });
const f1 = (n) => n.toFixed(1).padStart(5);

console.log(`\n${file}`);
console.log(`Rules: ${rules.name}   Protected attributes ignored: ${protect ? 'ON' : 'OFF'}`);
if (!a.readable) {
  console.log(`Status: ${formatFlag('unreadable', lang)}`);
  process.exit(0);
}
console.log(`Score: ${a.total} / 100   Status: ${a.flags.length ? a.flags.map((f) => formatFlag(f, lang)).join('; ') : 'OK'}`);
console.log(`Protected values masked: ${a.protectedSpans.map((s) => s.type).join(', ') || 'none found'}\n`);
for (const r of a.results) {
  console.log(`${r.fired ? '+' : ' '}${f1(r.points)} / ${f1(r.maxPoints)}  [${r.component}] ${formatReason(r.reason, lang)}`);
  for (const e of r.evidence) console.log(`${' '.repeat(17)}line ${e.line}: "${e.lineText}"`);
}
console.log('');
