// Rules schema: defaults, validation, JSON save/load.

export const RULES_VERSION = 1;
export const COMPONENTS = ['mustHave', 'niceToHave', 'school', 'graduation'];

/**
 * Example rule set for a graduate data role. The school tiers are an
 * illustration of the format only: edit them to match your own policy.
 */
export function defaultRules() {
  return {
    version: RULES_VERSION,
    name: 'Example: graduate data analyst',
    weights: { mustHave: 40, niceToHave: 25, school: 20, graduation: 15 },
    mustHave: [
      { term: 'Python', aliases: [] },
      { term: 'SQL', aliases: ['MySQL', 'PostgreSQL'] },
    ],
    niceToHave: [
      { term: 'Machine Learning', aliases: ['机器学习'] },
      { term: 'PyTorch', aliases: [] },
      { term: 'Java', aliases: [] },
      { term: 'Docker', aliases: ['容器化'] },
    ],
    schoolTiers: [
      {
        id: 'tier-a',
        label: 'Tier A (example)',
        score: 1,
        schools: [
          { name: 'Massachusetts Institute of Technology', aliases: ['MIT', '麻省理工学院'] },
          { name: 'Stanford University', aliases: ['斯坦福大学'] },
          { name: 'University of Oxford', aliases: ['Oxford University', '牛津大学'] },
          { name: 'Tsinghua University', aliases: ['清华大学'] },
          { name: 'Peking University', aliases: ['北京大学'] },
        ],
      },
      {
        id: 'tier-b',
        label: 'Tier B (example)',
        score: 0.6,
        schools: [
          { name: 'Zhejiang University', aliases: ['浙江大学'] },
          { name: 'Fudan University', aliases: ['复旦大学'] },
          { name: 'University of Michigan', aliases: ['密歇根大学'] },
          { name: 'University of Toronto', aliases: ['多伦多大学'] },
          { name: 'National University of Singapore', aliases: ['NUS', '新加坡国立大学'] },
        ],
      },
    ],
    graduation: { enabled: true, from: 2025, to: 2026, mode: 'score' },
  };
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function cleanKeywords(list, path, errors) {
  if (list === undefined) return [];
  if (!Array.isArray(list)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  const out = [];
  list.forEach((k, i) => {
    const entry = typeof k === 'string' ? { term: k } : k;
    if (!entry || !isStr(entry.term)) {
      errors.push(`${path}[${i}].term must be a non-empty string`);
      return;
    }
    const aliases = Array.isArray(entry.aliases) ? entry.aliases.filter(isStr).map((s) => s.trim()) : [];
    out.push({ term: entry.term.trim(), aliases, ...(entry.caseSensitive ? { caseSensitive: true } : {}) });
  });
  return out;
}

/**
 * Validates untrusted input (a loaded JSON file) and returns a clean copy.
 * @returns {{ok:boolean, errors:string[], rules:object|null}}
 */
export function validateRules(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['rules must be a JSON object'], rules: null };
  }
  if (input.version !== undefined && input.version !== RULES_VERSION) {
    errors.push(`unsupported rules version ${input.version} (expected ${RULES_VERSION})`);
  }
  const d = defaultRules();
  const weights = {};
  for (const c of COMPONENTS) {
    const w = input.weights?.[c] ?? d.weights[c];
    if (!isNum(w) || w < 0) errors.push(`weights.${c} must be a number >= 0`);
    weights[c] = w;
  }
  const mustHave = cleanKeywords(input.mustHave, 'mustHave', errors);
  const niceToHave = cleanKeywords(input.niceToHave, 'niceToHave', errors);

  const schoolTiers = [];
  if (input.schoolTiers !== undefined && !Array.isArray(input.schoolTiers)) {
    errors.push('schoolTiers must be an array');
  } else {
    (input.schoolTiers ?? []).forEach((t, i) => {
      if (!t || typeof t !== 'object') return errors.push(`schoolTiers[${i}] must be an object`);
      if (!isNum(t.score) || t.score < 0 || t.score > 1) errors.push(`schoolTiers[${i}].score must be between 0 and 1`);
      if (t.schools !== undefined && !Array.isArray(t.schools)) return errors.push(`schoolTiers[${i}].schools must be an array`);
      const schools = [];
      (t.schools ?? []).forEach((s, j) => {
        const entry = typeof s === 'string' ? { name: s } : s;
        if (!entry || !isStr(entry.name)) return errors.push(`schoolTiers[${i}].schools[${j}].name must be a non-empty string`);
        schools.push({
          name: entry.name.trim(),
          aliases: Array.isArray(entry.aliases) ? entry.aliases.filter(isStr).map((x) => x.trim()) : [],
        });
      });
      schoolTiers.push({
        id: isStr(t.id) ? t.id : `tier-${i + 1}`,
        label: isStr(t.label) ? t.label : `Tier ${i + 1}`,
        score: t.score,
        schools,
      });
    });
  }

  const g = input.graduation ?? { enabled: false };
  const graduation = {
    enabled: g.enabled !== false,
    from: g.from ?? null,
    to: g.to ?? null,
    mode: g.mode ?? 'score',
  };
  if (graduation.enabled) {
    if (!Number.isInteger(graduation.from) || !Number.isInteger(graduation.to)) {
      errors.push('graduation.from and graduation.to must be whole years');
    } else if (graduation.from > graduation.to) {
      errors.push('graduation.from must not be after graduation.to');
    }
    if (!['score', 'filter'].includes(graduation.mode)) errors.push('graduation.mode must be "score" or "filter"');
  }

  if (errors.length) return { ok: false, errors, rules: null };
  return {
    ok: true,
    errors: [],
    rules: {
      version: RULES_VERSION,
      name: isStr(input.name) ? input.name.trim() : 'Untitled rules',
      weights,
      mustHave,
      niceToHave,
      schoolTiers,
      graduation,
    },
  };
}

export function serializeRules(rules) {
  return JSON.stringify(rules, null, 2) + '\n';
}

export function parseRulesJson(jsonText) {
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    return { ok: false, errors: [`not valid JSON: ${e.message}`], rules: null };
  }
  return validateRules(obj);
}
