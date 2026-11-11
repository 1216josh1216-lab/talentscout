// The 50 hidden profiles behind the synthetic dataset.
//
// Ground truth comes from these profiles, never from the scoring engine:
//   qualified = really has Python AND really has SQL AND graduates 2025-2026.
//
// `py` / `sql` say how the resume TALKS about the skill:
//   plain, skills_only     has it, says so
//   alias_mysql, alias_pg  has SQL, names a SQL database instead
//   affirm_near_neg        has it; sentence also contains a negation word
//   leadin                 has it; only mention follows "Without supervision,"
//   implied                has it; resume names only libraries (pandas, NumPy)
//   negated                does NOT have it; resume says so
//   nosql                  does NOT have SQL; resume mentions NoSQL only
//   planned                does NOT have it; resume lists it as a learning goal
//   hobby                  does NOT have it; "Monty Python" in interests
//   none                   does NOT have it; never mentioned
// The hard cases were chosen and written down before the engine was run on
// this dataset, and include cases the engine was already known to get wrong.

export const HAS = new Set(['plain', 'skills_only', 'alias_mysql', 'alias_pg', 'affirm_near_neg', 'leadin', 'implied']);
export const WINDOW = { from: 2025, to: 2026 };

const S = {
  mit: ['Massachusetts Institute of Technology', 'Massachusetts Institute of Technology'],
  stanford: ['Stanford University', 'Stanford University'],
  umich: ['University of Michigan', 'University of Michigan'],
  toronto: ['University of Toronto', 'University of Toronto'],
  nus: ['National University of Singapore', 'National University of Singapore'],
  lakeside: ['Lakeside State University', null], // invented
  springfield: ['Springfield Community College', null], // invented
  thu: ['清华大学', 'Tsinghua University'],
  pku: ['北京大学', 'Peking University'],
  zju: ['浙江大学', 'Zhejiang University'],
  fudan: ['复旦大学', 'Fudan University'],
  shili: ['示例理工学院', null], // invented
  donghu: ['东湖科技大学', null], // invented
  nanshan: ['南山职业技术学院', null], // invented
};

