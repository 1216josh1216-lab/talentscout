// Ablation: change ONLY protected attributes and check the score does not move.
import { PROFILES } from './profiles.mjs';
import { renderResume, identityFor, POOLS } from './render.mjs';
import { analyzeResume } from '../../src/engine/score.js';

/** Identity overrides, each changing one protected attribute (or all). */
export function variantsFor(p) {
  const id = identityFor(p);
  const en = p.lang === 'en';
  const gi = (POOLS.EN_GIVEN.indexOf(id.given) + POOLS.ZH_GIVEN.indexOf(id.given) + 1 + 5) % 12; // one index is -1
  const name = en
    ? { given: POOLS.EN_GIVEN[gi], family: POOLS.EN_FAMILY[(POOLS.EN_FAMILY.indexOf(id.family) + 5) % 12] }
    : {
        // also changes the length of the name: 2 characters <-> 4 characters
        given: id.given.length === 1 ? '明轩' : '伟',
        family: id.family === '欧阳' ? '张' : id.given.length === 1 ? '欧阳' : POOLS.ZH_FAMILY[(POOLS.ZH_FAMILY.indexOf(id.family) + 3) % 10],
        handle: id.given.length === 1 ? 'mingxuan' : 'wei',
      };
  const gender = { gender: id.gender === 'M' ? 'F' : 'M' };
  const age = { age: id.age + 17, birth: { ...id.birth, y: id.birth.y - 17 } };
  const photo = { photo: !id.photo };
  // A "name" that is also a nice-to-have keyword. If the name were not masked
  // it would earn points, so this variant shows the test can fail.
  const keywordName = en ? { given: 'Docker', family: 'Java' } : { family: '容', given: '器化', handle: 'docker' };
  return {
    name,
    gender,
    age,
    photo,
    all: { ...name, ...gender, ...age, ...photo },
    keyword_name: keywordName,
  };
}

const points = (a) => a.results.map((r) => r.points.toFixed(6)).join(',');

/**
 * @returns {{checked:number, changed:Array}} `changed` lists every variant
 * whose total or per-rule points differ from the unmodified resume.
 */
export function runAblation(rules, { protectedMode = true } = {}) {
  const changed = [];
  let checked = 0;
  for (const p of PROFILES) {
    const base = analyzeResume(renderResume(p).text, rules, { protectedMode });
    for (const [variant, overrides] of Object.entries(variantsFor(p))) {
      const v = renderResume(p, overrides);
      const a = analyzeResume(v.text, rules, { protectedMode });
      checked++;
      if (a.total !== base.total || points(a) !== points(base) || a.flags.join() !== base.flags.join()) {
        changed.push({ id: p.id, lang: p.lang, header: p.header, variant, base: base.total, got: a.total });
      }
    }
  }
  return { checked, changed };
}

/**
 * Separate, stricter question: is each protected VALUE actually hidden from
 * the text the rules see? (A value can leak without changing the score.)
 */
export function auditMasking(rules) {
  const leaks = [];
  const byType = {};
  for (const p of PROFILES) {
    const r = renderResume(p);
    const a = analyzeResume(r.text, rules, { protectedMode: true });
    for (const s of r.protectedSnippets) {
      const t = (byType[s.type] ??= { total: 0, masked: 0 });
      t.total++;
      const visible = a.text.includes(s.snippet.normalize('NFKC'));
      if (visible) leaks.push({ id: p.id, lang: p.lang, header: p.header, type: s.type, snippet: s.snippet });
      else t.masked++;
    }
  }
  return { byType, leaks };
}
