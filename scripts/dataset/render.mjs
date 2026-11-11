// Turns a hidden profile into resume text. Everything is invented: names are
// random pairings from small pools, companies are fictional, contact details
// use reserved example domains and placeholder numbers.

function rng(seed) {
  let a = (seed + 1) * 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

const EN_GIVEN = ['Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Quinn', 'Rowan', 'Sasha', 'Devon', 'Harper', 'Emerson'];
const EN_FAMILY = ['Bennett', 'Carter', 'Hayes', 'Brooks', 'Ellis', 'Foster', 'Reyes', 'Novak', 'Okafor', 'Tanaka', 'Patel', 'Larsen'];
const ZH_FAMILY = ['林', '陈', '王', '李', '张', '刘', '赵', '周', '吴', '徐', '欧阳'];
const ZH_GIVEN = ['晓雨', '思远', '建国', '欣怡', '子涵', '浩然', '雨桐', '明轩', '婉清', '志强', '伟', '静'];
const ZH_PINYIN = ['xiaoyu', 'siyuan', 'jianguo', 'xinyi', 'zihan', 'haoran', 'yutong', 'mingxuan', 'wanqing', 'zhiqiang', 'wei', 'jing'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_COMPANY = ['Northwind Analytics', 'Contoso Logistics', 'Fabrikam Retail', 'Tailspin Labs', 'Wingtip Media'];
const ZH_COMPANY = ['星河数据科技有限公司', '远山软件有限公司', '青橙信息技术有限公司', '云帆网络科技有限公司'];
const EN_MAJOR = ['Statistics', 'Computer Science', 'Economics', 'Information Systems', 'Applied Mathematics'];
const ZH_MAJOR = ['统计学', '计算机科学与技术', '经济学', '信息管理与信息系统', '应用数学'];
const ZH_CITY = ['杭州', '上海', '北京', '成都', '武汉'];
const EN_EXTRA = ['Excel', 'Tableau', 'R', 'Git', 'PowerPoint', 'Docker', 'PyTorch', 'JavaScript'];
const ZH_EXTRA = ['Excel', 'Tableau', 'R', 'Git', 'PPT', 'Docker', 'PyTorch', 'JavaScript'];

const yy = (y) => String(y % 100).padStart(2, '0');
const cnYear = (y) => String(y).split('').map((d) => '〇一二三四五六七八九'[d]).join('');

/** Default identity for a profile; the ablation overrides parts of it. */
export function identityFor(p) {
  const r = rng(p.index * 7 + 3);
  const age = 21 + Math.floor(r() * 20);
  const gi = Math.floor(r() * 12);
  return {
    given: p.lang === 'en' ? EN_GIVEN[gi] : ZH_GIVEN[gi],
    family: p.lang === 'en' ? pick(r, EN_FAMILY) : pick(r, ZH_FAMILY),
    handle: p.lang === 'en' ? null : ZH_PINYIN[gi],
    gender: r() < 0.5 ? 'M' : 'F',
    age,
    birth: { y: 2026 - age, m: 1 + Math.floor(r() * 12), d: 1 + Math.floor(r() * 28) },
    photo: p.index % 6 === 0,
  };
}

function gradLineEn(p) {
  const y = p.gradYear;
  switch (p.gradFormat) {
    case 'range_mon': return `Sep ${y - 4} – Jun ${y}`;
    case 'range_year': return `${y - 4} - ${y}`;
    case 'class_of': return `Class of ${y}`;
    case 'expected': return `Expected graduation: May ${y}`;
    case 'graduated': return `Graduated ${y}`;
    case 'lone': return `${y}`;
    case 'two_digit': return `09/${yy(y - 4)} - 06/${yy(y)}`;
    case 'abbr': return `${y - 4}-${yy(y)}`;
    case 'present': return `${y - 3} - Present`;
    case 'mon_ambig': return `Sep ${yy(y - 4)} - Jun ${yy(y)}`;
    default: throw new Error(`unknown EN grad format ${p.gradFormat}`);
  }
}

function gradZh(p) {
  const y = p.gradYear;
  switch (p.gradFormat) {
    case 'dot': return { before: `${y - 4}.09 - ${y}.06` };
    case 'nianyue': return { before: `${y - 4}年9月 - ${y}年6月` };
    case 'zhi': return { before: `${y - 4}年9月至${y}年6月` };
    case 'slash': return { before: `${y - 4}/09～${y}/06` };
    case 'two_digit': return { before: `${yy(y - 4)}.09 - ${yy(y)}.06` };
    case 'present': return { before: `${y - 3}.09 - 至今` };
    case 'jie': return { after: `${y}届` };
    case 'biye': return { after: `${y}年6月毕业` };
    case 'numeral': return { after: `${cnYear(y)}届` };
    default: throw new Error(`unknown ZH grad format ${p.gradFormat}`);
  }
}

// ---- English ---------------------------------------------------------------

function renderEn(p, id, r) {
  const name = `${id.given} ${id.family}`;
  const G = id.gender === 'M' ? 'Male' : 'Female';
  const email = `${id.given}.${id.family}`.toLowerCase() + '@example.com';
  const phone = `+1 555-01${String(10 + p.index).padStart(2, '0')}`;
  const prot = [{ type: 'name', snippet: name }, { type: 'name', snippet: email.split('@')[0] }];
  const head = [];
  const tail = [];
  switch (p.header) {
    case 0:
      head.push(name, `${G} | Age: ${id.age} | ${email} | ${phone}`);
      prot.push({ type: 'gender', snippet: `${G} |` }, { type: 'age', snippet: `Age: ${id.age}` });
      break;
    case 1: {
      const dob = `${MONTHS[id.birth.m - 1]} ${id.birth.d}, ${id.birth.y}`;
      head.push(name, `${email} | ${phone}`, `Date of Birth: ${dob}`);
      prot.push({ type: 'birth', snippet: dob });
      break;
    }
    case 2:
      head.push('Curriculum Vitae', `Name: ${name}`, `Gender: ${G}`, `Age: ${id.age}`, `Email: ${email}`);
      prot.push({ type: 'gender', snippet: `Gender: ${G}` }, { type: 'age', snippet: `Age: ${id.age}` });
      break;
    case 3: {
      const title = id.gender === 'M' ? 'Mr.' : 'Ms.';
      const pron = id.gender === 'M' ? 'he/him' : 'she/her';
      head.push(`${title} ${name} (${pron})`, `${email} | ${phone}`);
      prot.push({ type: 'gender', snippet: `${title} ` }, { type: 'gender', snippet: pron });
      break;
    }
    case 4: {
      const g = G.toLowerCase();
      head.push(name, `${email} | ${phone}`, '', 'SUMMARY', `A ${id.age}-year-old ${g} graduate with a strong interest in data.`);
      prot.push({ type: 'age', snippet: `${id.age}-year-old` }, { type: 'gender', snippet: `${g} graduate` });
      break;
    }
    case 5:
      head.push(name, `${email} | ${phone}`);
      tail.push('', 'Sincerely,', name);
      break;
    default: throw new Error('unknown EN header');
  }
  if (id.photo) {
    const file = `${id.given.toLowerCase()}_portrait.jpg`;
    head.push(`Photo: ${file}`);
    prot.push({ type: 'photo', snippet: file });
  }

  const major = pick(r, EN_MAJOR);
  const company = pick(r, EN_COMPANY);
  const y = p.gradYear;
  const internYear = Math.min(y - 1, 2025);
  const skills = [];
  const bullets = [];
  const notes = [];
  const interests = [];

  if (p.py === 'plain') { skills.push('Python'); bullets.push('- Automated the weekly sales report with Python.'); }
  if (p.py === 'skills_only') skills.push('Python');
  if (p.py === 'affirm_near_neg') notes.push('No formal training, but used Python daily for coursework.');
  if (p.py === 'leadin') bullets.push('- Without supervision, built Python scripts that cleaned the survey data.');
  if (p.py === 'implied') skills.push('pandas', 'NumPy', 'Jupyter');
  if (p.py === 'planned') notes.push('Learning goals for this year: Python');
  if (p.py === 'hobby') interests.push('Monty Python films', 'hiking');
  if (p.sql === 'plain') { skills.push('SQL'); bullets.push('- Wrote SQL queries against the orders database.'); }
  if (p.sql === 'alias_mysql') { skills.push('MySQL'); bullets.push('- Maintained a MySQL database of customer feedback.'); }
  if (p.sql === 'alias_pg') { skills.push('PostgreSQL'); bullets.push('- Loaded survey results into PostgreSQL.'); }
  if (p.sql === 'nosql') { skills.push('NoSQL (MongoDB)'); bullets.push('- Stored event logs in MongoDB.'); }
  if (p.sql === 'planned') notes.push('Learning goals for this year: SQL');
  if (p.py === 'negated' && p.sql === 'negated') notes.push('No experience with Python or SQL yet, but eager to learn.');
  else if (p.py === 'negated') notes.push('No experience with Python yet.');
  else if (p.sql === 'negated') notes.push('I have not used SQL in a real project.');
  if (!bullets.length) bullets.push('- Prepared slide decks for the regional team.');
  bullets.push(pick(r, ['- Presented findings to a team of five.', '- Documented the process for new joiners.', '- Reduced manual steps in a monthly report.']));
  const extra = EN_EXTRA.filter(() => r() < 0.35);
  skills.push(...extra, 'Excel');

  const degree = `B.S. in ${major}`;
  const gl = gradLineEn(p);
  const eduLine = { range_mon: `${degree} | ${gl}`, range_year: `${degree}, ${gl}`, class_of: `${degree}, ${gl}`, expected: `${degree}. ${gl}`, graduated: `${degree}. ${gl}`, lone: `${degree}, ${gl}`, two_digit: `${degree} | ${gl}`, abbr: `${degree}, ${gl}`, present: `${degree}, ${gl}`, mon_ambig: `${degree} | ${gl}` }[p.gradFormat];

  const experienced = y <= 2022;
  const expHead = experienced
    ? `Data Analyst, ${company} (fictional)    Jul ${y} – Present`
    : `Analyst Intern, ${company} (fictional)    Jun ${internYear} – Aug ${internYear}`;
  if (p.decoy) bullets.push('- Completed the internal analytics course in 2025 and the advanced course in 2026.');

  const skillsBlock = ['SKILLS', [...new Set(skills)].join(', '), ...notes];
  const edu = ['EDUCATION', p.school, eduLine];
  const exp = ['EXPERIENCE', expHead, ...bullets];
  const hobby = interests.length ? ['', 'INTERESTS', interests.join(', ')] : [];

  let lines;
  if (p.layout === 'noheadings') {
    lines = [...head, `${degree}, ${p.school}, ${gl}`, `Skilled in ${[...new Set(skills)].join(', ')}; built dashboards for a student society.`, `Intern at ${company} (fictional), summer ${internYear}.`];
  } else if (p.layout === 'sidebar') {
    lines = [...skillsBlock, ...head, ...edu, ...exp];
  } else {
    lines = [...head, '', ...edu, '', ...exp, '', ...skillsBlock, ...hobby, ...tail];
  }
  return { lines, protectedSnippets: prot };
}

// ---- Chinese ---------------------------------------------------------------

function renderZh(p, id, r) {
  const name = `${id.family}${id.given}`;
  const g = id.gender === 'M' ? '男' : '女';
  const email = `${id.handle ?? 'candidate'}${String(id.age)}@example.com`;
  const phone = `138-0000-00${String(10 + p.index).padStart(2, '0')}`;
  const city = pick(r, ZH_CITY);
  const prot = [{ type: 'name', snippet: name }, { type: 'name', snippet: email.split('@')[0] }];
  const head = [];
  switch (p.header) {
    case 0:
      head.push('个人简历', `姓名：${name}    性别：${g}    年龄：${id.age}岁`, `电话：${phone}    邮箱：${email}`);
      prot.push({ type: 'gender', snippet: `性别：${g}` }, { type: 'age', snippet: `${id.age}岁` });
      break;
    case 1:
      head.push(`${name} | ${g} | ${id.age}岁 | ${city}`, `${phone} | ${email}`);
      prot.push({ type: 'gender', snippet: `| ${g} |` }, { type: 'age', snippet: `${id.age}岁` });
      break;
    case 2: {
      const dob = `${id.birth.y}年${id.birth.m}月`;
      head.push('个人简历', `姓名：${name}`, `性别：${g}`, `出生年月：${dob}`, '民族：汉族', `联系电话：${phone}`, `电子邮箱：${email}`);
      prot.push({ type: 'gender', snippet: `性别：${g}` }, { type: 'birth', snippet: dob });
      break;
    }
    case 3: {
      const title = id.gender === 'M' ? '先生' : '女士';
      head.push(`${name} ${title}`, `${phone} ${email}`, '', '自我评价', `本人${g}，${id.age}岁，性格开朗，学习能力强。`);
      prot.push({ type: 'gender', snippet: title }, { type: 'gender', snippet: `本人${g}` }, { type: 'age', snippet: `${id.age}岁` });
      break;
    }
    case 4: {
      const spaced = [...name].join(' ');
      const dob = `${id.birth.y}-${String(id.birth.m).padStart(2, '0')}-${String(id.birth.d).padStart(2, '0')}`;
      head.push(spaced, `性别：${g} | 出生日期：${dob}`, `${phone} | ${email}`);
      prot[0] = { type: 'name', snippet: spaced };
      prot.push({ type: 'gender', snippet: `性别：${g}` }, { type: 'birth', snippet: dob });
      break;
    }
    case 5:
      head.push('个人简历', name, `${phone} | ${email}`);
      break;
    default: throw new Error('unknown ZH header');
  }
  if (id.photo) {
    head.push('照片：个人证件照.jpg');
    prot.push({ type: 'photo', snippet: '个人证件照.jpg' });
  }

  const major = pick(r, ZH_MAJOR);
  const company = pick(r, ZH_COMPANY);
  const y = p.gradYear;
  const internYear = Math.min(y - 1, 2025);
  const skills = [];
  const bullets = [];
  const notes = [];

  if (p.py === 'plain') { skills.push('Python'); bullets.push('- 使用 Python 清洗并分析销售数据'); }
  if (p.py === 'skills_only') skills.push('Python');
  if (p.py === 'implied') skills.push('pandas', 'NumPy', 'Jupyter');
  if (p.py === 'planned') notes.push('计划学习：Python');
  if (p.py === 'negated') notes.push('尚未学习 Python。');
  if (p.sql === 'plain') { skills.push('SQL'); bullets.push('- 编写 SQL 查询，支持周报与月报'); }
  if (p.sql === 'alias_mysql') { skills.push('MySQL'); bullets.push('- 维护 MySQL 用户反馈数据库'); }
  if (p.sql === 'alias_pg') { skills.push('PostgreSQL'); bullets.push('- 将问卷结果导入 PostgreSQL'); }
  if (p.sql === 'nosql') { skills.push('NoSQL（MongoDB）'); bullets.push('- 使用 MongoDB 存储日志'); }
  if (p.sql === 'planned') notes.push('计划学习：SQL');
  if (p.sql === 'negated') notes.push('未使用过 SQL。');
  if (!bullets.length) bullets.push('- 负责整理会议纪要与汇报材料');
  bullets.push(pick(r, ['- 向团队汇报分析结论', '- 编写操作文档，方便新人上手', '- 减少月报中的手工步骤']));
  skills.push(...ZH_EXTRA.filter(() => r() < 0.35), 'Excel');

  const gz = gradZh(p);
  const eduLine = gz.before ? `${gz.before}    ${p.school}    ${major}    本科` : `${p.school}    ${major}    本科    ${gz.after}`;
  const experienced = y <= 2022;
  const expHead = experienced ? `${y}.07 - 至今    ${company}（虚构）    数据分析师` : `${internYear}.07 - ${internYear}.09    ${company}（虚构）    数据分析实习生`;
  if (p.decoy) bullets.push('- 2025年完成公司内部数据分析课程，2026年完成进阶课程');

  const skillList = [...new Set(skills)].join('、');
  if (p.layout === 'noheadings') {
    const g2 = gz.before ?? gz.after;
    return { lines: [...head, `${p.school} ${major} 本科 ${g2}`, `熟练使用 ${skillList}，做过数据分析课程项目`, `曾在${company}（虚构）实习`], protectedSnippets: prot };
  }
  const lines = [...head, '', '教育背景', eduLine, '', experienced ? '工作经历' : '实习经历', expHead, ...bullets, '', '专业技能', `熟练掌握 ${skillList}`, ...notes];
  return { lines, protectedSnippets: prot };
}

/**
 * @param p profile from profiles.mjs
 * @param identity optional overrides of identityFor(p): given, family, handle, gender, age, birth, photo
 * @returns {{lines:string[], text:string, protectedSnippets:Array<{type,snippet}>, identity:object}}
 */
export function renderResume(p, identity = {}) {
  const id = { ...identityFor(p), ...identity };
  const r = rng(p.index * 13 + 5); // content randomness never depends on identity
  const out = p.lang === 'en' ? renderEn(p, id, r) : renderZh(p, id, r);
  return { ...out, text: out.lines.join('\n') + '\n', identity: id };
}

export const POOLS = { EN_GIVEN, EN_FAMILY, ZH_FAMILY, ZH_GIVEN, ZH_PINYIN };
