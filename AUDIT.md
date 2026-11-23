# Data and secrets audit

**Audited:** commit `f6e65f0`, on 23 November 2026, by the author with AI
assistance. The audit read the 303 files tracked by git (`git ls-files`). It
did not look at ignored files such as `node_modules/` or private notes, which
are not part of the repository.

## Conclusion

No real personal data, no secrets and no real local file paths were found in
the repository. All resumes, names, contact details and employers are
synthetic. One test string uses a phone format outside the two placeholder
ranges; it is not a valid number (see Exceptions).

The tool itself has been evaluated **on synthetic data only**. It has not
been validated on real resumes (see Limitations).

## Findings and evidence

| Check | Result | How it was checked |
|---|---|---|
| Synthetic resumes | **50** files in `data/synthetic/resumes/`: 23 TXT, 13 PDF, 14 DOCX; 28 English, 22 Chinese. Every file yields non-empty text. | Listed with `git ls-files`; text of every PDF and DOCX extracted with the project's own parsers. |
| Email addresses | **Only `example.com`.** 56 addresses in `data/` and `samples/`, 63 files in total outside `vendor/` (including tests and docs); no other domain anywhere. | Regex over the text of every tracked file, PDF and DOCX text included. `example.com` is reserved for documentation by RFC 2606. |
| Phone numbers | **All 52** in `data/` and `samples/` are placeholders: `+1 555-01xx` or `138-0000-00xx`. Across all other files, 72 placeholder matches and 1 exception. | Regex for international, US and Chinese mobile formats over the same text. |
| Employers | The **9** employer names in the 50 resumes all carry a marker every time they appear: 28 mentions of 5 English names, each followed by "(fictional)"; 22 mentions of 4 Chinese names, each followed by "（虚构）". No other company-like name was found. | Counted each name and checked the text immediately after it. |
| `labels.json` | **No name, email or phone.** Fields are only `id`, `file`, `lang`, `format`, `category`, how each skill is written, date format, layout, and the ground truth (`has_python`, `has_sql`, `graduation_year`, `school`, `qualified`). No `@` and no phone pattern in the file. | Walked every key in the JSON; searched the raw file. |
| Secrets | **None** in `src/`, `scripts/`, `tests/`, `data/` or `index.html` (90 files), nor anywhere else tracked. | Patterns for AWS, OpenAI-style, GitHub, Slack and Google keys, private-key blocks, and `api_key` / `secret` / `password` / `token` assignments. |
| Local paths and machine names | **None.** No `/Users/…`, `/home/…`, `C:\Users\…`, temporary-folder paths, host names or personal email addresses. | Same patterns, plus a raw-byte search of all 303 files, including binaries such as PDFs, DOCX files and screenshots, so file metadata is covered too. |
| Author name | The only personal name in the files is the copyright line in `LICENSE`. | Raw-byte search. |

## Exceptions

- **`tests/score.test.js`, line 205** contains `555-010-0199` in a one-line
  test resume. It is not in the `+1 555-01xx` form, but it cannot be a real
  number: in the North American numbering plan, 555 is not an assigned area
  code and no exchange starts with 0. It is kept because the test checks that
  this phone shape is recognised as contact details.

## Limitations

**Of the tool.**

- Accuracy figures in `docs/EVALUATION.md` and the ablation in
  `docs/ABLATION.md` come from 50 synthetic resumes written by the same
  author as the engine. **No real resume has been used, so nothing is known
  about accuracy, robustness or fairness on real applicants.**
- No bias audit has been done. That would need real demographic data, and
  none was used.

**Of the synthetic data.**

- Personal names are random pairings from short lists of common given and
  family names. Any match with a real person is coincidental, but it cannot
  be ruled out.
- The five English employer names are sample-company names known from
  Microsoft's documentation. The four Chinese ones were invented for this
  project and were **not** checked against a company register; a real company
  could share a name. Every mention is marked fictional.
- Nine real universities appear as school names (for example Stanford
  University and 清华大学), because school-tier matching needs recognisable
  names. Six further schools are invented.

**Of this audit.**

- Pattern searches can show that known shapes are absent. They cannot prove
  that nothing sensitive is present in a form the patterns do not cover.
- Binary files were searched for byte patterns only. Fonts and CMap files in
  `vendor/` come unmodified from the pdf.js npm package.
- The PDF and DOCX text was extracted with a one-off script that is not part
  of the repository. The plain-text checks can be repeated with the commands
  below.
- **Git history is outside the file scan.** Commit metadata records the
  author's name and email address. Anyone who clones the repository can see
  them. A `git archive` export contains the files only, not the history.

## Repeat the plain-text checks

```bash
git grep -I -h -o -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+' -- ':!vendor' | sed 's/.*@//' | sort | uniq -c
```

```bash
git grep -I -n -E '/Users/|/home/[a-z]|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY' -- src scripts tests data index.html
```

```bash
git grep -P -I -h -o '\+\d{1,3} ?\d{3}-\d{4}(?!\d)|(?<![\d.])1[3-9]\d-?\d{4}-?\d{4}(?![\d.])' -- data samples | sort | uniq -c
```

The first should print only `example.com`. The second should print nothing.
The third should print only `+1 555-01xx` and `138-0000-00xx` numbers. It
needs a git built with PCRE support (`-P`), and like the others it reads text
files only: PDF and DOCX resumes are binary to git.
