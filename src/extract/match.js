// Keyword / phrase matching for Latin and CJK terms.
import { CJK_RE, escapeRegExp, normalizeText } from './text.js';

/**
 * Latin terms match on token boundaries, so "Java" does not fire on
 * "JavaScript" and "C" does not fire on "C++" or "C#". Spaces and hyphens in a
 * term are interchangeable ("machine learning" = "machine-learning").
 * CJK terms match as substrings, because Chinese has no word delimiters.
 */
export function buildTermRegex(term, { caseSensitive = false } = {}) {
  const t = normalizeText(term).trim();
  if (!t) return null;
  const hasCjk = CJK_RE.test(t);
  const parts = t.split(hasCjk ? /\s+/ : /[\s-]+/).filter(Boolean).map(escapeRegExp);
  const body = parts.join(hasCjk ? '\\s*' : '[\\s\\-]*');
  const first = t[0];
  const last = t[t.length - 1];
  const pre = /[A-Za-z0-9]/.test(first) ? '(?<![A-Za-z0-9])' : '';
  let post = '';
  if (/[A-Za-z]/.test(last)) post = '(?![A-Za-z+#])';
  else if (/[0-9]/.test(last)) post = '(?![A-Za-z0-9])';
  return new RegExp(pre + body + post, caseSensitive ? 'g' : 'gi');
}

export function findMatches(text, term, opts) {
  const re = buildTermRegex(term, opts);
  if (!re) return [];
  const out = [];
  for (const m of text.matchAll(re)) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

// ---- Negation ---------------------------------------------------------------
// A mention is negated when a negation cue comes before it in the same clause:
// "No experience with Python or SQL", "不熟悉 Python、SQL".
const NEG_WINDOW = 60;
const HARD_BOUNDARY = /[.;!?\n。:]\s|[;!?\n。]|\b(?:but|however|though|although|whereas|except)\b|但是?|不过|然而|而是|只是/gi;
const NEG_EN = /\b(?:no(?!\.?\s*\d)|not(?!\s+(?:only|just|merely))|never|without|lack(?:s|ing|ed)?|unfamiliar|cannot(?!\s+wait)|yet\s+to)\b|n['’]t\b(?!\s+(?:only|just|wait))/gi;
const NEG_ZH = /不会|不太?熟悉?|不太?了解|不懂|不具备|不掌握|未曾?使用|未用过|未接触|未学习?过?|未掌握|尚未|没有|没用过|没学过|没接触|缺乏|缺少|无\s*$/;
// Negation written after the term: "Python: none", "Python (no experience)", "Python 不熟悉".
const NEG_AFTER = /^\s*[:(\-–—]?\s*(?:none\b|n\/a\b|no\b|not\b|never\b|不熟|不会|不了解|不懂|未使用|未用过|未接触|未掌握|没用过|没学过|无(?![\u4e00-\u9fff]))/i;
const words = (s) => s.split(/\s+/).filter((w) => w && !/^(?:or|and|nor)$/i.test(w)).length;

/** True if the mention at [start, end) is negated. */
export function isNegated(text, start, end = start) {
  if (NEG_AFTER.test(text.slice(end, end + 16))) return true;
  let clause = text.slice(Math.max(0, start - NEG_WINDOW), start);
  let cut = 0;
  for (const m of clause.matchAll(HARD_BOUNDARY)) cut = m.index + m[0].length;
  clause = clause.slice(cut);
  // English: the cue reaches across commas only through a list of short
  // items ("never used Python, SQL or Java"), not into a new clause
  // ("had no analyst, so I learned Python").
  for (const m of clause.matchAll(NEG_EN)) {
    const segs = clause.slice(m.index + m[0].length).split(',');
    if (segs.length === 1) return true;
    const middleOk = segs.slice(1, -1).every((x) => words(x) <= 3);
    if (middleOk && words(segs[segs.length - 1]) <= 2) return true;
  }
  // Chinese: a comma ends the clause; lists use "、" instead.
  return NEG_ZH.test(clause.slice(clause.lastIndexOf(',') + 1));
}

/**
 * Best match of a keyword entry ({term, aliases, caseSensitive}), or null.
 * The first affirmative mention wins. If every mention is negated, the first
 * one is returned with `negated: true` so the report can show why it did not
 * count.
 */
export function findKeyword(text, entry) {
  const names = [entry.term, ...(entry.aliases ?? [])];
  let best = null;
  let bestNegated = null;
  for (const name of names) {
    for (const m of findMatches(text, name, { caseSensitive: !!entry.caseSensitive })) {
      if (isNegated(text, m.start, m.end)) {
        if (!bestNegated || m.start < bestNegated.start) bestNegated = { ...m, matchedAs: name, negated: true };
      } else {
        if (!best || m.start < best.start) best = { ...m, matchedAs: name, negated: false };
        break; // later matches of this name cannot be earlier
      }
    }
  }
  return best ?? bestNegated;
}
