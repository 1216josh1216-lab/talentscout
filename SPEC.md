# TalentScout 2.0 — Phase 0 Spec

**One line:** a static, in-browser resume screener whose every score point is traceable to a rule and a quote from the resume. No backend, no uploads, no ML.

## Principles

1. **Privacy by architecture.** No server, no analytics, no CDN. Libraries are vendored into the repo, so the app makes zero network requests after page load. This is checkable in DevTools and will be checked in Phase 2.
2. **Explainable by construction.** The score is a deterministic sum of rule results. Each result carries: rule id, points awarded / possible, reason, and the evidence snippet with its position in the resume text.
3. **Decision support, not decision maker.** The tool ranks; a human decides. Stated in the UI and the README.

## Stack

| Concern | Choice | License |
|---|---|---|
| App | Vanilla HTML/CSS/JS, native ES modules, **no build step** | — |
| PDF text | `pdfjs-dist` (Mozilla pdf.js), vendored with CMaps for Chinese fonts | Apache-2.0 |
| DOCX text | `mammoth` (browser build), vendored | BSD-2-Clause |
| TXT | `TextDecoder` (UTF-8, GB18030 fallback) | built-in |
| Tests | `node --test` (built into Node, no test framework dependency) | — |
| Local preview | `npx serve .` or `python3 -m http.server` | — |
| Deploy | GitHub Pages from repo root (`.nojekyll`) | — |

Exact library versions and licenses are confirmed from the installed packages in Phase 1, not from memory.
Opening `index.html` by double-click is expected to fail (browsers block ES modules and workers on `file://`); Phase 2 tests this and reports the actual result.

## Architecture

```
file ──> parsers/ (pdf | docx | txt) ──> plain text
                                            │
                              extract/ (sections, school, grad year,
                                        protected-attribute spans)
                                            │
rules.json ──────────────────> engine/score ──> { total, status, results[] }
                                            │
                                 ui/ (ranked table, report, CSV export)
```

- `src/engine/` and `src/extract/` are pure functions with no DOM access: the same code runs in the browser, in unit tests, and in the Phase 3 evaluation script.
- `src/parsers/` is the only code touching pdf.js / mammoth.
- `src/ui/` renders; `src/i18n/` holds `en` and `zh` string tables.

## Scoring model

Score = 0–100, a weighted sum of four components. Weights are user-adjustable and normalised.

| Component | Rule | Default weight |
|---|---|---|
| Must-have keywords | fraction matched; any miss sets status `Missing must-have` (still scored and shown, never silently dropped) | 40 |
| Nice-to-have keywords | fraction matched | 25 |
| School tier | user-defined tiers, each with a point value and a list of school names + aliases (EN and 中文) | 20 |
| Graduation window | in window = full points; mode is either `score` or `filter` (out of window sets status `Outside window`) | 15 |

- **Keywords** have aliases (`machine learning` | `机器学习` | `ML`). Latin terms match on word boundaries, case-insensitive; CJK terms match as substrings after full-width/half-width normalisation.
- **Graduation year** formats in scope: `Class of 2025`, `Expected May 2025`, `Sep 2021 – Jun 2025`, `2021.09-2025.06`, `2025年6月毕业`, `2025届`, `至今 / Present`. Dates are read from the education section only, so a birth year is never mistaken for a graduation year.
- **Unparseable input** (scanned PDF, no text) yields status `Could not read`, not a score of 0.

## Protected-attributes mode (on by default)

- Name, gender, age / date of birth and photo are never inputs to any rule. Images are never extracted from files at all.
- Additionally, detected spans (`姓名:`, `性别: 男`, `Age: 24`, `出生年月`, `DOB`, the header name line) are redacted from the text before scoring, so a keyword cannot match inside them, and masked in evidence quotes.
- **Identity zone (added in Phase 3):** the whole header block above the first section heading, and any "Personal information" style section, is hidden from every rule, so the guarantee does not depend on recognising a name or date format. Outside that zone, masking is pattern-based and best-effort (17 of 26 on the held-out set in `docs/ABLATION.md`).
- Phase 3 proves it with a metamorphic test: change only those fields across all 50 resumes, assert identical scores.
- **Known limit, stated up front:** graduation year correlates with age and school tier correlates with socio-economic background. These are proxies the tool cannot remove; it only makes them visible and switchable. This goes in the compliance note.

## In scope

Rules editor with JSON save/load · bulk upload of PDF/DOCX/TXT · ranked table · CSV export (UTF-8 with BOM so Excel opens Chinese correctly) · per-candidate report · EN/中文 switch · protected-attributes mode · synthetic 50-resume dataset with labels · evaluation vs. keyword baseline · ablation test · README, compliance note.

## Explicitly out of scope

- OCR / scanned or image-only PDFs; legacy `.doc`
- Semantic matching, embeddings, LLMs, any trained model
- Backend, accounts, storage, ATS integration
- Languages other than English and Simplified/Traditional Chinese
- A statutory bias audit (e.g. NYC LL 144 style): impossible without real demographic data, and none will be used
- Any claim of real-world hiring validity: evaluation is on synthetic data only
- Polished mobile layout (desktop first; must not break on a phone)

## Known risks

| Risk | Plan |
|---|---|
| PDF text order scrambles in multi-column layouts | Keep the file's own text order (sorting by position merges two columns into one line); document the limit; test with a two-column synthetic PDF |
| Chinese PDFs need CMaps to extract text | Vendor pdf.js CMaps; verify with a generated Chinese PDF |
| Synthetic data flatters the tool | Generator and labels are written independently of the scoring rules (labels come from each resume's hidden profile, not from engine output); include hard cases (synonyms, keyword stuffing, negation) and report the failures |
| Vendored pdf.js is several MB | Acceptable for a demo; size reported in Phase 2 |

## Repo layout

```
index.html  styles.css  .nojekyll  LICENSE  README.md
src/{engine,extract,parsers,ui,i18n}/
vendor/{pdfjs,mammoth}/
tests/            unit tests + fixtures (synthetic)
data/synthetic/   50 resumes + labels.json + generator
scripts/          evaluate.mjs, ablation.mjs
docs/             architecture, compliance note, demo script
```

## Phase exit criteria

| Phase | Done when |
|---|---|
| 1 | `npm test` passes; EN and 中文 cases shown for parsing, graduation year, school match, scoring |
| 2 | Verified in a real browser over HTTP: upload, rank, report, CSV, rules save/load, language switch, zero network requests; `file://` result reported |
| 3 | Precision/recall table vs. baseline; ablation test passes on all 50 |
| 4 | README + compliance note with primary-source links, unverified items marked |
| 5 | 3 bullets + 60-second script, placeholders for anything unmeasured |
