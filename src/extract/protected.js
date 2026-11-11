// Detection and redaction of protected attributes: name, gender, age / date
// of birth, photo, plus a few related fields common on Chinese resumes.
//
// Design rule: this module errs towards redacting too much. A false positive
// hides a little text from the scorer; a false negative leaks an attribute.
import { splitLines, escapeRegExp } from './text.js';
import { headingType, detectSections } from './sections.js';

// Labels that mark a line as identity details even without an email or phone.
const EXTRA_IDENTITY = /姓\s*名|出生|民\s*族|籍\s*贯|(?<![a-z])(?:name|gender|sex|age|dob|date of birth|nationality)\s*:/i;

export const MASK = '▇';

const FIELDS = [
  { type: 'name', label: '(?:姓\\s*名|(?:full\\s+)?name)' },
  { type: 'gender', label: '(?:性\\s*别|gender|sex)' },
  { type: 'age', label: '(?:年\\s*龄|age)' },
  { type: 'birth', label: '(?:出生年月|出生日期|出生|生日|date\\s+of\\s+birth|d\\.?o\\.?b\\.?|birth\\s?date|birthday)' },
  { type: 'photo', label: '(?:照\\s*片|photo(?:graph)?)' },
  { type: 'other', label: '(?:民\\s*族|政治面貌|婚姻状况|婚否|籍\\s*贯|marital\\s+status|ethnicity|race|religion|nationality)' },
];

// Any label that ends a field value when several fields share one line.
const ANY_LABEL =
  '(?:姓\\s*名|性\\s*别|年\\s*龄|出生年月|出生日期|出生|生日|民\\s*族|政治面貌|婚姻状况|婚否|籍\\s*贯|电\\s*话|手\\s*机|邮\\s*箱|地\\s*址|学\\s*历|学\\s*校|专\\s*业|毕业院校|现居地?|' +
  'name|gender|sex|age|date\\s+of\\s+birth|dob|birth\\s?date|birthday|nationality|marital\\s+status|ethnicity|phone|tel|mobile|email|e-mail|address|location)';
const VALUE_END = new RegExp(`\\||;|\\s{2,}|\\s+${ANY_LABEL}\\s*:|$`, 'i');

const TITLE_LINE = /^(?:个人简历|简历|求职简历|resume|résumé|curriculum vitae|cv)$/i;
const CJK_NAME = /^[一-鿿](?:\s?[一-鿿·]){1,3}$/;
const LATIN_NAME = /^[A-Z][a-zA-Z'’.-]*(?:\s+[A-Z][a-zA-Z'’.-]*){1,3}$/;
const HEADER_LINES = 12;
// Signs that a line holds contact or personal details.
// Phone shapes only: a year range such as "2021-2025" must not count.
const CONTACT = /@|\+\d[\d\s().-]{7,}\d|(?<!\d)\d{3,4}[-\s]\d{3,4}[-\s]\d{4}(?!\d)|(?<!\d)1[3-9]\d{9}(?!\d)|\(\d{3}\)\s*\d{3}|(?<![a-z])(?:male|female)(?![a-z])|性别|年龄|\d{1,2}\s*岁/i;
// A first line such as "Machine Learning Engineer" is a job title, not a name.
const JOB_TITLE_WORD =
  /\b(?:engineer|developer|analyst|scientist|manager|designer|consultant|intern|specialist|researcher|architect|director|lead|officer|assistant|associate|student|graduate|candidate|application|portfolio)\b/i;

function labelAllowedAt(lineText, idx, isCjkLabel) {
  // A label counts only at the start of a line or after a separator, so
  // "School name: X" or "Company name: Y" is not treated as the person's name.
  const before = lineText.slice(0, idx);
  if (!before.trim()) return true;
  if (/[|;,/·•]\s*$/.test(before) || /\s{2,}$/.test(before)) return true;
  if (isCjkLabel) return /[^一-鿿]$/.test(before);
  return false;
}

/**
 * @returns {Array<{type:string,start:number,end:number}>} non-overlapping,
 * sorted spans covering the VALUE of each protected attribute.
 */
