// School-tier matching inside the education ranges.
import { findMatches } from './match.js';
import { inRanges, makeEvidence } from './text.js';

// A school name followed by one of these is a different institution
// (affiliated high school etc.), not the university itself.
const NOT_THE_SCHOOL = /^\s*(?:附属|附中|附小|affiliated (?:high|middle|primary) school)/i;

/**
 * @returns {null | {tierId, tierLabel, tierScore, school, matchedAs, evidence}}
 * If several listed schools appear, the highest-scoring tier wins.
 */
export function matchSchool(text, tiers, ranges, lines) {
  const hits = [];
  for (const tier of tiers ?? []) {
    for (const school of tier.schools ?? []) {
      for (const name of [school.name, ...(school.aliases ?? [])]) {
        // Short all-caps aliases ("MIT", "NUS") must match case exactly.
        const caseSensitive = /^[A-Z]{2,5}$/.test(name);
        for (const m of findMatches(text, name, { caseSensitive })) {
          if (!inRanges(ranges, m.start, m.end)) continue;
          if (NOT_THE_SCHOOL.test(text.slice(m.end, m.end + 30))) continue;
          hits.push({ ...m, tier, school: school.name, matchedAs: name });
        }
      }
    }
  }
  // Drop a hit that sits strictly inside a longer hit for another school
  // ("南京大学" inside a listed "东南京大学"-style longer name).
  const kept = hits.filter(
    (h) =>
      !hits.some(
        (o) => o !== h && o.school !== h.school && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start,
      ),
  );
  if (!kept.length) return null;
  kept.sort((a, b) => b.tier.score - a.tier.score || a.start - b.start);
  const best = kept[0];
  return {
    tierId: best.tier.id,
    tierLabel: best.tier.label,
    tierScore: best.tier.score,
    school: best.school,
    matchedAs: best.matchedAs,
    evidence: makeEvidence(text, lines, best.start, best.end),
  };
}
