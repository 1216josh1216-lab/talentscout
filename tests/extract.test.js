import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText, splitLines } from '../src/extract/text.js';
import { findMatches, findKeyword } from '../src/extract/match.js';
import { detectSections } from '../src/extract/sections.js';
import { extractGraduation } from '../src/extract/graduation.js';
import { matchSchool } from '../src/extract/school.js';
import { findProtectedSpans, redact, MASK } from '../src/extract/protected.js';
import { defaultRules } from '../src/engine/rules.js';

const has = (text, term, opts) => findMatches(normalizeText(text), term, opts).length > 0;

test('keywords: Latin terms respect token boundaries', () => {
  assert.equal(has('Skills: Java, Python', 'Java'), true);
  assert.equal(has('Skills: JavaScript', 'Java'), false);
  assert.equal(has('Languages: C++, C#', 'C'), false);
  assert.equal(has('Languages: C, Go', 'C'), true);
  assert.equal(has('Languages: C++, C#', 'C++'), true);
  assert.equal(has('Used python3 and Java8 daily', 'Python'), true);
  assert.equal(has('Used python3 and Java8 daily', 'Java'), true);
  assert.equal(has('mysql admin', 'SQL'), false);
});

test('keywords: case, spaces and hyphens', () => {
  assert.equal(has('MACHINE LEARNING projects', 'machine learning'), true);
  assert.equal(has('machine-learning projects', 'Machine Learning'), true);
  assert.equal(has('scikit learn', 'scikit-learn'), true);
  assert.equal(has('I like to go hiking', 'Go', { caseSensitive: true }), false);
  assert.equal(has('Go, Rust', 'Go', { caseSensitive: true }), true);
});

test('keywords: Chinese terms match as substrings, full-width text is folded', () => {
  assert.equal(has('熟悉机器学习与深度学习', '机器学习'), true);
  assert.equal(has('熟练使用Ｐｙｔｈｏｎ进行数据分析', 'Python'), true);
  assert.equal(has('熟悉数据库', '机器学习'), false);
});

test('keywords: alias is reported as the matched form', () => {
  const hit = findKeyword(normalizeText('主修课程:机器学习'), { term: 'Machine Learning', aliases: ['机器学习'] });
  assert.equal(hit.matchedAs, '机器学习');
});

// ---- Sections -------------------------------------------------------------

test('sections: English and Chinese headings are recognised', () => {
  const en = detectSections(normalizeText('Jo Doe\n\nEDUCATION\nX University\n\nWork Experience\nY Corp\n\nSkills:\nPython'));
  assert.deepEqual(en.sections.map((s) => s.type), ['header', 'education', 'experience', 'skills']);
  const zh = detectSections(normalizeText('个人简历\n\n一、教育背景\n某大学\n\n二、实习经历\n某公司\n\n【专业技能】\nPython'));
  assert.deepEqual(zh.sections.map((s) => s.type), ['header', 'education', 'experience', 'skills']);
  const bi = detectSections(normalizeText('教育背景 Education\n某大学'));
  assert.equal(bi.sections[1].type, 'education');
});

test('sections: a content line that merely contains a heading word is not a heading', () => {
  const r = detectSections(normalizeText('EDUCATION\n清华大学教育学院 education\nSKILLS\nSQL'));
  assert.deepEqual(r.sections.map((s) => s.type), ['header', 'education', 'skills']);
});

// ---- Graduation year ------------------------------------------------------

function grad(eduBody, heading = 'EDUCATION') {
  const text = normalizeText(`Header line\n\n${heading}\n${eduBody}\n\nSKILLS\nPython`);
  const { educationRanges, lines } = detectSections(text);
  const birth = findProtectedSpans(text).filter((s) => s.type === 'birth');
  return extractGraduation(text, educationRanges, lines, birth);
}

