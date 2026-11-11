import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { decodeText, detectFormat, parseResumeFile } from '../src/parsers/index.js';
import { analyzeResume } from '../src/engine/score.js';
import { defaultRules } from '../src/engine/rules.js';
import { makePdf } from './helpers/makePdf.js';
import { makeDocx } from './helpers/makeDocx.js';

const dir = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const libs = {
  pdfjsLib,
  mammoth,
  cMapUrl: dir('../node_modules/pdfjs-dist/cmaps/'),
  standardFontDataUrl: dir('../node_modules/pdfjs-dist/standard_fonts/'),
};
const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const EN = fixture('en_resume.txt');
const ZH = fixture('zh_resume.txt');
const rules = defaultRules();
const utf8 = (s) => new TextEncoder().encode(s);

test('txt: UTF-8, UTF-8 with BOM, UTF-16LE and GBK all decode', () => {
  assert.equal(decodeText(utf8('清华大学 Python')).text, '清华大学 Python');
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('简历')])).text, '简历');
  assert.equal(decodeText(new Uint8Array([0xff, 0xfe, 0x80, 0x7b, 0x86, 0x53])).text, '简历');
  // "清华大学" encoded as GBK
  const gbk = new Uint8Array([0xc7, 0xe5, 0xbb, 0xaa, 0xb4, 0xf3, 0xd1, 0xa7]);
  const r = decodeText(gbk);
  assert.equal(r.text, '清华大学');
  assert.equal(r.encoding, 'gb18030');
});

test('format detection uses file content, not just the extension', () => {
  assert.equal(detectFormat('a.pdf', makePdf(['x'])), 'pdf');
  assert.equal(detectFormat('renamed.txt', makePdf(['x'])), 'pdf');
  assert.equal(detectFormat('a.docx', makeDocx(['x'])), 'docx');
  assert.equal(detectFormat('a.txt', utf8('hello')), 'txt');
  assert.equal(detectFormat('a.pdf', utf8('not a pdf')), 'corrupt');
  assert.equal(detectFormat('a.doc', utf8('legacy')), 'unsupported');
});

for (const [lang, src, expected] of [['English', EN, 87.5], ['Chinese', ZH, 85.8]]) {
  const lines = src.split('\n');

  test(`pdf: ${lang} resume gives the same score as the plain text`, async () => {
    const parsed = await parseResumeFile({ name: 'resume.pdf', bytes: makePdf(lines) }, libs);
    assert.equal(parsed.error, null, parsed.detail);
    assert.equal(parsed.format, 'pdf');
    assert.equal(analyzeResume(parsed.text, rules).total, expected);
  });

  test(`docx: ${lang} resume gives the same score as the plain text`, async () => {
    const parsed = await parseResumeFile({ name: 'resume.docx', bytes: makeDocx(lines) }, libs);
    assert.equal(parsed.error, null, parsed.detail);
    assert.equal(analyzeResume(parsed.text, rules).total, expected);
  });

  test(`txt: ${lang} resume`, async () => {
    const parsed = await parseResumeFile({ name: 'resume.txt', bytes: utf8(src) }, libs);
    assert.equal(analyzeResume(parsed.text, rules).total, expected);
  });
}

test('pdf: Chinese text is recovered exactly (needs CMaps)', async () => {
  const parsed = await parseResumeFile({ name: 'zh.pdf', bytes: makePdf(['教育背景', '2021.09 - 2025.06 浙江大学 本科']) }, libs);
  assert.equal(parsed.text, '教育背景\n2021.09 - 2025.06 浙江大学 本科');
});

test('pdf: multi-page documents are read to the end', async () => {
  const lines = Array.from({ length: 120 }, (_, i) => `Line ${i + 1}`);
  const parsed = await parseResumeFile({ name: 'long.pdf', bytes: makePdf(lines) }, libs);
  assert.equal(parsed.text.split('\n').length, 120);
  assert.ok(parsed.text.endsWith('Line 120'));
});

test('pdf with no text layer (like a scan) is reported unreadable, not scored 0', async () => {
  const parsed = await parseResumeFile({ name: 'scan.pdf', bytes: makePdf([]) }, libs);
  assert.equal(parsed.error, null);
  const a = analyzeResume(parsed.text, rules);
  assert.equal(a.readable, false);
  assert.deepEqual(a.flags, ['unreadable']);
});

test('broken files return an error instead of throwing', async () => {
  const badPdf = await parseResumeFile({ name: 'x.pdf', bytes: utf8('%PDF-1.4 garbage') }, libs);
  assert.equal(badPdf.error, 'parse_failed');
  const badDocx = await parseResumeFile({ name: 'x.docx', bytes: new Uint8Array([0x50, 0x4b, 1, 2, 3]) }, libs);
  assert.equal(badDocx.error, 'parse_failed');
  const legacy = await parseResumeFile({ name: 'x.doc', bytes: utf8('abc') }, libs);
  assert.equal(legacy.error, 'unsupported_format');
});
