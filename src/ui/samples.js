// Built-in demo resumes. Entirely synthetic: invented people, invented
// companies, placeholder contact details. Each one shows a different behaviour.

export const SAMPLES = [
  {
    name: 'sample_01_en.txt',
    text: `Avery Example
Male | Age: 24 | avery@example.com | +1 555-0100

EDUCATION
Massachusetts Institute of Technology — B.S. in Computer Science
Sep 2021 – Jun 2025 | GPA 3.8/4.0

EXPERIENCE
Data Science Intern, Northwind Analytics (fictional)    Jun 2024 – Aug 2024
- Built churn models in Python with scikit-learn.
- Wrote SQL pipelines for weekly reporting.

PROJECTS
Machine learning for text classification (PyTorch).

SKILLS
Python, SQL, PyTorch, Git, JavaScript`,
  },
  {
    name: 'sample_02_zh.txt',
    text: `个人简历
姓名：林晓雨    性别：女    年龄：23岁
出生年月：2002年3月    民族：汉族
电话：138-0000-0000    邮箱：lin@example.com

教育背景
2021.09 - 2025.06    浙江大学    计算机科学与技术    本科
主修课程：数据结构、机器学习、数据库系统

实习经历
2024.07 - 2024.09    星河数据科技有限公司（虚构）    数据分析实习生
- 使用 Python 和 SQL 搭建用户留存分析报表

专业技能
熟练掌握 Python、SQL、Docker；了解 PyTorch`,
  },
  {
    name: 'sample_03_en_missing_must_have.txt',
    text: `Jordan Placeholder
Female | jordan@example.com

EDUCATION
Stanford University, M.S. Statistics
Class of 2025

EXPERIENCE
Research Assistant, Example Lab (fictional)
- Statistical modelling in R and Python; published internal reports.
- Machine learning coursework with PyTorch.

SKILLS
Python, R, PyTorch, Docker, Tableau`,
  },
  {
    name: 'sample_04_en_negated.txt',
    text: `Sam Sample
sam@example.com

EDUCATION
University of Michigan, B.A. Economics, 2022 - 2026

EXPERIENCE
Operations Intern, Contoso Logistics (fictional)
- Maintained Excel dashboards for the regional team.

SKILLS
Excel, PowerPoint. No experience with Python or SQL yet, but eager to learn.`,
  },
  {
    name: 'sample_05_zh_outside_window.txt',
    text: `王建国 | 男 | 35岁 | 上海

教育经历
2008年9月 - 2012年6月  复旦大学  软件工程  本科

工作经历
2012.07 - 至今  远山软件有限公司（虚构）  高级数据工程师
- 负责数据仓库建设，使用 Python、SQL、Java
- 推动服务容器化，引入 Docker

专业技能
Python、SQL、Java、Docker、机器学习`,
  },
  {
    name: 'sample_06_en_in_progress.txt',
    text: `Riley Demo
riley@example.com

EDUCATION
University of Toronto, B.Sc. Data Science
2023 - Present

PROJECTS
- Sales forecasting in Python and PostgreSQL
- Container deployment with Docker

SKILLS
Python, PostgreSQL, Docker`,
  },
  {
    name: 'sample_07_zh_unlisted_school.txt',
    text: `个人简历
姓名：陈思远  性别：男  出生年月：2003年8月

教育背景
示例理工学院  数据科学与大数据技术  本科  2026届

项目经历
- 基于 Python 的电商评论情感分析，使用 PyTorch 训练模型
- 使用 MySQL 设计课程管理系统数据库

专业技能
Python、MySQL、PyTorch、机器学习`,
  },
  {
    name: 'sample_08_en_keyword_stuffing.txt',
    text: `Casey Specimen
casey@example.com

EDUCATION
Springfield Community College, A.S. General Studies, 2019 - 2021

SKILLS
Python Python Python Python Python SQL SQL SQL SQL SQL
Machine Learning Machine Learning Machine Learning PyTorch PyTorch PyTorch
Java Java Java Docker Docker Docker Python SQL Python SQL Python SQL`,
  },
];
