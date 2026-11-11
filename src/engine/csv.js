// CSV export of a ranked list. Pure function; the UI only triggers the download.
import { formatReason, formatFlag } from '../i18n/reasons.js';

const HEADERS = {
  en: ['Rank', 'Candidate', 'Score', 'Eligible', 'Status', 'Must-have matched', 'Must-have missing', 'Nice-to-have matched', 'School', 'Graduation year', 'Explanation'],
  zh: ['排名', '候选人', '得分', '是否合格', '状态', '已满足必备项', '缺少必备项', '已满足加分项', '院校', '毕业年份', '评分说明'],
};
const YES_NO = { en: ['Yes', 'No'], zh: ['是', '否'] };

/**
 * Quotes every cell, and neutralises spreadsheet formulas: a resume is
 * untrusted input, and a cell starting with = + - @ would otherwise be
 * executed by Excel when the reviewer opens the export.
 */
export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * @param ranked output of rankCandidates(); each item has {rank, label, analysis}
 * @returns CSV text starting with a UTF-8 BOM so Excel reads Chinese correctly
 */
export function toCsv(ranked, lang = 'en') {
  const L = HEADERS[lang] ? lang : 'en';
  const rows = [HEADERS[L]];
  for (const c of ranked) {
    const a = c.analysis;
    const of = (component, fired) => a.results.filter((r) => r.component === component && r.fired === fired).map((r) => r.label).join('; ');
    rows.push([
      c.rank,
      c.label,
      a.total ?? '',
      YES_NO[L][a.eligible ? 0 : 1],
      a.flags.map((f) => formatFlag(f, L)).join('; '),
      of('mustHave', true),
      of('mustHave', false),
      of('niceToHave', true),
      a.extracted?.school ?? '',
      a.extracted?.graduationYear ?? '',
      a.results.map((r) => `[${r.points.toFixed(1)}/${r.maxPoints.toFixed(1)}] ${formatReason(r.reason, L)}`).join(' '),
    ]);
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
