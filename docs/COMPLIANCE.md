# Compliance note: automated hiring tools in the EU, the US (New York City) and China

> **Not legal advice.** This note was written by the project author with AI
> assistance, as background for a portfolio project. It is not written or
> reviewed by a lawyer, it is not complete, and laws change. Anyone who wants
> to screen real applicants with this or any other tool should get advice from
> a qualified lawyer in each jurisdiction where they hire.

**Sources checked on 11 November 2026.** Each claim below is tagged:

- **[Verified]** — I opened the official text on the date above and read the provision cited.
- **[Verified, unofficial copy]** — I read the text, but from a copy not hosted by the issuing body.
- **[Not verified]** — I could not open a primary source, or did not check. Treat as a lead, not a fact.

Paragraphs headed **"What this may mean for TalentScout"** are my own reading,
not a legal conclusion.

## Summary

| | Main instruments | Does it clearly cover a hand-written rules tool like this one? |
|---|---|---|
| EU | AI Act; GDPR | GDPR: yes, whenever resumes of real people are processed. AI Act: unclear, and arguably not, because the definition of "AI system" is aimed at systems that infer rather than follow rules set by people. |
| US, federal | Title VII; Uniform Guidelines | Yes. Anti-discrimination law applies to any selection procedure, automated or not. |
| US, New York City | Local Law 144 of 2021 and DCWP rules | Arguably not, because the rules define the covered techniques as ones where a computer identifies the inputs or their weights. Not tested here. |
| China | PIPL; Employment Promotion Law; Women's Rights Law | Yes for personal-information and anti-discrimination duties. The algorithm-recommendation rules look aimed at online services, not at a local tool. |

Being outside a specific "AI" statute does not make a screening practice
lawful. School tiers and graduation-year windows can disadvantage protected
groups whoever, or whatever, applies them.

## 1. European Union

### 1.1 AI Act — Regulation (EU) 2024/1689

Source: [EUR-Lex, OJ L 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj).
I read the original 2024 text, not a consolidated version.

- **Recruitment tools are listed as high-risk. [Verified]** Annex III, point
  4(a): "AI systems intended to be used for the recruitment or selection of
  natural persons, in particular to place targeted job advertisements, to
  analyse and filter job applications, and to evaluate candidates".
- **What counts as an "AI system". [Verified]** Article 3(1) defines it as a
  machine-based system that "infers, from the input it receives, how to
  generate outputs such as predictions, content, recommendations, or
  decisions". Recital 12 says the definition "should not cover systems that
  are based on the rules defined solely by natural persons to automatically
  execute operations". Recitals guide interpretation; they are not operative
  provisions.
- **A narrow exemption exists, but not for profiling. [Verified]** Article
  6(3): an Annex III system is not high-risk where it does not pose a
  significant risk, for example where it "is intended to perform a narrow
  procedural task" or "a preparatory task to an assessment". But an Annex III
  system "shall always be considered to be high-risk where the AI system
  performs profiling of natural persons".
- **Duties on employers who deploy a high-risk system. [Verified]** Article
  26(7): employers "shall inform workers' representatives and the affected
  workers" before use at the workplace. Article 26(11): deployers that make or
  assist decisions about people "shall inform the natural persons that they
  are subject to the use of the high-risk AI system". Article 86: an affected
  person has "the right to obtain from the deployer clear and meaningful
  explanations of the role of the AI system in the decision-making procedure".
