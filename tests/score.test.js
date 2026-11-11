import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeResume, rankCandidates } from '../src/engine/score.js';
import { defaultRules, validateRules, parseRulesJson, serializeRules } from '../src/engine/rules.js';
import { formatReason } from '../src/i18n/reasons.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const EN = fixture('en_resume.txt');
const ZH = fixture('zh_resume.txt');
const rules = defaultRules();
const byId = (a, id) => a.results.find((r) => r.ruleId === id);

test('score: English resume, every point accounted for', () => {
  const a = analyzeResume(EN, rules);
  // must-have 2/2 = 40; nice-to-have 2/4 = 12.5; school tier A = 20; graduation = 15
  assert.equal(a.total, 87.5);
  assert.deepEqual(a.flags, []);
  assert.equal(a.eligible, true);
  assert.equal(byId(a, 'mustHave:0').points, 20);
  assert.equal(byId(a, 'niceToHave:2').fired, false, '"Java" must not match "JavaScript"');
  assert.equal(byId(a, 'school').evidence[0].quote, 'Massachusetts Institute of Technology');
  assert.equal(byId(a, 'graduation').reason.params.year, 2025);
  assert.match(byId(a, 'graduation').evidence[0].quote, /Sep 2021 – Jun 2025/);
  const sum = a.results.reduce((s, r) => s + r.points, 0);
  assert.ok(Math.abs(sum - a.total) < 0.05, 'total equals the sum of rule points');
});

test('score: Chinese resume, every point accounted for', () => {
  const a = analyzeResume(ZH, rules);
  // must-have 2/2 = 40; nice-to-have 3/4 = 18.75; school tier B = 20 * 0.6 = 12; graduation = 15
  assert.equal(a.total, 85.8);
  assert.deepEqual(a.flags, []);
  assert.equal(byId(a, 'niceToHave:0').reason.params.matchedAs, '机器学习');
  assert.equal(byId(a, 'school').reason.params.school, 'Zhejiang University');
  assert.equal(byId(a, 'school').evidence[0].quote, '浙江大学');
  assert.equal(byId(a, 'graduation').reason.params.year, 2025);
  assert.equal(a.extracted.graduationYear, 2025);
});

test('score: every fired rule carries evidence that really is in the text', () => {
  for (const src of [EN, ZH]) {
    const a = analyzeResume(src, rules);
    for (const r of a.results.filter((x) => x.fired)) {
      assert.ok(r.evidence.length > 0, r.ruleId);
      for (const e of r.evidence) assert.equal(a.text.slice(e.start, e.end), e.quote);
    }
  }
});

test('score: reasons render in English and Chinese', () => {
  const a = analyzeResume(ZH, rules);
  const r = byId(a, 'graduation');
  assert.equal(formatReason(r.reason, 'en'), 'Graduation year 2025 is inside the window 2025–2026.');
  assert.equal(formatReason(r.reason, 'zh'), '毕业年份 2025 在要求范围 2025–2026 内。');
});

test('score: missing must-have is flagged, still scored, ranked below eligible', () => {
  const noSql = EN.replace(/SQL/g, 'Excel');
  const a = analyzeResume(noSql, rules);
  assert.deepEqual(a.flags, ['missing_must_have']);
  assert.equal(a.eligible, false);
  assert.equal(a.total, 67.5);
  const weak = analyzeResume('Sam Sample\n\nEDUCATION\nSpringfield College, 2020 - 2024\n\nSKILLS\nPython, SQL', rules);
  assert.equal(weak.total, 40);
  const ranked = rankCandidates([
    { id: 'noSql', analysis: a },
    { id: 'weak', analysis: weak },
  ]);
  assert.deepEqual(ranked.map((c) => c.id), ['weak', 'noSql'], 'eligible 40 ranks above ineligible 67.5');
});

test('score: graduation filter mode vs score mode', () => {
  const old = EN.replace('Sep 2021 – Jun 2025', 'Sep 2015 – Jun 2019');
  const scoreMode = analyzeResume(old, rules);
  assert.deepEqual(scoreMode.flags, ['outside_window']);
  assert.equal(scoreMode.eligible, true);
  assert.equal(scoreMode.total, 72.5);
  const filterRules = { ...rules, graduation: { ...rules.graduation, mode: 'filter' } };
  assert.equal(analyzeResume(old, filterRules).eligible, false);
});

test('score: weights are renormalised when a component is switched off', () => {
  const r = { ...rules, graduation: { ...rules.graduation, enabled: false } };
  const a = analyzeResume(EN, r);
  // remaining weights 40/25/20 scale to 100: (40 + 12.5 + 20) / 85 * 100
  assert.equal(a.total, 85.3);
  assert.equal(byId(a, 'graduation'), undefined);
});

test('score: empty or image-only input is "unreadable", not zero', () => {
  const a = analyzeResume('   \n ', rules);
  assert.equal(a.readable, false);
  assert.equal(a.total, null);
  assert.deepEqual(a.flags, ['unreadable']);
});