test('graduation year: English formats', () => {
  const cases = [
    ['B.S. Computer Science, Class of 2025', 2025],
    ['Expected May 2026', 2026],
    ['Expected graduation: June 2026', 2026],
    ['Graduated in 2019', 2019],
    ['Sep 2021 – Jun 2025', 2025],
    ['September 2021 - June 2025', 2025],
    ['2021 - 2025', 2025],
    ['09/2021 - 06/2025', 2025],
    ['2021 to 2025', 2025],
    ['M.S. Statistics, 2024', 2024],
    ['B.S. 2017 - 2021\nM.S. 2021 - 2023', 2023],
    ['B.S. 2019 - 2023\nM.S. 2023 - Present, expected 2025', 2025],
  ];
  for (const [input, year] of cases) assert.equal(grad(input).year, year, input);
});

test('graduation year: Chinese formats', () => {
  const cases = [
    ['2021.09 - 2025.06  浙江大学  本科', 2025],
    ['2021.09-2025.06 浙江大学', 2025],
    ['2021年9月 - 2025年6月 浙江大学', 2025],
    ['2021年9月至2025年6月 浙江大学', 2025],
    ['2021/09～2025/06 浙江大学', 2025],
    ['浙江大学 2025届本科毕业生', 2025],
    ['浙江大学 计算机 本科 2025年6月毕业', 2025],
    ['浙江大学 预计毕业时间：2026', 2026],
    ['2017.09-2021.06 本科\n2021.09-2024.03 硕士', 2024],
  ];
  for (const [input, year] of cases) assert.equal(grad(input, '教育背景').year, year, input);
});

test('graduation year: two-digit years, only as a month-qualified range', () => {
  const cases = [
    ['Springfield College 09/21 - 06/25', 2025],
    ["Sep '21 – Jun '25", 2025],
    ["B.S., '21 - '25", 2025],
    ['9/98 - 6/02', 2002],
    ['21.09 - 25.06 浙江大学 本科', 2025],
    ['21年9月 - 25年6月 浙江大学', 2025],
    ['21年9月至25年6月 浙江大学', 2025],
    ['B.S. 2021-25', 2025],
    ['2021/9-25/6 浙江大学', 2025],
  ];
  for (const [input, year] of cases) assert.equal(grad(input).year, year, input);
  // Not dates: must stay unknown rather than be guessed.
  for (const input of ['GPA 3.8/4.0, rank 12/85', 'Scores 85.5 - 90.1', 'Courses 21 - 25', 'Room 09/21']) {
    assert.equal(grad(input).year, null, input);
  }
  const open = grad('09/23 - Present');
  assert.equal(open.year, null);
  assert.equal(open.inProgress, true);
  // Year-month is not an abbreviated range.
  assert.equal(grad('Enrolled 2019-12').year, 2019);
  // A four-digit range always beats a two-digit one.
  assert.equal(grad('2019 - 2023\nexchange 09/21 - 01/22').year, 2023);
});

test('graduation year: in-progress degree without an end date is unknown, not guessed', () => {
  const en = grad('B.S. Computer Science, 2023 - Present');
  assert.equal(en.year, null);
  assert.equal(en.inProgress, true);
  const zh = grad('2023.09 - 至今 浙江大学 硕士', '教育背景');
  assert.equal(zh.year, null);
  assert.equal(zh.inProgress, true);
});

test('graduation year: a date of birth is never read as graduation', () => {
  const text = normalizeText('姓名：某某\n出生年月：2002年3月\n\n教育背景\n出生日期: 2002.03\n浙江大学 本科\n\n技能\nSQL');
  const { educationRanges, lines } = detectSections(text);
  const birth = findProtectedSpans(text).filter((s) => s.type === 'birth');
  assert.equal(extractGraduation(text, educationRanges, lines, birth).year, null);
});

test('graduation year: work dates outside the education section are ignored', () => {
  const text = normalizeText('EDUCATION\nState University, 2018 - 2022\n\nEXPERIENCE\nAcme, 2022 - 2024');
  const { educationRanges, lines } = detectSections(text);
  assert.equal(extractGraduation(text, educationRanges, lines).year, 2022);
});

// ---- Schools --------------------------------------------------------------

function school(text) {
  const t = normalizeText(text);
  const { educationRanges, lines } = detectSections(t);
  return matchSchool(t, defaultRules().schoolTiers, educationRanges, lines);
}

