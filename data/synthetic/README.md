# Synthetic dataset

50 resumes (28 English, 22 Chinese; TXT, PDF and DOCX) with ground-truth labels.

**Everything here is invented.** Names are random pairings from small lists of
common given and family names, so any resemblance to a real person is
coincidental. Companies are fictional. Emails use the reserved `example.com`
domain; phone numbers use placeholder ranges (`555-01xx`, `138-0000-00xx`).
Some universities are real institutions, used only as school names; three
English-sounding and three Chinese-sounding schools are made up. No resume,
text or data from any employer or real applicant was used.

| File | What it is |
|---|---|
| `resumes/` | The 50 files. File names carry no personal names. |
| `labels.json` | Ground truth per resume: has Python, has SQL, graduation year, school, `qualified`. |
| `job.rules.json` | The job the labels refer to, as a rules file the app can load. |
| `results.json` | Output of the last `npm run evaluate`. |

## How labels are made

Each resume is rendered from a hidden profile in
`scripts/dataset/profiles.mjs`. The label is computed from the profile:

    qualified = has Python AND has SQL AND graduates in 2025-2026

The scoring engine is never consulted. The profile also records *how* the
resume talks about a skill (plainly, negated, implied by library names, only
as a learning goal, ...), which is what makes some cases hard.

## Case types

| Type | n | What it tests |
|---|---|---|
| clear positive | 12 | Ordinary qualified resumes in varied formats |
| missing skill | 8 | One or both required skills absent |
| outside window | 7 | Right skills, wrong graduation year; some mention 2025/2026 elsewhere |
| negation | 6 | "No experience with Python", "未使用过 SQL", and two affirmative look-alikes |
| lookalike | 3 | "NoSQL" without SQL; "Monty Python" as a hobby |
| date format | 6 | Two-digit years, "2022-26", "Present", Chinese numerals, ambiguous "Sep 21" |
| implied or planned | 4 | Skill shown only through library names, or only as a learning goal |
| layout | 4 | No headings, sidebar first, honorific header |

The hard cases were chosen before the engine was run on this dataset, and
deliberately include cases it was already known to get wrong.

## Regenerate

    npm run dataset     # rewrites resumes/, labels.json, job.rules.json
    npm run evaluate    # writes docs/EVALUATION.md
    npm run ablation    # writes docs/ABLATION.md

Generation is deterministic.
