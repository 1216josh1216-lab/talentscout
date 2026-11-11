// Held-out identity formats. These were written AFTER the masking fixes that
// the first ablation run prompted, were run once, and the detector was not
// changed afterwards. They estimate how masking does on formats it was not
// tuned for. `hidden` lists what must not be visible to the rules.
const body = '\n\nEDUCATION\nLakeside State University\nB.S. in Statistics, 2021 - 2025\n\nSKILLS\nPython, SQL, Excel\n';
const zhBody = '\n\n教育背景\n2021.09 - 2025.06    示例理工学院    统计学    本科\n\n专业技能\n熟练掌握 Python、SQL、Excel\n';

export const HELD_OUT = [
  { id: 'h01', note: 'name in capitals', text: 'MORGAN ELLIS\nmorgan@example.com' + body, hidden: [['name', 'MORGAN ELLIS']] },
  { id: 'h02', note: 'family name first with comma', text: 'Ellis, Morgan\n+1 555-0199' + body, hidden: [['name', 'Ellis'], ['name', 'Morgan']] },
  { id: 'h03', note: 'title line containing the name', text: 'Resume of Morgan Ellis\nmorgan@example.com' + body, hidden: [['name', 'Morgan Ellis']] },
  { id: 'h04', note: 'middle initial, age and gender inline', text: 'Morgan J. Ellis, 24, female\nmorgan@example.com' + body, hidden: [['name', 'Morgan J. Ellis'], ['age', ', 24,'], ['gender', 'female']] },
  { id: 'h05', note: 'numeric date of birth with DOB label, no colon', text: 'Morgan Ellis\nDOB 03/05/2001 | morgan@example.com' + body, hidden: [['name', 'Morgan Ellis'], ['birth', '03/05/2001']] },
  { id: 'h06', note: 'gendered pronoun in a summary sentence', text: 'Morgan Ellis\nmorgan@example.com\n\nSUMMARY\nShe is a final-year student who enjoys data work.' + body, hidden: [['name', 'Morgan Ellis'], ['gender', 'She is']] },
  { id: 'h07', note: 'name only in the footer', text: 'Curriculum Vitae\nmorgan@example.com' + body + '\nReferences available on request from Morgan Ellis.\n', hidden: [['name', 'Morgan Ellis']] },
  { id: 'h08', note: '应聘人 label', text: '应聘人：周雨桐\n联系电话：138-0000-0099' + zhBody, hidden: [['name', '周雨桐']] },
  { id: 'h09', note: 'gender and birth year in brackets after the name', text: '周雨桐（女，2002年生）\n138-0000-0099' + zhBody, hidden: [['name', '周雨桐'], ['gender', '女，'], ['birth', '2002年生']] },
  { id: 'h10', note: 'name inside a title phrase', text: '周雨桐的个人简历\n138-0000-0099' + zhBody, hidden: [['name', '周雨桐']] },
  { id: 'h11', note: 'table-style fields without colons', text: '个人简历\n姓名 周雨桐 性别 女 年龄 24\n电话 138-0000-0099' + zhBody, hidden: [['name', '周雨桐'], ['gender', '性别 女'], ['age', '年龄 24']] },
  { id: 'h12', note: '生日 label and 周岁', text: '周雨桐\n生日：2002.5.12 | 24周岁 | 138-0000-0099' + zhBody, hidden: [['name', '周雨桐'], ['birth', '2002.5.12'], ['age', '24周岁']] },
];