- **Timing changed in 2026. [Verified]** The original Article 113 applied the
  Regulation from 2 August 2026. [Regulation (EU) 2026/1744](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202601744)
  (the "Digital Omnibus on AI", OJ 24 July 2026) replaced Article 113 point (c):
  the high-risk rules in Chapter III, Sections 1–3 now apply from **2 December
  2027** for systems that are high-risk under Article 6(2) and Annex III.
  The [Commission's AI Act page](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
  says the amending regulation entered into force on 27 July 2026 and lists
  employment among the areas affected.
- **[Not verified]** Whether Regulation 2026/1744 changed any of the other
  provisions quoted above. I scanned its list of amendments and saw none to
  Annex III or Article 26, and its changes to Article 3 that I read concern
  other definitions, but I did not read the whole amending act.
- **[Not verified]** The Commission's guidelines on the definition of an AI
  system, and any guidance on classifying high-risk systems.

**What this may mean for TalentScout.** Every rule and weight is written by a
person; nothing is learned from data. On the Recital 12 wording that points
away from "AI system", but this is an argument, not a ruling, and a regulator
could look at how a deployer actually uses the tool. If a tool like this were
treated as an AI system, filtering job applications is squarely in Annex III.
The design choices that would matter then are already present: a per-candidate
explanation, a human making the decision, and no hidden logic.

### 1.2 GDPR — Regulation (EU) 2016/679

Source: [EUR-Lex, CELEX 32016R0679](https://eur-lex.europa.eu/eli/reg/2016/679/oj). Applies from 25 May 2018. **[Verified]**

- **Article 22(1). [Verified]** "The data subject shall have the right not to
  be subject to a decision based solely on automated processing, including
  profiling, which produces legal effects concerning him or her or similarly
  significantly affects him or her." Paragraph 2 lists exceptions (contract
  necessity, authorisation by law, explicit consent) and paragraph 3 requires
  safeguards, "at least the right to obtain human intervention ..., to express
  his or her point of view and to contest the decision".
- **Article 13(2)(f). [Verified]** Where Article 22 decisions are made, people
  must be given "meaningful information about the logic involved, as well as
  the significance and the envisaged consequences".
- **Article 35(3)(a). [Verified]** A data protection impact assessment is
  required for "a systematic and extensive evaluation of personal aspects ...
  based on automated processing, including profiling, and on which decisions
  are based that produce legal effects ... or similarly significantly affect"
  the person.
- **[Not verified]** Court of Justice case law on what counts as a "decision"
  under Article 22 (for example the SCHUFA judgment of December 2023), and
  guidance from data protection authorities on recruitment.

**What this may mean for TalentScout.** GDPR does not depend on the tool being
"AI". An employer who loads real resumes is processing personal data, even
though the data stays in the browser, and needs a lawful basis, a notice to
applicants and a retention rule. The tool keeps no resume data after the tab
closes, which helps with minimisation but does not discharge those duties.
Rejecting everyone below a score with no human look would be the "solely
automated" case that Article 22 restricts.

## 2. United States

### 2.1 Federal anti-discrimination law

- **Title VII, 42 U.S.C. § 2000e-2. [Verified]**
  ([govinfo](https://www.govinfo.gov/content/pkg/USCODE-2023-title42/html/USCODE-2023-title42-chap21-subchapVI-sec2000e-2.htm))
  Subsection (a) makes it unlawful "to fail or refuse to hire ... because of
  such individual's race, color, religion, sex, or national origin".
  Subsection (k) covers disparate impact: a practice that "causes a disparate
  impact" on one of those bases is unlawful unless the employer shows it is
  "job related for the position in question and consistent with business
  necessity".
- **The four-fifths rule, 29 CFR § 1607.4(D). [Verified]**
  ([eCFR](https://www.ecfr.gov/current/title-29/section-1607.4)) "A selection
  rate for any race, sex, or ethnic group which is less than four-fifths ...
  of the rate for the group with the highest rate will generally be regarded
  by the Federal enforcement agencies as evidence of adverse impact".
- **[Not verified]** The Age Discrimination in Employment Act and the
  Americans with Disabilities Act. I did not open either text. Both are
  relevant: a graduation-year window is an obvious proxy for age.
- **[Not verified]** The EEOC's 2023 technical assistance on AI and Title VII.
  The EEOC website refused my requests (HTTP 403), so I could not confirm its
  status. Law-firm commentary says the document was removed from the site in
  January 2025; that is secondary reporting.

**What this may mean for TalentScout.** These rules apply to any selection
procedure. Whether a keyword list, a school tier or a graduation window causes
adverse impact is an empirical question about real applicants, and this
project has no real applicant data, so it has not been and cannot be tested
here.

### 2.2 New York City — Local Law 144 of 2021

Sources: [DCWP's AEDT page](https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page)
and the [DCWP final rule](https://rules.cityofnewyork.us/wp-content/uploads/2023/04/DCWP-NOA-for-Use-of-Automated-Employment-Decisionmaking-Tools-2.pdf)
(6 RCNY §§ 5-300 to 5-304), both official. The City Council's own page for the
law would not load for me, so the statute's wording below comes from a
[copy of the certified local law hosted by a third party](https://imla.org/wp-content/uploads/2026/05/CityofNY-LocalLaw144of2021.pdf).

- **What the law requires. [Verified]** DCWP's page: the law "prohibits
  employers and employment agencies from using an automated employment
  decision tool unless the tool has been subject to a bias audit within one
  year of the use of the tool, information about the bias audit is publicly
  available, and certain notices have been provided". Enforcement began on
  5 July 2023.
- **Statutory definition, Admin. Code § 20-870. [Verified, unofficial copy]**
  An AEDT is "any computational process, derived from machine learning,
  statistical modeling, data analytics, or artificial intelligence, that
  issues simplified output, including a score, classification, or
  recommendation, that is used to substantially assist or replace
  discretionary decision making for making employment decisions".
- **The rule narrows two phrases. [Verified]** Under § 5-300, "machine
  learning, statistical modeling, data analytics, or artificial intelligence"
  means techniques that generate a prediction or classification **and** "for
  which a computer at least in part identifies the inputs, the relative
  importance placed on those inputs, and, if applicable, other parameters".
  "Substantially assist or replace" means relying solely on the output, or
  weighting it more than any other criterion, or using it to overrule other
  conclusions including human decisions.
- **Notice. [Verified]** § 5-304: notice to candidates "at least 10 business
  days before use of an AEDT".
- **Penalties, § 20-872. [Verified, unofficial copy]** Up to $500 for a first
  violation and $500 to $1,500 for each later one; each day of use is a
  separate violation.
- **[Not verified]** Any enforcement actions, court decisions or later
  amendments. Laws in other US states and cities (for example Illinois,
  Colorado and California) were not researched.

**What this may mean for TalentScout.** Here a person chooses every input and
every weight; no computer identifies them. On the wording of § 5-300 that
suggests the tool is outside the definition. It does produce a score and a
ranking, though, and an employer who relied on the ranking alone would meet
the "substantially assist or replace" test. I know of no decision on a tool
like this, and I did not look for one. If the law did apply, the required bias
audit needs historical data on real candidates by sex and race/ethnicity. This
project has none and makes no such claim. The ablation in
[ABLATION.md](ABLATION.md) is not a bias audit.

## 3. China

### 3.1 Personal Information Protection Law (个人信息保护法)

Source: [National People's Congress](http://www.npc.gov.cn/npc/c2/c30834/202108/t20210820_313088.html).
Adopted 20 August 2021, in force 1 November 2021 (Article 74). **[Verified]**

- **Article 24. [Verified]** A handler using personal information for
  automated decision-making must ensure "决策的透明度和结果公平、公正"
  (transparency of the decision and fair, just results). Where a decision with
  a major impact on a person's rights is made this way, the person "有权要求
  个人信息处理者予以说明，并有权拒绝个人信息处理者仅通过自动化决策的方式作出
  决定" (may require an explanation and may refuse a decision made solely by
  automated means).
- **Article 73(2). [Verified]** Automated decision-making means "通过计算机程序
  自动分析、评估个人的行为习惯、兴趣爱好或者经济、健康、信用状况等，并进行决策
  的活动".
- **Article 55. [Verified]** A personal information protection impact
  assessment is required beforehand when "利用个人信息进行自动化决策" (using
  personal information for automated decision-making), and when handling
  sensitive personal information.
- **Article 13(2). [Verified]** One lawful basis is processing necessary for
  "按照依法制定的劳动规章制度和依法签订的集体合同实施人力资源管理" (human
  resources management under lawful labour rules and collective contracts).
- **Article 28. [Verified]** Sensitive personal information includes
  biometrics, religious belief, specific identity, medical health and
  financial accounts.

### 3.2 Anti-discrimination in hiring

- **Employment Promotion Law (就业促进法). [Verified]**
  ([gov.cn](https://www.gov.cn/guoqing/2021-10/29/content_5647636.htm), as
  amended 24 April 2015.) Article 3: "劳动者就业，不因民族、种族、性别、宗教
  信仰等不同而受歧视". Article 26: employers "不得实施就业歧视". Article 27:
  employers may not refuse to hire women or raise the hiring standard for
  women on grounds of sex. Article 62: a worker may sue over employment
  discrimination.
- **Law on the Protection of Women's Rights and Interests (妇女权益保障法),
  2022 revision. [Verified]**
  ([NPC](http://www.npc.gov.cn/npc/c2/c30834/202210/t20221030_320091.html),
  in force 1 January 2023.) Article 43: in recruitment an employer may not
  "限定为男性或者规定男性优先" (limit a job to men or prefer men) nor
  "进一步询问或者调查女性求职者的婚育情况" (ask about or investigate a female
  applicant's marital or childbearing status beyond basic personal
  information). The law provides for fines of 10,000 to 50,000 yuan for
  breaches of Article 43 that are not corrected or are serious.
- **[Not verified]** Rules on age limits in job advertisements, and
  Ministry of Education notices said to bar campus recruitment from requiring
  particular school lists (for example "985" or "211" universities). I did not
  find or open a primary source for either. The second matters here, because
  school tiers are one of this tool's rule types.

### 3.3 Provisions on algorithmic recommendation (互联网信息服务算法推荐管理规定)

Source: [Cyberspace Administration of China](https://www.cac.gov.cn/2022-01/04/c_1642894606364259.htm).
In force 1 March 2022 (Article 35). **[Verified]**

- **Scope, Article 2. [Verified]** The provisions apply to using
  algorithmic recommendation technology "提供互联网信息服务" (to provide
  internet information services) within China, covering generation,
  personalised push, ranking and selection, retrieval and filtering, and
  scheduling and decision-making algorithms.
- **Article 20. [Verified]** Concerns providers that give workers "工作调度
  服务" (work-scheduling services), such as order allocation on platforms.
- **[Not verified]** The Interim Regulations on the Human Resources Market,
  the Provisions on Online Recruitment Services, and national standards on
  automated decision-making were not researched.

**What this may mean for TalentScout.** PIPL applies to an employer handling
real resumes in China whatever software is used. A rules-based score is at
least arguably "automated decision-making" under Article 73 if it drives the
decision, which brings in the explanation right in Article 24 and the impact
assessment in Article 55. The per-candidate report is a direct answer to the
"explain" duty. Chinese resumes often state gender, age, ethnicity and marital
status and carry a photo; the tool hides or masks those so that they cannot
drive a rule, which fits the direction of Article 43 of the Women's Rights
Law. The algorithm-recommendation provisions are written for internet
information services; a tool running locally in one recruiter's browser does
not look like one, but I have not seen an official view.

## 4. What the tool does, and does not do, about these themes

| Theme in the rules above | What TalentScout does | What it does not do |
|---|---|---|
| Explain the decision | Every point is tied to a rule, a reason and a quote from the resume | It cannot explain the choice of rules. That is the employer's judgement. |
| Human involvement | It ranks and flags. Nothing is rejected automatically; candidates missing a must-have stay on the list | It cannot stop a user from treating the ranking as final |
| Data minimisation | No server, no upload, no storage of resumes; a browser policy blocks requests to other sites | The employer still holds the resume files and owes the usual duties |
| Protected attributes | No rule reads name, gender, age, birth date or photo; the header block is hidden from all rules; photos are never read | Masking in running text is best-effort: 17 of 26 values on a held-out test ([ABLATION.md](ABLATION.md)) |
| Indirect discrimination | Shows which rule moved the score, so a proxy is visible. School and graduation rules can be switched off | School tier and graduation year are proxies (for background and for age). The tool cannot remove that, and has not been tested for adverse impact on real applicants |
| Bias audit | Not done | A bias audit in the NYC sense needs real demographic data. None was used. |

## 5. If someone wanted to use a tool like this on real applicants

Questions to take to a lawyer, not a checklist that makes anything compliant:

1. Is each rule job-related? Could you justify a school tier or a graduation window if challenged?
2. Who looks at candidates the tool ranks low or flags, and how is that recorded?
3. What are applicants told, when, and how can they ask for a person to review the result?
4. Does any law where you hire require an audit, an impact assessment, a notice period or consultation with worker representatives first?
5. How long are resumes and exported rankings kept, and who can see them?

*Not legal advice. Sources checked 11 November 2026.*
