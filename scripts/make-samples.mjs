#!/usr/bin/env node
// Writes the synthetic sample files in samples/ (TXT, PDF and DOCX, English
// and Chinese) so anyone can try the upload flow without a real resume.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { makePdf } from '../tests/helpers/makePdf.js';
import { makeDocx } from '../tests/helpers/makeDocx.js';

const root = new URL('..', import.meta.url);
mkdirSync(new URL('samples/', root), { recursive: true });
for (const lang of ['en', 'zh']) {
  const text = readFileSync(new URL(`tests/fixtures/${lang}_resume.txt`, root), 'utf8');
  const lines = text.replace(/\n$/, '').split('\n');
  writeFileSync(new URL(`samples/${lang}_resume.txt`, root), text);
  writeFileSync(new URL(`samples/${lang}_resume.pdf`, root), makePdf(lines));
  writeFileSync(new URL(`samples/${lang}_resume.docx`, root), makeDocx(lines));
}
console.log('wrote samples/{en,zh}_resume.{txt,pdf,docx}');