test('score: repeating a keyword 50 times earns nothing extra', () => {
  const stuffed = EN + '\n' + 'Python SQL PyTorch '.repeat(50);
  assert.equal(analyzeResume(stuffed, rules).total, analyzeResume(EN, rules).total);
});

// ---- Protected attributes: the score must not move ------------------------

test('protected mode: changing name, gender, age and birth date leaves the score identical (EN)', () => {
  const variant = EN.replace('Avery Example', 'Jordan Placeholder').replace('Male', 'Female').replace('Age: 24', 'Age: 51');
  assert.notEqual(variant, EN);
  const a = analyzeResume(EN, rules);
  const b = analyzeResume(variant, rules);
  assert.equal(b.total, a.total);
  assert.deepEqual(b.results.map((r) => r.points), a.results.map((r) => r.points));
});

test('protected mode: same for a Chinese resume', () => {
  const variant = ZH.replace('林晓雨', '王建国').replace('性别：女', '性别：男').replace('23岁', '45岁').replace('2002年3月', '1980年11月');
  assert.notEqual(variant, ZH);
  assert.equal(analyzeResume(variant, rules).total, analyzeResume(ZH, rules).total);
});

test('protected mode: a name that is also a keyword cannot score', () => {
  const text = 'Java Python\nFemale | Age: 30\n\nEDUCATION\nSpringfield College, 2021 - 2025\n\nSKILLS\nSQL, Excel';
  const on = analyzeResume(text, rules, { protectedMode: true });
  const off = analyzeResume(text, rules, { protectedMode: false });
  assert.equal(on.results.find((r) => r.label === 'Python').fired, false);
  assert.equal(off.results.find((r) => r.label === 'Python').fired, true, 'with the mode off the name leaks into the score');
  assert.ok(on.total < off.total);
});

test('protected mode: evidence never quotes a protected value', () => {
  for (const src of [EN, ZH]) {
    const a = analyzeResume(src, rules);
    const shown = a.results.flatMap((r) => r.evidence.map((e) => e.lineText)).join('\n');
    for (const leak of ['Avery', 'Male', '林晓雨', '23岁', '2002']) assert.equal(shown.includes(leak), false, leak);
  }
});

// ---- Rules ----------------------------------------------------------------

test('rules: defaults validate and survive a JSON round trip', () => {
  const v = validateRules(defaultRules());
  assert.equal(v.ok, true, v.errors.join('; '));
  const back = parseRulesJson(serializeRules(v.rules));
  assert.equal(back.ok, true);
  assert.deepEqual(back.rules, v.rules);
  assert.equal(analyzeResume(EN, back.rules).total, 87.5);
});

test('rules: bad input is rejected with readable errors', () => {
  assert.equal(parseRulesJson('{not json').ok, false);
  assert.equal(validateRules([]).ok, false);
  const bad = validateRules({ weights: { mustHave: -1 }, mustHave: [{ term: '' }], schoolTiers: [{ score: 3 }], graduation: { from: 2026, to: 2025 } });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 4, bad.errors.join('; '));
});

test('rules: plain strings are accepted as keywords and school names', () => {
  const v = validateRules({ mustHave: ['Python'], schoolTiers: [{ score: 1, schools: ['Example University'] }], graduation: { enabled: false } });
  assert.equal(v.ok, true, v.errors.join('; '));
  assert.deepEqual(v.rules.mustHave, [{ term: 'Python', aliases: [] }]);
  assert.equal(v.rules.schoolTiers[0].schools[0].name, 'Example University');
});

// ---- Regressions found by probing, and known limits -----------------------

test('no headings: a job line after the school line is not read as education', () => {
  const a = analyzeResume('Pat Sample\nB.S. Statistics, Stanford University, 2021-2025\nPython, SQL at Acme 2025-2026', rules);
  assert.equal(a.extracted.graduationYear, 2025);
  assert.equal(a.extracted.school, 'Stanford University');
});

test('no headings (Chinese): school and year on one line', () => {
  const a = analyzeResume('陈某某\n清华大学 统计学 本科 2021.9-2025.7\n熟悉Python、SQL,做过机器学习课程项目', rules);
  assert.equal(a.extracted.graduationYear, 2025);
  assert.equal(a.extracted.school, 'Tsinghua University');
});

test('a keyword that appears only in the header block does not count in protected mode, and says why', () => {
  const text = 'Machine Learning Engineer\n\nEDUCATION\nSpringfield College 2021-2025\n\nSKILLS\nPython SQL';
  const on = analyzeResume(text, rules).results.find((r) => r.label === 'Machine Learning');
  assert.equal(on.fired, false);
  assert.equal(on.reason.code, 'kw_zone_only');
  const off = analyzeResume(text, rules, { protectedMode: false }).results.find((r) => r.label === 'Machine Learning');
  assert.equal(off.fired, true);
});

