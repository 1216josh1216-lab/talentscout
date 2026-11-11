# Vendored libraries

Copied unmodified from npm by `npm run vendor`. Do not edit by hand.

| Library | Version | License | Used for |
|---|---|---|---|
| [pdfjs-dist](https://github.com/mozilla/pdf.js) | 6.5.438 | Apache-2.0 | PDF text extraction |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | 1.13.0 | BSD-2-Clause | DOCX text extraction |

Each folder contains the library's own LICENSE file. `pdfjs/cmaps` ships with pdf.js and is needed to read many Chinese PDFs.
`pdfjs/standard_fonts` ships with pdf.js (metrics for PDFs that do not embed their fonts) and carries its own license files.
