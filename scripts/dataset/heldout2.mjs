// Second held-out set. Written AFTER the identity-zone hardening, run once,
// detector not changed afterwards. It deliberately puts identity details in
// places the header rule does not cover: summaries, experience bullets,
// footers, URLs, and resumes with no headings and no contact line.
const edu = 'EDUCATION\nLakeside State University\nB.S. in Statistics, 2021 - 2025';
const zhEdu = '教育背景\n2021.09 - 2025.06    示例理工学院    统计学    本科';

export const HELD_OUT_2 = [
  { id: 'k01', note: 'no headings, no contact line', text: 'Morgan Ellis\nB.S. Statistics, Lakeside State University, 2021 - 2025\nPython, SQL, Excel\n', hidden: [['name', 'Morgan Ellis']] },
  { id: 'k02', note: 'sidebar first, identity under a "Contact" heading', text: `SKILLS\nPython, SQL\n\nContact\nMorgan Ellis\nFemale, 24\n\n${edu}\n`, hidden: [['name', 'Morgan Ellis'], ['gender', 'Female'], ['age', ', 24']] },
  { id: 'k03', note: '"Additional information" section at the bottom', text: `Morgan Ellis\nmorgan@example.com\n\n${edu}\n\nSKILLS\nPython, SQL\n\nADDITIONAL INFORMATION\nGender: Female. Age 24. Nationality: Canadian.\n`, hidden: [['gender', 'Female'], ['age', 'Age 24'], ['other', 'Canadian']] },
  { id: 'k04', note: 'third-person summary', text: `Morgan Ellis\nmorgan@example.com\n\nSUMMARY\nMorgan is a 24 year old woman who enjoys data work.\n\n${edu}\n\nSKILLS\nPython, SQL\n`, hidden: [['name', 'Morgan is'], ['age', '24 year old'], ['gender', 'woman']] },
  { id: 'k05', note: 'quoted reference inside an experience bullet', text: `Morgan Ellis\nmorgan@example.com\n\n${edu}\n\nEXPERIENCE\nAnalyst Intern, Northwind Analytics (fictional)\n- Supervisor's note: "Ms. Ellis exceeded expectations."\n\nSKILLS\nPython, SQL\n`, hidden: [['gender', 'Ms.'], ['name', 'Ellis exceeded']] },
  { id: 'k06', note: 'name inside a project URL', text: `Morgan Ellis\nmorgan@example.com\n\n${edu}\n\nPROJECTS\nSales dashboard: github.com/morgan-ellis/sales-dashboard\n\nSKILLS\nPython, SQL\n`, hidden: [['name', 'morgan-ellis']] },
  { id: 'k07', note: 'date of birth under a bare "PERSONAL" heading', text: `Morgan Ellis\nmorgan@example.com\n\n${edu}\n\nSKILLS\nPython, SQL\n\nPERSONAL\nDate of birth 3 May 2001\n`, hidden: [['birth', '3 May 2001']] },
  { id: 'k08', note: 'nickname in quotes', text: `Morgan "Mo" Ellis\nmorgan@example.com | +1 555-0199\n\n${edu}\n\nSKILLS\nPython, SQL\n`, hidden: [['name', 'Morgan'], ['name', 'Ellis']] },
  { id: 'k09', note: '其他信息 section at the bottom', text: `周雨桐\n138-0000-0099\n\n${zhEdu}\n\n专业技能\n熟练掌握 Python、SQL\n\n其他信息\n性别：女  年龄：24  婚姻状况：未婚\n`, hidden: [['gender', '性别：女'], ['age', '年龄：24'], ['other', '未婚']] },
  { id: 'k10', note: 'first-person summary with name, age and gender', text: `周雨桐\n138-0000-0099\n\n自我评价\n我是周雨桐，今年24岁，是一名女生，做事认真。\n\n${zhEdu}\n\n专业技能\n熟练掌握 Python、SQL\n`, hidden: [['name', '我是周雨桐'], ['age', '今年24岁'], ['gender', '女生']] },
  { id: 'k11', note: 'no headings, no contact line, identity on line 1', text: '周雨桐 女 2002年生\n示例理工学院 统计学 本科 2021.09 - 2025.06\n熟练掌握 Python、SQL\n', hidden: [['name', '周雨桐'], ['gender', ' 女 '], ['birth', '2002年生']] },
  { id: 'k12', note: 'name repeated in a project line', text: `周雨桐\n138-0000-0099\n\n${zhEdu}\n\n项目经历\n- 销售分析项目，项目负责人：周雨桐\n\n专业技能\n熟练掌握 Python、SQL\n`, hidden: [['name', '负责人：周雨桐']] },
];