export function findProtectedSpans(text) {
  const lines = splitLines(text);
  const spans = [];
  const add = (type, start, end) => {
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end > start) spans.push({ type, start, end });
  };

  // 1. Labelled fields, anywhere in the document.
  for (const l of lines) {
    for (const f of FIELDS) {
      const re = new RegExp(`(?<![A-Za-z])${f.label}\\s*:\\s*`, 'gi');
      for (const m of l.text.matchAll(re)) {
        const isCjk = /[一-鿿]/.test(m[0]);
        if (!labelAllowedAt(l.text, m.index, isCjk)) continue;
        const valueStart = m.index + m[0].length;
        const rest = l.text.slice(valueStart);
        const stop = rest.search(VALUE_END);
        add(f.type, l.start + valueStart, l.start + valueStart + (stop < 0 ? rest.length : stop));
      }
    }
    // Birth statements without a colon: "出生于1999年5月", "Born in 1999".
    for (const m of l.text.matchAll(
      /(?:出生于?|生于)\s*((?:19|20)\d{2}\s*年?(?:\s*\d{1,2}\s*月?)?(?:\s*\d{1,2}\s*日?)?)|(?<![a-z])born\s+(?:in\s+|on\s+)?([a-z]*\.?\s*\d{0,2},?\s*(?:19|20)\d{2})/gi,
    )) {
      const v = m[1] ?? m[2];
      const s = l.start + m.index + m[0].lastIndexOf(v);
      add('birth', s, s + v.length);
    }
  }

  // 2. Unlabelled tokens in the header block ("张伟 | 男 | 24岁").
  const header = lines.slice(0, HEADER_LINES);
  const tokenRes = [
    ['gender', /(?<![一-鿿])[男女](?:性|生)?(?![一-鿿])/g],
    ['gender', /(?<![a-z])(?:male|female)(?![a-z])/gi],
    ['gender', /\(?\b(?:he|she|they)\s*\/\s*(?:him|her|them)\b\)?/gi],
    ['gender', /(?<![A-Za-z])(?:Mr|Mrs|Ms|Miss)\.?(?=\s+[A-Z])/g], // honorifics
    ['gender', /先生|女士|小姐/g],
    ['gender', /(?<=本人\s?|性别\s?)[男女]/g], // "本人男,24岁"
    ['age', /(?<!\d)\d{1,2}\s*(?:周)?岁/g],
    ['age', /(?<!\d)\d{1,2}\s*[- ]?(?:years?|yrs?)[- ]old/gi],
  ];
  for (const l of header) {
    for (const [type, re] of tokenRes) {
      for (const m of l.text.matchAll(re)) add(type, l.start + m.index, l.start + m.index + m[0].length);
    }
  }

  // Gendered pronouns anywhere ("She is a final-year student").
  for (const m of text.matchAll(/(?<![A-Za-z])(?:he|she|him|her|his|hers|himself|herself)(?![A-Za-z])|她/gi)) {
    add('gender', m.index, m.index + m[0].length);
  }

  // 3. Email addresses anywhere: the local part is very often the name.
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) add('email', m.index, m.index + m[0].length);

  // 4. The name line. Usually the first line, but in multi-column layouts a
  // sidebar can come first, so also accept a name-like line that sits right
  // above the contact details.
  if (!spans.some((s) => s.type === 'name')) {
    const nameSeg = (l) => {
      const t = l.text.trim();
      if (!t || TITLE_LINE.test(t) || headingType(t)) return null;
      const seg = t
        .replace(/\(\s*(?:he|she|they)\s*\/\s*(?:him|her|them)\s*\)/i, '')
        .split(/[|,·•/]|\s{2,}/)[0]
        .trim()
        .replace(/^(?:Mr|Mrs|Ms|Miss|Mx|Dr)\.?\s+/, '')
        .replace(/\s*(?:先生|女士|小姐|同学)$/, '');
      return CJK_NAME.test(seg) || (LATIN_NAME.test(seg) && !JOB_TITLE_WORD.test(seg)) ? seg : null;
    };
    const firstContent = header.find((l) => l.text.trim() && !TITLE_LINE.test(l.text.trim()));
    for (let i = 0; i < header.length; i++) {
      const l = header[i];
      const seg = nameSeg(l);
      if (!seg) continue;
      const nearContact = [l, header[i + 1], header[i + 2]].some((x) => x && CONTACT.test(x.text));
      if (l !== firstContent && !nearContact) continue;
      const s = l.start + l.text.indexOf(seg);
      add('name', s, s + seg.length);
      break;
    }
  }

  // 5. A name that was found once is masked wherever else it appears, for
  // example in a sign-off ("Sincerely, ...") at the end.
  for (const span of spans.filter((x) => x.type === 'name')) {
    const value = text.slice(span.start, span.end);
    if (value.replace(/\s/g, '').length < 2) continue;
    const body = value.split(/\s+/).map(escapeRegExp).join('\\s*');
    const latin = /^[A-Za-z]/.test(value);
    const re = new RegExp(latin ? `(?<![A-Za-z])${body}(?![A-Za-z])` : body, latin ? 'gi' : 'g');
    for (const m of text.matchAll(re)) add('name', m.index, m.index + m[0].length);
  }

  return mergeSpans(spans);
}

export function mergeSpans(spans) {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  return merged;
}

/**
 * The identity zone: the part of a resume that holds who the person is rather
 * than what they can do. In protected mode the whole zone is hidden from every
 * rule, so the guarantee does not depend on recognising any particular name
 * or date format.
 *
 *  - With section headings: everything above the first heading, plus any
 *    "Personal information" / "个人信息" style section.
 *  - Without headings: the lines down to the last contact-like line among the
 *    first six (email, phone, gender or age). If there is none, the zone is
 *    empty and only the pattern-based masking above applies.
 *
 * @returns {Array<{type:'zone', start:number, end:number, fromLine:number, toLine:number}>}
 */
export function identityZone(text) {
  const { sections, lines } = detectSections(text);
  const zones = [];
  const push = (start, end) => {
    const body = text.slice(start, end);
    if (!body.trim()) return;
    const inside = lines.filter((l) => l.start >= start && l.end <= end && l.text.trim());
    zones.push({ type: 'zone', start, end, fromLine: inside[0].no, toLine: inside[inside.length - 1].no });
  };
  if (sections.length > 1) {
    push(sections[0].start, sections[0].end);
    // The heading line itself stays visible; only the section body is hidden.
    for (const s of sections.filter((x) => x.type === 'identity')) {
      const headingEnd = text.indexOf('\n', s.start);
      if (headingEnd >= 0 && headingEnd < s.end) push(headingEnd + 1, s.end);
    }
  } else {
    const firstSix = lines.filter((l) => l.text.trim()).slice(0, 6);
    let last = null;
    for (const l of firstSix) if (CONTACT.test(l.text) || EXTRA_IDENTITY.test(l.text)) last = l;
    if (last) push(0, last.end);
  }
  return zones;
}

/** Same-length masking, so every offset stays valid after redaction. */
export function redact(text, spans) {
  let out = '';
  let pos = 0;
  for (const s of spans) {
    out += text.slice(pos, s.start) + text.slice(s.start, s.end).replace(/[^\n]/g, MASK);
    pos = s.end;
  }
  return out + text.slice(pos);
}
