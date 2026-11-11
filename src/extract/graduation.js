// Graduation-year extraction for English and Chinese date formats.
import { makeEvidence } from './text.js';

const MONTH =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const YEAR = '(?:19[5-9]\\d|20\\d{2})';
const MM = '(?:0?[1-9]|1[0-2])';
// "Jun 2025", "06/2025", "2025", "2025.06", "2025-06", "2025年6月"
const DATE =
  `(?:${MONTH},?\\s+|${MM}\\s*[/.]\\s*)?(?<!\\d)(${YEAR})(?:\\s*年\\s*${MM}\\s*月?|\\s*[./-]\\s*${MM}(?!\\d)|\\s*年)?`;
const SEP = '\\s*(?:-|–|—|―|~|〜|至|到|to|until|through)\\s*';
const PRESENT = '(present|now|current|ongoing|至今|现在|今)';

const RANGE_RE = new RegExp(`${DATE}${SEP}(?:${DATE}|${PRESENT})`, 'gi');
const EXPLICIT_RES = [
  new RegExp(`class\\s+of\\s+(${YEAR})`, 'gi'),
  new RegExp(
    `(?:expected|anticipated)(?:\\s+(?:graduation|completion))?(?:\\s+date)?\\s*:?\\s*(?:in\\s+)?(?:${MONTH},?\\s+)?(${YEAR})`,
    'gi',
  ),
  new RegExp(
    `graduat(?:ed|ion|ing|e)(?:\\s+date)?\\s*:?\\s*(?:in\\s+)?(?:${MONTH},?\\s+)?(${YEAR})`,
    'gi',
  ),
  new RegExp(`(?<!\\d)(${YEAR})\\s*届`, 'g'),
  new RegExp(`(?<!\\d)(${YEAR})\\s*年(?:\\s*\\d{1,2}\\s*月)?\\s*(?:预计|应届)?毕业`, 'g'),
  new RegExp(`毕业(?:时间|日期|年份)?\\s*:?\\s*(${YEAR})`, 'g'),
];
// Two-digit years, accepted only as a range with a month on both sides:
// "09/21 - 06/25", "Sep '21 – Jun '25", "'21 - '25" (month first), and
// "21.09 - 25.06", "21年9月 - 25年6月" (year first).
const YY_MF = `(?:(?:${MONTH},?\\s*)?['’]|(?<![\\d./])${MM}\\s*/\\s*)(\\d{2})(?![\\d/])`;
const YY_YF = `(?<![\\d./])(\\d{2})\\s*(?:\\.\\s*(?:0[1-9]|1[0-2])|年\\s*${MM}\\s*月?)(?!\\d)`;
const SHORT_RANGE_RES = [
  new RegExp(`${YY_MF}${SEP}(?:${YY_MF}|${PRESENT})`, 'gi'),
  new RegExp(`${YY_YF}${SEP}(?:${YY_YF}|${PRESENT})`, 'gi'),
];
// Abbreviated end year after a full start year: "2021-25", "2021/9 - 25/6".
const MIXED_RANGE_RE = new RegExp(`${DATE}(?:\\s*/\\s*${MM})?${SEP}['’]?(\\d{2})(?:\\s*[/.]\\s*${MM})?(?![\\d])`, 'gi');
const fullYear = (yy) => (yy < 70 ? 2000 + yy : 1900 + yy);
const MAX_DEGREE_YEARS = 10;

const LONE_YEAR_RE =new RegExp(`(?<![\\d.])(${YEAR})(?![\\d])`, 'g');

function overlaps(spans, start, end) {
  return spans.some((s) => start < s.end && end > s.start);
}

/**
 * @param text normalised resume text
 * @param ranges education ranges from detectSections()
 * @param lines splitLines(text)
 * @param exclude spans to ignore (date-of-birth spans), so a birth year can
 *        never be read as a graduation year
 * @returns {{year:number|null, inProgress:boolean, source:string|null, evidence:object|null}}
 */
