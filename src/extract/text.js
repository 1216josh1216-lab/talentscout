// Text helpers shared by every extractor. Pure functions, no DOM.

export const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/;

/**
 * Canonical form used everywhere downstream. All offsets in evidence refer to
 * this normalised text. NFKC folds full-width forms (：，（ Ａ １) to ASCII.
 */
export function normalizeText(raw) {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\t/g, '  ')
    .replace(/[ ]+$/gm, '');
}

export function splitLines(text) {
  const out = [];
  let start = 0;
  let no = 1;
  for (const t of text.split('\n')) {
    out.push({ no, start, end: start + t.length, text: t });
    start += t.length + 1;
    no++;
  }
  return out;
}

export function lineAt(lines, offset) {
  for (const l of lines) if (offset >= l.start && offset <= l.end) return l;
  return lines[lines.length - 1];
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function inRanges(ranges, start, end) {
  return ranges.some((r) => start >= r.start && end <= r.end);
}

/** Evidence record: the matched text plus the full line it sits on. */
export function makeEvidence(text, lines, start, end) {
  const l = lineAt(lines, start);
  return { quote: text.slice(start, end), start, end, line: l.no, lineText: l.text.trim() };
}