// [lang, format, header style, layout, py, sql, school, grad year, grad format, decoy 2025/26 dates, category]
const ROWS = [
  // A. Clear positives
  ['en', 'txt', 0, 'standard', 'plain', 'plain', 'mit', 2025, 'range_mon', 0, 'clear_positive'],
  ['en', 'pdf', 1, 'standard', 'plain', 'alias_pg', 'stanford', 2026, 'class_of', 0, 'clear_positive'],
  ['en', 'docx', 2, 'standard', 'plain', 'plain', 'umich', 2026, 'expected', 0, 'clear_positive'],
  ['en', 'txt', 4, 'standard', 'skills_only', 'alias_mysql', 'lakeside', 2025, 'range_year', 0, 'clear_positive'],
  ['en', 'pdf', 0, 'standard', 'plain', 'plain', 'toronto', 2025, 'graduated', 0, 'clear_positive'],
  ['en', 'docx', 1, 'standard', 'plain', 'plain', 'nus', 2026, 'lone', 0, 'clear_positive'],
  ['zh', 'txt', 0, 'standard', 'plain', 'plain', 'zju', 2025, 'dot', 0, 'clear_positive'],
  ['zh', 'pdf', 1, 'standard', 'plain', 'alias_mysql', 'thu', 2026, 'jie', 0, 'clear_positive'],
  ['zh', 'docx', 2, 'standard', 'plain', 'plain', 'fudan', 2025, 'nianyue', 0, 'clear_positive'],
  ['zh', 'txt', 4, 'standard', 'skills_only', 'plain', 'shili', 2026, 'biye', 0, 'clear_positive'],
  ['zh', 'pdf', 0, 'standard', 'plain', 'plain', 'pku', 2025, 'zhi', 0, 'clear_positive'],
  ['zh', 'docx', 5, 'standard', 'plain', 'alias_pg', 'donghu', 2026, 'slash', 0, 'clear_positive'],
  // B. Missing a required skill
  ['en', 'txt', 2, 'standard', 'none', 'plain', 'umich', 2025, 'range_mon', 0, 'missing_skill'],
  ['en', 'docx', 0, 'standard', 'plain', 'none', 'stanford', 2026, 'class_of', 0, 'missing_skill'],
  ['en', 'pdf', 1, 'standard', 'none', 'none', 'springfield', 2025, 'range_year', 0, 'missing_skill'],
  ['en', 'txt', 5, 'standard', 'none', 'alias_mysql', 'lakeside', 2026, 'expected', 0, 'missing_skill'],
  ['zh', 'txt', 1, 'standard', 'plain', 'none', 'zju', 2025, 'dot', 0, 'missing_skill'],
  ['zh', 'docx', 0, 'standard', 'none', 'plain', 'fudan', 2026, 'jie', 0, 'missing_skill'],
  ['zh', 'pdf', 2, 'standard', 'none', 'none', 'nanshan', 2025, 'nianyue', 0, 'missing_skill'],
  ['zh', 'txt', 3, 'standard', 'plain', 'none', 'pku', 2026, 'biye', 0, 'missing_skill'],
  // C. Has the skills, graduates outside the window
  ['en', 'txt', 0, 'standard', 'plain', 'plain', 'mit', 2019, 'range_mon', 1, 'outside_window'],
  ['en', 'pdf', 3, 'standard', 'plain', 'plain', 'toronto', 2022, 'graduated', 1, 'outside_window'],
  ['en', 'docx', 1, 'standard', 'plain', 'alias_pg', 'springfield', 2028, 'expected', 0, 'outside_window'],
  ['zh', 'txt', 1, 'standard', 'plain', 'plain', 'fudan', 2012, 'nianyue', 1, 'outside_window'],
  ['zh', 'pdf', 0, 'standard', 'plain', 'plain', 'thu', 2023, 'jie', 0, 'outside_window'],
  ['zh', 'docx', 2, 'standard', 'plain', 'alias_mysql', 'shili', 2021, 'dot', 1, 'outside_window'],
  ['en', 'txt', 4, 'standard', 'plain', 'plain', 'umich', 2024, 'class_of', 0, 'outside_window'],
  // D. Negation
  ['en', 'txt', 0, 'standard', 'negated', 'negated', 'umich', 2026, 'range_year', 0, 'negation'],
  ['en', 'docx', 1, 'standard', 'plain', 'negated', 'stanford', 2025, 'class_of', 0, 'negation'],
  ['en', 'txt', 2, 'standard', 'affirm_near_neg', 'plain', 'lakeside', 2025, 'range_mon', 0, 'negation'],
  ['en', 'pdf', 0, 'standard', 'leadin', 'plain', 'toronto', 2026, 'expected', 0, 'negation'],
  ['zh', 'txt', 0, 'standard', 'negated', 'plain', 'zju', 2025, 'dot', 0, 'negation'],
  ['zh', 'docx', 1, 'standard', 'plain', 'negated', 'pku', 2026, 'jie', 0, 'negation'],
  // E. Look-alike words
  ['en', 'txt', 1, 'standard', 'plain', 'nosql', 'mit', 2025, 'range_mon', 0, 'lookalike'],
  ['zh', 'pdf', 2, 'standard', 'plain', 'nosql', 'thu', 2026, 'nianyue', 0, 'lookalike'],
  ['en', 'docx', 0, 'standard', 'hobby', 'plain', 'springfield', 2025, 'range_year', 0, 'lookalike'],
  // F. Hard date formats
  ['en', 'txt', 0, 'standard', 'plain', 'plain', 'stanford', 2025, 'two_digit', 0, 'date_format'],
  ['zh', 'txt', 0, 'standard', 'plain', 'plain', 'fudan', 2025, 'two_digit', 0, 'date_format'],
  ['en', 'pdf', 1, 'standard', 'plain', 'alias_mysql', 'lakeside', 2026, 'abbr', 0, 'date_format'],
  ['en', 'docx', 2, 'standard', 'plain', 'plain', 'toronto', 2026, 'present', 0, 'date_format'],
  ['zh', 'txt', 1, 'standard', 'plain', 'plain', 'zju', 2025, 'numeral', 0, 'date_format'],
  ['en', 'txt', 4, 'standard', 'plain', 'plain', 'umich', 2025, 'mon_ambig', 0, 'date_format'],
  // G. Skill implied or only planned
  ['en', 'txt', 0, 'standard', 'implied', 'plain', 'mit', 2025, 'range_mon', 0, 'implied_or_planned'],
  ['zh', 'docx', 0, 'standard', 'implied', 'plain', 'pku', 2026, 'dot', 0, 'implied_or_planned'],
  ['en', 'pdf', 1, 'standard', 'plain', 'planned', 'stanford', 2026, 'class_of', 0, 'implied_or_planned'],
  ['zh', 'txt', 2, 'standard', 'planned', 'plain', 'shili', 2025, 'jie', 0, 'implied_or_planned'],
  // H. Unusual layout
  ['en', 'txt', 0, 'noheadings', 'plain', 'plain', 'stanford', 2025, 'range_year', 0, 'layout'],
  ['zh', 'txt', 1, 'noheadings', 'plain', 'plain', 'thu', 2026, 'dot', 0, 'layout'],
  ['en', 'pdf', 0, 'sidebar', 'plain', 'plain', 'mit', 2026, 'range_mon', 0, 'layout'],
  ['zh', 'docx', 3, 'standard', 'plain', 'plain', 'zju', 2026, 'jie', 0, 'layout'],
];

export const PROFILES = ROWS.map(([lang, format, header, layout, py, sql, school, gradYear, gradFormat, decoy, category], i) => ({
  id: `r${String(i + 1).padStart(2, '0')}`,
  index: i,
  lang,
  format,
  header,
  layout,
  py,
  sql,
  school: S[school][0],
  schoolCanonical: S[school][1],
  gradYear,
  gradFormat,
  decoy: !!decoy,
  category,
  truth: {
    hasPython: HAS.has(py),
    hasSql: HAS.has(sql),
    inWindow: gradYear >= WINDOW.from && gradYear <= WINDOW.to,
    qualified: HAS.has(py) && HAS.has(sql) && gradYear >= WINDOW.from && gradYear <= WINDOW.to,
  },
}));
