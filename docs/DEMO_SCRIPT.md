# Demo script (about three minutes)

A walkthrough for showing TalentScout 2.0 to someone, live or on a recording.
Every number below comes from the built-in sample resumes with the example
rules, and was checked in the browser.

**Before you start**

- Run `npm start` and open <http://localhost:8080>, or open the live demo.
- Press **Reset to example** at the bottom of the Rules panel, so the rules are the defaults.
- Language: English. Protected attributes ignored: on.

| Time | Do | Say |
|---|---|---|
| 0:00 | Show the page, nothing loaded. | "This screens resumes against rules you write. It runs entirely in this browser tab. There's no server and no AI model, so every score can be checked by hand." |
| 0:20 | Press **Try with sample resumes**. | "Eight synthetic resumes, English and Chinese. Six are eligible. Nobody is deleted: the two missing a must-have are still listed, flagged, at the bottom." |
| 0:40 | Point at the top two rows: 87.5 and 85.8. | "The top two are an English and a Chinese resume. Same rules, same engine." |
| 0:55 | Click **Candidate 02** (85.8). | "This is the match report. Must-have 40 of 40. Each line is one rule: the points, the reason, and the line of the resume it came from. 'Machine Learning' was found through its Chinese alias, 机器学习. 'Java' was not found, so zero. The total is just the sum." |
| 1:25 | Scroll to the bottom of the report; open **Text the rules saw**. | "This is what the rules were allowed to read. The header block, with the name, gender, age and birth date, is blacked out before any rule runs." |
| 1:45 | Close. Click **Candidate 04** (27.0, Missing must-have). | "This one says 'No experience with Python or SQL yet'. A keyword search would count that as a match. Here both get zero, and the report shows the sentence so a reviewer can disagree." |
| 2:05 | Close. In **Must-have keywords** press **+ Add keyword** and type `Tableau`. | "Rules are live. Adding a third must-have re-ranks immediately: Candidate 01 drops from 87.5 to 74.2 and is now flagged." |
| 2:25 | Delete the Tableau row. Switch to **中文**. | "The interface, the reasons and the export are all available in Chinese." |
| 2:35 | Switch back to English. Press **Export CSV**, then **Save rules (JSON)**. | "The ranking exports to CSV with the explanation in a column. The rules are a JSON file you can keep in version control and load back." |
| 2:50 | Open developer tools, **Network** tab; drop `samples/zh_resume.pdf` on the page. | "A real PDF. Watch the requests: all to this site. The page also carries a policy that makes the browser block anything else." |
| 3:00 | Stop. | "It's decision support. It was evaluated on synthetic data only, and the README lists what it gets wrong." |

**Numbers you can quote** (synthetic data; see `docs/EVALUATION.md` and `docs/ABLATION.md`)

- Precision 87.0% against 57.6% for a plain keyword baseline, at similar recall (76.9% and 73.1%), on 50 synthetic resumes.
- 0 of 300 score changes when only name, gender, age, birth date or photo is changed.
- 17 of 26 identity details hidden when they appear outside the header: the known weak spot.

**If asked "is this AI?"** No. Every rule and weight is written by a person.
That is the point: it is slower to set up than a model and far easier to
explain and audit.

**If asked "is it fair?"** It guarantees that certain attributes are not
read. It does not guarantee fair outcomes: school tiers and graduation years
are proxies, and that has not been measured on real applicants.