test('school: English name, alias and Chinese name resolve to the same school', () => {
  assert.equal(school('EDUCATION\nTsinghua University, B.Eng.').school, 'Tsinghua University');
  assert.equal(school('教育背景\n清华大学 本科').school, 'Tsinghua University');
  assert.equal(school('教育背景\n清华大学 本科').matchedAs, '清华大学');
  assert.equal(school('EDUCATION\nMIT, B.S.').school, 'Massachusetts Institute of Technology');
});

test('school: best tier wins; unlisted school gives null', () => {
  const r = school('EDUCATION\nFudan University, B.S. 2019-2023\nStanford University, M.S. 2023-2025');
  assert.equal(r.school, 'Stanford University');
  assert.equal(r.tierScore, 1);
  assert.equal(school('EDUCATION\nSpringfield Community College'), null);
});

test('school: only the education section counts', () => {
  assert.equal(school('EDUCATION\nSpringfield College\n\nEXPERIENCE\nSummer camp counsellor at Stanford University'), null);
  assert.equal(school('教育背景\n北京大学附属中学\n\n技能\nSQL'), null);
  assert.equal(school('EDUCATION\nSome College\n\nPROJECTS\nReleased under the MIT license'), null);
});

// ---- Protected attributes -------------------------------------------------

const types = (text) => findProtectedSpans(normalizeText(text)).map((s) => s.type).sort();

test('protected: English header fields are found and masked', () => {
  const text = normalizeText('Avery Example\nMale | Age: 24 | Date of Birth: March 3, 2001\n\nSKILLS\nPython');
  const spans = findProtectedSpans(text);
  assert.deepEqual(spans.map((s) => s.type).sort(), ['age', 'birth', 'gender', 'name']);
  const red = redact(text, spans);
  assert.equal(red.length, text.length);
  for (const leak of ['Avery', 'Male', '24', '2001']) assert.equal(red.includes(leak), false, leak);
  assert.ok(red.includes('Python'));
  assert.ok(red.includes(MASK));
});

test('protected: Chinese labelled fields sharing one line', () => {
  const text = normalizeText('个人简历\n姓名：林晓雨 性别：女 年龄：23岁\n出生年月：2002年3月  民族：汉族\n电话：138-0000-0000');
  const red = redact(text, findProtectedSpans(text));
  for (const leak of ['林晓雨', '女', '23', '2002', '汉族']) assert.equal(red.includes(leak), false, leak);
  assert.ok(red.includes('138-0000-0000'), 'phone number is not a protected attribute and stays');
});

test('protected: unlabelled Chinese header tokens', () => {
  assert.deepEqual(types('林晓雨 | 女 | 23岁 | 杭州\n\n教育背景\n浙江大学'), ['age', 'gender', 'name']);
});

test('protected: labels inside other phrases are left alone', () => {
  assert.deepEqual(types('RESUME\n\nEDUCATION\nSchool name: Example University\nLanguage: English'), []);
});

test('KNOWN LIMIT: ambiguous or spelled-out years are left unknown', { todo: true }, () => {
  assert.equal(grad('Sep 21 - Jun 25').year, 2025); // could be days of the month
  assert.equal(grad('二〇二五年毕业', '教育背景').year, 2025); // Chinese numerals
});

test('protected: a sidebar before the name (two-column layout) does not hide the name', () => {
  const text = normalizeText('SKILLS\nPython, SQL, PyTorch, Git,\nJavaScript\nAvery Example\nMale | Age: 24 | avery.example@example.com | +1 555-0100\nEDUCATION\nExample University');
  const red = redact(text, findProtectedSpans(text));
  for (const leak of ['Avery', 'Male', '24', 'avery.example']) assert.equal(red.includes(leak), false, leak);
  assert.ok(red.includes('Python, SQL, PyTorch'));
  assert.ok(red.includes('555-0100'));
});

test('protected: email addresses are masked, since they usually contain the name', () => {
  assert.deepEqual(types('个人简历\n邮箱:linxiaoyu@example.com 电话:138-0000-0000\n\n教育背景\n浙江大学'), ['email']);
});

test('protected: an ordinary capitalised line far from contact details is not taken as a name', () => {
  assert.deepEqual(types('RESUME\n\nSKILLS\nPython\n\nPROJECTS\nNorthwind Dashboard\nBuilt in Python'), []);
});