export function extractGraduation(text, ranges, lines, exclude = []) {
  const explicit = [];
  const rangeEnds = [];
  const open = []; // ranges ending in "present"
  const lone = [];
  const used = [];

  for (const r of ranges) {
    const chunk = text.slice(r.start, r.end);
    const abs = (i) => r.start + i;

    for (const re of EXPLICIT_RES) {
      for (const m of chunk.matchAll(re)) {
        const s = abs(m.index);
        const e = s + m[0].length;
        if (overlaps(exclude, s, e)) continue;
        explicit.push({ year: Number(m[1]), start: s, end: e });
        used.push({ start: s, end: e });
      }
    }
    for (const m of chunk.matchAll(RANGE_RE)) {
      const s = abs(m.index);
      const e = s + m[0].length;
      if (overlaps(exclude, s, e)) continue;
      used.push({ start: s, end: e });
      if (m[3]) open.push({ startYear: Number(m[1]), start: s, end: e });
      else if (Number(m[2]) >= Number(m[1])) rangeEnds.push({ year: Number(m[2]), start: s, end: e });
    }
    for (const m of chunk.matchAll(MIXED_RANGE_RE)) {
      const s = abs(m.index);
      const e = s + m[0].length;
      if (overlaps(exclude, s, e) || overlaps(used, s, e)) continue;
      const startYear = Number(m[1]);
      const endYear = Math.floor(startYear / 100) * 100 + Number(m[2]);
      if (endYear <= startYear || endYear - startYear > MAX_DEGREE_YEARS) continue;
      rangeEnds.push({ year: endYear, start: s, end: e });
      used.push({ start: s, end: e });
    }
    for (const re of SHORT_RANGE_RES) {
      for (const m of chunk.matchAll(re)) {
        const s = abs(m.index);
        const e = s + m[0].length;
        if (overlaps(exclude, s, e) || overlaps(used, s, e)) continue;
        const startYear = fullYear(Number(m[1]));
        if (m[3]) {
          open.push({ startYear, start: s, end: e });
        } else {
          const endYear = fullYear(Number(m[2]));
          if (endYear < startYear || endYear - startYear > MAX_DEGREE_YEARS) continue;
          rangeEnds.push({ year: endYear, start: s, end: e });
        }
        used.push({ start: s, end: e });
      }
    }
    for (const m of chunk.matchAll(LONE_YEAR_RE)) {
      const s = abs(m.index);
      const e = s + m[0].length;
      if (overlaps(exclude, s, e) || overlaps(used, s, e)) continue;
      lone.push({ year: Number(m[1]), start: s, end: e });
    }
  }

  const pickMax = (arr) => arr.reduce((a, b) => (b.year > a.year ? b : a));
  const done = (c, source) => ({
    year: c.year,
    inProgress: false,
    source,
    evidence: makeEvidence(text, lines, c.start, c.end),
  });

  // A degree still in progress with no stated end date: graduation unknown,
  // unless an explicit expected year covers it.
  if (open.length) {
    const latestOpen = open.reduce((a, b) => (b.startYear > a.startYear ? b : a));
    const covering = explicit.filter((x) => x.year >= latestOpen.startYear);
    if (covering.length) return done(pickMax(covering), 'explicit');
    const later = rangeEnds.filter((x) => x.year > latestOpen.startYear);
    if (!later.length) {
      return {
        year: null,
        inProgress: true,
        source: 'open_range',
        evidence: makeEvidence(text, lines, latestOpen.start, latestOpen.end),
      };
    }
  }
  const strong = [...explicit, ...rangeEnds];
  if (strong.length) {
    const c = pickMax(strong);
    return done(c, explicit.includes(c) ? 'explicit' : 'range');
  }
  if (lone.length) return done(pickMax(lone), 'lone_year');
  return { year: null, inProgress: false, source: null, evidence: null };
}
