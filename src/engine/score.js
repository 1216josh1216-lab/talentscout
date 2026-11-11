// Scoring engine. Deterministic: same text + same rules = same result.
// Every point awarded is one entry in `results`, with a reason and evidence.
import { normalizeText, makeEvidence } from '../extract/text.js';
import { detectSections } from '../extract/sections.js';
import { findKeyword } from '../extract/match.js';
import { extractGraduation } from '../extract/graduation.js';
import { matchSchool } from '../extract/school.js';
import { findProtectedSpans, identityZone, mergeSpans, redact } from '../extract/protected.js';

export const MIN_READABLE_CHARS = 30;

function activeWeights(rules) {
  const w = { ...rules.weights };
  if (!rules.mustHave.length) w.mustHave = 0;
  if (!rules.niceToHave.length) w.niceToHave = 0;
  if (!rules.schoolTiers.some((t) => t.schools.length)) w.school = 0;
  if (!rules.graduation.enabled) w.graduation = 0;
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  const out = {};
  for (const k of Object.keys(w)) out[k] = sum > 0 ? (w[k] / sum) * 100 : 0;
  return out;
}

function keywordResults(text, lines, list, component, weight, hidden) {
  const each = list.length ? weight / list.length : 0;
  return list.map((entry, i) => {
    const hit = findKeyword(text, entry);
    const fired = !!hit && !hit.negated;
    let reason = { code: 'kw_missing', params: { term: entry.term, aliases: entry.aliases ?? [] } };
    if (fired) reason = { code: 'kw_matched', params: { term: entry.term, matchedAs: hit.matchedAs } };
    else if (hit) reason = { code: 'kw_negated', params: { term: entry.term, matchedAs: hit.matchedAs } };
    // Not found in the visible text, but present in the hidden identity zone:
    // say so, so a reviewer knows why it did not count.
    else if (hidden.some((h) => findKeyword(h.text, entry))) reason = { code: 'kw_zone_only', params: { term: entry.term } };
    return {
      ruleId: `${component}:${i}`,
      component,
      label: entry.term,
      fired,
      points: fired ? each : 0,
      maxPoints: each,
      reason,
      // A negated mention is still shown, so a reviewer can overrule it.
      evidence: hit ? [makeEvidence(text, lines, hit.start, hit.end)] : [],
    };
  });
}

/**
 * @param rawText text extracted from one resume
 * @param rules   validated rules (see rules.js)
 * @param opts.protectedMode when true (default) name, gender, age / date of
 *        birth and photo fields are redacted before any rule runs
 */
export function analyzeResume(rawText, rules, { protectedMode = true } = {}) {
  const original = normalizeText(rawText);
  const protectedSpans = findProtectedSpans(original);
  // In protected mode the identity zone (header block) is hidden from every
  // rule as a whole, and pattern-based masking covers the rest of the text.
  const zone = protectedMode ? identityZone(original) : [];
  const text = protectedMode ? redact(original, mergeSpans([...protectedSpans, ...zone])) : original;
  const hidden = zone.map((z) => ({ text: original.slice(z.start, z.end) }));
  const weights = activeWeights(rules);

  const base = { text, protectedMode, protectedSpans, identityZone: zone, weights };
  if (original.replace(/\s/g, '').length < MIN_READABLE_CHARS) {
    return { ...base, readable: false, total: null, flags: ['unreadable'], eligible: false, results: [], extracted: {} };
  }

  const { sections, educationRanges, lines } = detectSections(text);
  const results = [];
  const flags = [];

  // 1 + 2. Keywords
  const must = keywordResults(text, lines, rules.mustHave, 'mustHave', weights.mustHave, hidden);
  const nice = keywordResults(text, lines, rules.niceToHave, 'niceToHave', weights.niceToHave, hidden);
  results.push(...must, ...nice);
  if (must.some((r) => !r.fired)) flags.push('missing_must_have');

  // 3. School tier
  let school = null;
  if (weights.school > 0) {
    school = matchSchool(text, rules.schoolTiers, educationRanges, lines);
    results.push({
      ruleId: 'school',
      component: 'school',
      label: 'School tier',
      fired: !!school,
      points: school ? weights.school * school.tierScore : 0,
      maxPoints: weights.school,
      reason: school
        ? { code: 'school_matched', params: { school: school.school, matchedAs: school.matchedAs, tier: school.tierLabel, tierScore: school.tierScore } }
        : { code: 'school_none', params: {} },
      evidence: school ? [school.evidence] : [],
    });
  }

  // 4. Graduation window. Date-of-birth spans are always excluded, in either
  // mode, so a birth year cannot be read as a graduation year.
  let grad = null;
  if (rules.graduation.enabled) {
    const birth = protectedSpans.filter((s) => s.type === 'birth' || s.type === 'age');
    grad = extractGraduation(text, educationRanges, lines, birth);
    const { from, to, mode } = rules.graduation;
    const inWindow = grad.year !== null && grad.year >= from && grad.year <= to;
    let code = 'grad_unknown';
    if (grad.year !== null) code = inWindow ? 'grad_in_window' : 'grad_outside';
    else if (grad.inProgress) code = 'grad_in_progress';
    if (grad.year === null) flags.push('grad_unknown');
    else if (!inWindow) flags.push('outside_window');
    results.push({
      ruleId: 'graduation',
      component: 'graduation',
      label: 'Graduation window',
      fired: inWindow,
      points: inWindow ? weights.graduation : 0,
      maxPoints: weights.graduation,
      reason: { code, params: { year: grad.year, from, to, mode } },
      evidence: grad.evidence ? [grad.evidence] : [],
    });
  }

  const raw = results.reduce((a, r) => a + r.points, 0);
  const eligible =
    !flags.includes('missing_must_have') &&
    !(rules.graduation.enabled && rules.graduation.mode === 'filter' && flags.includes('outside_window'));

  return {
    ...base,
    readable: true,
    total: Math.round(raw * 10) / 10,
    flags,
    eligible,
    results,
    extracted: {
      graduationYear: grad?.year ?? null,
      school: school?.school ?? null,
      sections: sections.map((s) => s.type),
    },
  };
}

/**
 * Ranking order: eligible candidates first, then score (high to low), then id
 * for a stable order. Unreadable files go last.
 * @param candidates Array<{id:string, analysis:object}>
 */
export function rankCandidates(candidates) {
  const key = (c) => (c.analysis.readable ? (c.analysis.eligible ? 0 : 1) : 2);
  const sorted = [...candidates].sort(
    (a, b) =>
      key(a) - key(b) ||
      (b.analysis.total ?? -1) - (a.analysis.total ?? -1) ||
      String(a.id).localeCompare(String(b.id)),
  );
  return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
}
