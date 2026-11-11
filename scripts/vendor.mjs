#!/usr/bin/env node
// Copies the browser builds of the two parsing libraries from node_modules
// into vendor/, so the deployed site needs no CDN and no build step.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const p = (rel) => new URL(rel, root);
const pkg = (name) => JSON.parse(readFileSync(p(`node_modules/${name}/package.json`), 'utf8'));

rmSync(p('vendor'), { recursive: true, force: true });
mkdirSync(p('vendor/pdfjs'), { recursive: true });
mkdirSync(p('vendor/mammoth'), { recursive: true });

cpSync(p('node_modules/pdfjs-dist/build/pdf.min.mjs'), p('vendor/pdfjs/pdf.min.mjs'));
cpSync(p('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), p('vendor/pdfjs/pdf.worker.min.mjs'));
cpSync(p('node_modules/pdfjs-dist/cmaps'), p('vendor/pdfjs/cmaps'), { recursive: true });
cpSync(p('node_modules/pdfjs-dist/standard_fonts'), p('vendor/pdfjs/standard_fonts'), { recursive: true });
cpSync(p('node_modules/pdfjs-dist/LICENSE'), p('vendor/pdfjs/LICENSE'));
cpSync(p('node_modules/mammoth/mammoth.browser.min.js'), p('vendor/mammoth/mammoth.browser.min.js'));
cpSync(p('node_modules/mammoth/LICENSE'), p('vendor/mammoth/LICENSE'));

const pdfjs = pkg('pdfjs-dist');
const mammoth = pkg('mammoth');
writeFileSync(
  p('vendor/README.md'),
  `# Vendored libraries

Copied unmodified from npm by \`npm run vendor\`. Do not edit by hand.

| Library | Version | License | Used for |
|---|---|---|---|
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | ${pdfjs.version} | ${pdfjs.license} | PDF text extraction |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | ${mammoth.version} | ${mammoth.license} | DOCX text extraction |

Each folder contains the library's own LICENSE file. \`pdfjs/cmaps\` ships with pdf.js and is needed to read many Chinese PDFs.
\`pdfjs/standard_fonts\` ships with pdf.js (metrics for PDFs that do not embed their fonts) and carries its own license files.
`,
);
console.log(`vendored pdfjs-dist ${pdfjs.version} (${pdfjs.license}), mammoth ${mammoth.version} (${mammoth.license})`);