test('identity zone: the whole header block is hidden, whatever format the name is in', () => {
  const headers = ['Ellis, Morgan\n+1 555-0199', 'Resume of Docker Java\nx@example.com', '应聘人:容器化\n联系电话:138-0000-0099', 'DOCKER JAVA', 'Docker J. Java, 24, female'];
  for (const hd of headers) {
    const a = analyzeResume(`${hd}\n\nEDUCATION\nSpringfield College 2021-2025\n\nSKILLS\nPython, SQL`, rules);
    assert.equal(a.total, 55, hd);
    assert.equal(a.identityZone.length, 1, hd);
    for (const leak of ['Morgan', 'Ellis', 'Docker', 'Java', '容器化', 'female', '24,']) assert.equal(a.text.includes(leak), false, `${hd} / ${leak}`);
    assert.ok(a.text.includes('Python, SQL'));
  }
});

test('identity zone: a "Personal information" section lower down is hidden too', () => {
  const a = analyzeResume('SKILLS\nPython, SQL\n\nEDUCATION\nSpringfield College 2021-2025\n\nPERSONAL INFORMATION\nMarried, two children. Docker Java is my name.\n\n个人信息\n已婚，容器化', rules);
  assert.equal(a.text.includes('Married'), false);
  assert.equal(a.results.find((r) => r.label === 'Docker').reason.code, 'kw_zone_only');
  assert.equal(a.identityZone.length, 2);
});

test('identity zone: without headings only the contact lines are hidden; with no contact line nothing is', () => {
  const a = analyzeResume('Pat Sample\npat@example.com | 555-010-0199\nB.S. Statistics, Stanford University, 2021-2025\nPython and SQL', rules);
  assert.deepEqual([a.identityZone[0].fromLine, a.identityZone[0].toLine], [1, 2]);
  assert.equal(a.extracted.school, 'Stanford University');
  const b = analyzeResume('Pat Sample\nB.S. Statistics, Stanford University, 2021-2025\nPython and SQL in several course projects', rules);
  assert.deepEqual(b.identityZone, []);
  assert.equal(b.total, 75);
});

// ---- Negation --------------------------------------------------------------

const kw = (text, label) => analyzeResume(`Pat Sample\n\nEDUCATION\nSpringfield College 2021-2025\n\nSKILLS\n${text}`, rules).results.find((r) => r.label === label);

test('negation: English negated mentions do not count, and say why', () => {
  const neg = [
    'No experience with Python or SQL yet.',
    'I have not used Python in production',
    "Haven't worked with Python",
    'Never used Python, SQL or Java',
    'Strong in Excel, without Python or SQL exposure',
    'Lacking Python skills',
    'Python: none',
    'Python (no experience)',
  ];
  for (const t of neg) {
    const r = kw(t, 'Python');
    assert.equal(r.fired, false, t);
    assert.equal(r.points, 0, t);
    assert.equal(r.reason.code, 'kw_negated', t);
    assert.equal(r.evidence[0].quote.toLowerCase(), 'python', 'the negated mention is still shown as evidence');
  }
});

test('negation: Chinese negated mentions do not count', () => {
  for (const t of ['不熟悉 Python、SQL', '尚未学习Python', '没有 Python 使用经验', '无Python经验', 'Python 不熟悉', 'Python(未使用)', '未接触过 Python 和 SQL', '不会Python']) {
    assert.equal(kw(t, 'Python').reason.code, 'kw_negated', t);
  }
});

test('negation: affirmative mentions near a negation still count', () => {
  const pos = [
    'No formal training, but used Python daily',
    'Not only Python but also SQL',
    'No. 1 in a Python contest',
    'No gaps in employment. Python, SQL',
    'Excel: none; Python: advanced',
    'NoSQL, Python, SQL',
    'Notable projects in Python',
    'Cannot wait to use Python more',
    'I do not just use Python, I teach it',
    'Team had no analyst, so I learned Python',
    'Python - beginner; SQL - not yet',
    'Knowledge of Python is not required for my current role',
    'Python基础薄弱',
    '没有挂科,熟练掌握 Python、SQL',
    '不熟悉 Java,但熟悉 Python',
    '在无锡使用 Python 开发',
  ];
  for (const t of pos) assert.equal(kw(t, 'Python').fired, true, t);
});

test('negation: one affirmative mention anywhere outweighs a negated one', () => {
  const r = kw('No Python certification.\nBuilt ETL jobs in Python.', 'Python');
  assert.equal(r.fired, true);
  assert.match(r.evidence[0].lineText, /Built ETL/);
});

test('negation: a negated must-have is flagged as missing', () => {
  const a = analyzeResume('Pat Sample\n\nEDUCATION\nSpringfield College 2021-2025\n\nSKILLS\nSQL. No experience with Python.', rules);
  assert.deepEqual(a.flags, ['missing_must_have']);
  assert.equal(formatReason(a.results[0].reason, 'en'), 'Keyword "Python" appears only in a negated phrase, so it does not count.');
  assert.equal(formatReason(a.results[0].reason, 'zh'), '关键词“Python”仅出现在否定表述中，不计分。');
});

test('KNOWN LIMIT: a negation cue in a short lead-in clause still negates', { todo: true }, () => {
  assert.equal(kw('Without supervision, shipped Python services', 'Python').fired, true);
});
