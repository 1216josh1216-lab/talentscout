// Section detection: finds resume headings in English and Chinese.
import { splitLines } from './text.js';

const HEADINGS = {
  education: [
    'education', 'academic background', 'educational background', 'education background',
    'education and training', 'academics',
    '教育背景', '教育经历', '教育', '学历', '学历背景', '教育信息',
  ],
  experience: [
    'experience', 'work experience', 'professional experience', 'employment', 'employment history',
    'work history', 'internship', 'internships', 'internship experience', 'research experience',
    '工作经历', '工作经验', '实习经历', '实习经验', '实践经历', '科研经历', '校园经历', '社会实践',
  ],
  projects: ['projects', 'project experience', 'selected projects', '项目经历', '项目经验', '项目'],
  skills: [
    'skills', 'technical skills', 'core skills', 'skills and tools',
    '技能', '专业技能', '个人技能', '技能证书', '技能特长', '掌握技能',
  ],
  // Sections that hold who the person is, not what they can do.
  identity: [
    'personal information', 'personal details', 'personal data', 'contact', 'contact information', 'contact details',
    '个人信息', '基本信息', '基本资料', '个人资料', '联系方式',
  ],
  other: [
    'summary', 'profile', 'objective', 'about me', 'awards', 'honors', 'honors and awards',
    'certifications', 'certificates', 'publications', 'languages', 'interests', 'activities',
    'references',
    '自我评价', '个人评价', '求职意向', '获奖情况', '荣誉奖项',
    '所获荣誉', '证书', '个人简介', '兴趣爱好', '语言能力',
  ],
};

const LOOKUP = new Map();
for (const [type, names] of Object.entries(HEADINGS)) for (const n of names) LOOKUP.set(n, type);

// Words that suggest a line talks about education, used when a resume has no
// education heading at all.
const EDU_CUE =
  /(?<![a-z])(?:university|college|institute of|school of|bachelor|master|ph\.?d|b\.?sc?\.?|m\.?sc?\.?|mba|undergraduate)(?![a-z])|大学|学院|本科|硕士|博士|学士|研究生/i;

export function headingType(line) {
  const raw = line.trim();
  if (!raw || raw.length > 40) return null;
  const clean = raw
    .replace(/^[一二三四五六七八九十]+[、.]\s*/u, '')
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (!clean) return null;
  const cjk = clean.replace(/[^㐀-鿿]/g, '');
  const latin = clean.replace(/[㐀-鿿]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  // "教育背景 Education" style bilingual headings: either half may match, but
  // only when the whole line is made of those halves.
  if (LOOKUP.has(clean)) return LOOKUP.get(clean);
  const cjkOk = !cjk || LOOKUP.has(cjk);
  const latinOk = !latin || LOOKUP.has(latin);
  if (cjkOk && latinOk) return LOOKUP.get(cjk) ?? LOOKUP.get(latin) ?? null;
  return null;
}

/**
 * @returns {{sections: Array, educationRanges: Array<{start:number,end:number}>, lines: Array}}
 * educationRanges are the only places where school and graduation rules look.
 */
export function detectSections(text) {
  const lines = splitLines(text);
  const sections = [];
  let current = { type: 'header', title: '', start: 0, end: text.length };
  for (const l of lines) {
    const type = headingType(l.text);
    if (type) {
      current.end = l.start;
      sections.push(current);
      current = { type, title: l.text.trim(), start: l.start, end: text.length };
    }
  }
  sections.push(current);

  const educationRanges = sections
    .filter((s) => s.type === 'education')
    .map((s) => ({ start: s.start, end: s.end }));

  // Cue lines: always in the header block; everywhere if no education heading.
  const hasEdu = educationRanges.length > 0;
  const header = sections[0];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const inHeader = l.start >= header.start && l.end <= header.end;
    if (!(inHeader || !hasEdu)) continue;
    if (!EDU_CUE.test(l.text)) continue;
    const next = lines[i + 1];
    // Without headings, dates often sit on the line after the school name.
    // Take that line only if the school line itself carries no year, so an
    // unrelated following line (a job, say) is not read as education.
    const hasYear = /(?:19|20)\d{2}/.test(l.text);
    const end = !hasEdu && !hasYear && next && !headingType(next.text) ? next.end : l.end;
    educationRanges.push({ start: l.start, end });
  }
  return { sections, educationRanges, lines };
}
