// Web UI. All DOM is built with textContent, never innerHTML: resume text is
// untrusted input and must not be able to inject markup.
import { analyzeResume, rankCandidates } from '../engine/score.js';
import { defaultRules, validateRules, parseRulesJson, serializeRules, COMPONENTS } from '../engine/rules.js';
import { toCsv } from '../engine/csv.js';
import { parseResumeFile, detectFormat } from '../parsers/index.js';
import { formatReason, formatFlag } from '../i18n/reasons.js';
import { translate } from '../i18n/strings.js';
import { SAMPLES } from './samples.js';

const MAX_BYTES = 15 * 1024 * 1024;
const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private mode: ignore */ }
  },
};

// Only rules and language are remembered. Resume text lives in memory only
// and is gone when the tab closes.
const state = {
  lang: store.get('ts2.lang') === 'zh' ? 'zh' : 'en',
  rules: loadSavedRules(),
  protectedMode: true,
  showFiles: false,
  files: [], // {seq, name, format, text, error}
  ranked: [],
  progress: null,
  notice: null,
  ruleErrors: [],
};
let editor = editorFromRules(state.rules);
let seq = 0;

const t = (key, params) => translate(state.lang, key, params);
const $ = (id) => document.getElementById(id);

function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
}

function loadSavedRules() {
  const saved = store.get('ts2.rules');
  if (saved) {
    const parsed = parseRulesJson(saved);
    if (parsed.ok) return parsed.rules;
  }
  return validateRules(defaultRules()).rules;
}

// ---- Rules editor -----------------------------------------------------------

function editorFromRules(r) {
  const kw = (list) => list.map((k) => ({ term: k.term, aliases: k.aliases.join(', '), caseSensitive: !!k.caseSensitive }));
  return {
    name: r.name,
    weights: { ...r.weights },
    mustHave: kw(r.mustHave),
    niceToHave: kw(r.niceToHave),
    tiers: r.schoolTiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      scorePct: Math.round(tier.score * 100),
      schools: tier.schools.map((s) => [s.name, ...s.aliases].join(' | ')).join('\n'),
    })),
    graduation: { ...r.graduation },
  };
}

function rulesFromEditor(e) {
  const split = (s) => s.split(/[,，;；、]/).map((x) => x.trim()).filter(Boolean);
  const kw = (list) =>
    list
      .filter((k) => k.term.trim())
      .map((k) => ({ term: k.term, aliases: split(k.aliases), ...(k.caseSensitive ? { caseSensitive: true } : {}) }));
  const num = (v) => (v === '' || v === null ? NaN : Number(v));
  return {
    version: 1,
    name: e.name,
    weights: Object.fromEntries(COMPONENTS.map((c) => [c, num(e.weights[c])])),
    mustHave: kw(e.mustHave),
    niceToHave: kw(e.niceToHave),
    schoolTiers: e.tiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      score: num(tier.scorePct) / 100,
      schools: tier.schools
        .split('\n')
        .map((line) => line.split('|').map((x) => x.trim()).filter(Boolean))
        .filter((parts) => parts.length)
        .map(([name, ...aliases]) => ({ name, aliases })),
    })),
    graduation: {
      enabled: e.graduation.enabled,
      from: num(e.graduation.from),
      to: num(e.graduation.to),
      mode: e.graduation.mode,
    },
  };
}

function editorChanged({ rerender = false } = {}) {
  const v = validateRules(rulesFromEditor(editor));
  state.ruleErrors = v.errors;
  if (v.ok) {
    state.rules = v.rules;
    store.set('ts2.rules', serializeRules(v.rules));
    rescore();
  }
  if (rerender) renderEditor();
  else {
    renderRuleStatus();
    renderShares();
  }
}

function field(labelText, input) {
  const id = `f${Math.random().toString(36).slice(2, 9)}`;
  input.id = id;
  return h('div', {}, h('label', { htmlFor: id, text: labelText }), input);
}

function keywordGroup(key) {
  const list = editor[key];
  const rows = list.map((k, i) =>
    h('div', { class: 'kw-row' },
      h('input', { type: 'text', value: k.term, placeholder: t('rules.term'), ariaLabel: t('rules.term'), oninput: (e) => { k.term = e.target.value; editorChanged(); } }),
      h('input', { type: 'text', value: k.aliases, placeholder: t('rules.aliases'), ariaLabel: t('rules.aliases'), oninput: (e) => { k.aliases = e.target.value; editorChanged(); } }),
      h('button', { type: 'button', class: 'icon-btn', title: t('rules.remove'), ariaLabel: `${t('rules.remove')}: ${k.term}`, text: '×', onclick: () => { list.splice(i, 1); editorChanged({ rerender: true }); } }),
    ),
  );
  return h('div', { class: 'group' },
    h('h3', { text: t(`rules.${key}`) }),
    key === 'mustHave' && h('p', { class: 'help', text: t('rules.mustHaveHelp') }),
    rows,
    h('button', { type: 'button', class: 'btn small', text: `+ ${t('rules.addKeyword')}`, onclick: () => { list.push({ term: '', aliases: '' }); renderEditor(); focusLast(`[data-group="${key}"] .kw-row:last-of-type input`); } }),
  );
}

function focusLast(selector) {
  document.querySelector(selector)?.focus();
}

function renderEditor() {
  const g = editor.graduation;
  const weights = h('div', { class: 'group' },
    h('h3', { text: t('rules.weights') }),
    h('p', { class: 'help', text: t('rules.weightsHelp') }),
    COMPONENTS.map((c) => {
      const number = h('input', { type: 'number', min: 0, max: 100, step: 1, value: editor.weights[c], ariaLabel: t(`component.${c}`) });
      const range = h('input', { type: 'range', min: 0, max: 100, step: 1, value: editor.weights[c], ariaLabel: t(`component.${c}`) });
      const sync = (src, dst) => src.addEventListener('input', () => { dst.value = src.value; editor.weights[c] = src.value; editorChanged(); });
      sync(number, range);
      sync(range, number);
      return h('div', { class: 'weight-row' }, h('span', { class: 'wname', text: t(`component.${c}`) }), range, number, h('span', { class: 'share', 'data-share': c }));
    }),
  );

  const must = keywordGroup('mustHave');
  must.dataset.group = 'mustHave';
  const nice = keywordGroup('niceToHave');
  nice.dataset.group = 'niceToHave';

  const tiers = h('div', { class: 'group' },
    h('h3', { text: t('rules.school') }),
    h('p', { class: 'help', text: t('rules.schoolHelp') }),
    editor.tiers.map((tier, i) =>
      h('div', { class: 'tier' },
        h('div', { class: 'tier-top' },
          field(t('rules.tierLabel'), h('input', { type: 'text', value: tier.label, oninput: (e) => { tier.label = e.target.value; editorChanged(); } })),
          field(t('rules.tierScore'), h('input', { type: 'number', min: 0, max: 100, step: 5, value: tier.scorePct, oninput: (e) => { tier.scorePct = e.target.value; editorChanged(); } })),
        ),
        field(t('rules.tierSchools'), h('textarea', { value: tier.schools, spellcheck: false, oninput: (e) => { tier.schools = e.target.value; editorChanged(); } })),
        h('button', { type: 'button', class: 'btn small ghost', text: t('rules.removeTier'), onclick: () => { editor.tiers.splice(i, 1); editorChanged({ rerender: true }); } }),
      ),
    ),
    h('button', { type: 'button', class: 'btn small', text: `+ ${t('rules.addTier')}`, onclick: () => { editor.tiers.push({ id: `tier-${Date.now()}`, label: `Tier ${editor.tiers.length + 1}`, scorePct: 50, schools: '' }); editorChanged({ rerender: true }); } }),
  );

  const grad = h('div', { class: 'group' },
    h('h3', { text: t('rules.graduation') }),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: g.enabled, onchange: (e) => { g.enabled = e.target.checked; editorChanged({ rerender: true }); } }), t('rules.gradEnabled')),
    g.enabled && h('div', { class: 'grad-grid' },
      field(t('rules.gradFrom'), h('input', { type: 'number', min: 1950, max: 2100, value: g.from ?? '', oninput: (e) => { g.from = e.target.value; editorChanged(); } })),
      field(t('rules.gradTo'), h('input', { type: 'number', min: 1950, max: 2100, value: g.to ?? '', oninput: (e) => { g.to = e.target.value; editorChanged(); } })),
    ),
    g.enabled && field(t('rules.gradMode'),
      h('select', { onchange: (e) => { g.mode = e.target.value; editorChanged(); } },
        h('option', { value: 'score', text: t('rules.gradModeScore'), selected: g.mode === 'score' }),
        h('option', { value: 'filter', text: t('rules.gradModeFilter'), selected: g.mode === 'filter' }),
      )),
  );

  const fileInput = h('input', { type: 'file', accept: '.json,application/json', class: 'visually-hidden', tabIndex: -1, onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) loadRulesText(await f.text()); } });
  const actions = h('div', { class: 'group' },
    h('div', { class: 'rules-actions' },
      h('button', { type: 'button', class: 'btn primary', text: t('rules.save'), onclick: saveRules }),
      h('button', { type: 'button', class: 'btn', text: t('rules.load'), onclick: () => fileInput.click() }),
      h('button', { type: 'button', class: 'btn ghost', text: t('rules.reset'), onclick: () => applyRules(validateRules(defaultRules()).rules) }),
      fileInput,
    ),
    h('div', { id: 'rule-status', role: 'status' }),
  );

  $('rules-editor').replaceChildren(
    h('div', { class: 'group' }, field(t('rules.name'), h('input', { type: 'text', value: editor.name, oninput: (e) => { editor.name = e.target.value; editorChanged(); } }))),
    weights, must, nice, tiers, grad, actions,
  );
  renderRuleStatus();
  renderShares();
}

function renderShares() {
  // Mirrors activeWeights() in the engine: shows what each weight is really worth.
  const r = state.rules;
  const active = {
    mustHave: r.mustHave.length > 0,
    niceToHave: r.niceToHave.length > 0,
    school: r.schoolTiers.some((x) => x.schools.length),
    graduation: r.graduation.enabled,
  };
  const sum = COMPONENTS.reduce((a, c) => a + (active[c] ? r.weights[c] : 0), 0);
  for (const el of document.querySelectorAll('[data-share]')) {
    const c = el.dataset.share;
    const pct = sum > 0 && active[c] ? Math.round((r.weights[c] / sum) * 1000) / 10 : 0;
    el.textContent = t('rules.share', { pct });
  }
}

function renderRuleStatus() {
  const box = $('rule-status');
  if (!box) return;
  if (state.ruleErrors.length) {
    box.replaceChildren(h('div', { class: 'notice bad' }, t('rules.invalid'), h('ul', {}, state.ruleErrors.map((e) => h('li', { text: e })))));
  } else if (state.notice) {
    box.replaceChildren(h('div', { class: `notice ${state.notice.kind}` }, state.notice.text, state.notice.items && h('ul', {}, state.notice.items.map((e) => h('li', { text: e })))));
  } else box.replaceChildren();
}

function applyRules(rules, notice = null) {
  state.rules = rules;
  state.ruleErrors = [];
  state.notice = notice;
  editor = editorFromRules(rules);
  store.set('ts2.rules', serializeRules(rules));
  renderEditor();
  rescore();
}

function loadRulesText(text) {
  const parsed = parseRulesJson(text);
  if (parsed.ok) applyRules(parsed.rules, { kind: 'ok', text: t('rules.loaded') });
  else {
    state.notice = { kind: 'bad', text: t('rules.loadFailed'), items: parsed.errors };
    renderRuleStatus();
  }
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveRules() {
  const slug = state.rules.name.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '') || 'rules';
  download(`${slug}.rules.json`, serializeRules(state.rules), 'application/json');
}

// ---- Files ------------------------------------------------------------------

const libs = {
  cMapUrl: new URL('../../vendor/pdfjs/cmaps/', import.meta.url).href,
  standardFontDataUrl: new URL('../../vendor/pdfjs/standard_fonts/', import.meta.url).href,
};

async function ensureLibs(format) {
  if (format === 'pdf' && !libs.pdfjsLib) {
    libs.pdfjsLib = await import('../../vendor/pdfjs/pdf.min.mjs');
    libs.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    libs.worker = new libs.pdfjsLib.PDFWorker(); // one worker for the whole batch
  }
  if (format === 'docx' && !libs.mammoth) {
    await new Promise((resolve, reject) => {
      const s = h('script', { src: new URL('../../vendor/mammoth/mammoth.browser.min.js', import.meta.url).href, onload: resolve, onerror: () => reject(new Error('mammoth failed to load')) });
      document.head.append(s);
    });
    libs.mammoth = window.mammoth;
  }
}

/** @param items Array<{name:string, getBytes:()=>Promise<Uint8Array>, size:number}> */
async function addFiles(items) {
  let done = 0;
  for (const item of items) {
    state.progress = { done: done + 1, total: items.length };
    renderProgress();
    const entry = { seq: ++seq, name: item.name, format: null, text: '', error: null };
    try {
      if (item.size > MAX_BYTES) entry.error = 'too_large';
      else {
        const bytes = await item.getBytes();
        const format = detectFormat(item.name, bytes);
        await ensureLibs(format);
        Object.assign(entry, await parseResumeFile({ name: item.name, bytes }, libs));
      }
    } catch (e) {
      entry.error = 'parse_failed';
      console.error(e);
    }
    state.files.push(entry);
    done++;
  }
  state.progress = null;
  renderProgress();
  rescore();
}

const fromFileList = (list) => [...list].map((f) => ({ name: f.name, size: f.size, getBytes: async () => new Uint8Array(await f.arrayBuffer()) }));
const fromSamples = () => SAMPLES.map((s) => { const bytes = new TextEncoder().encode(s.text); return { name: s.name, size: bytes.length, getBytes: async () => bytes }; });

function rescore() {
  const scored = state.files.map((f) => {
    const analysis = f.error
      ? { readable: false, total: null, flags: ['unreadable'], eligible: false, results: [], extracted: {}, protectedSpans: [], text: '', errorCode: f.error }
      : analyzeResume(f.text, state.rules, { protectedMode: state.protectedMode });
    return { id: String(f.seq).padStart(6, '0'), file: f, analysis };
  });
  state.ranked = rankCandidates(scored).map((c) => ({ ...c, label: labelFor(c.file) }));
  renderResults();
}

function labelFor(file) {
  const hidden = state.protectedMode && !state.showFiles;
  return hidden ? t('results.candidateN', { n: String(file.seq).padStart(2, '0') }) : file.name;
}

function renderUpload() {
  const input = h('input', { type: 'file', multiple: true, accept: '.pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document', class: 'visually-hidden', tabIndex: -1, onchange: (e) => { const items = fromFileList(e.target.files); e.target.value = ''; addFiles(items); } });
  const drop = h('div', { class: 'drop', id: 'dropzone' },
    h('div', { class: 'drop-title', text: t('upload.drop') }),
    h('div', { class: 'drop-actions' },
      h('span', { text: t('upload.or') }),
      h('button', { type: 'button', class: 'btn primary', text: t('upload.browse'), onclick: () => input.click() }),
      h('button', { type: 'button', class: 'btn', id: 'load-samples', text: t('upload.sample'), onclick: () => addFiles(fromSamples()) }),
      input,
    ),
    h('p', { class: 'help', text: t('upload.sampleNote') }),
    h('div', { class: 'progress', id: 'progress', role: 'status' }),
  );
  for (const ev of ['dragenter', 'dragover']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); });
  for (const ev of ['dragleave', 'drop']) drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); });
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.length) addFiles(fromFileList(e.dataTransfer.files)); });

  const protect = h('div', { class: `protect${state.protectedMode ? '' : ' off'}` },
    h('input', { type: 'checkbox', class: 'switch', id: 'protect-switch', role: 'switch', checked: state.protectedMode, onchange: (e) => { state.protectedMode = e.target.checked; renderUpload(); rescore(); } }),
    h('div', {},
      h('label', { htmlFor: 'protect-switch' }, h('strong', { text: t('protect.label') })),
      h('p', { text: t(state.protectedMode ? 'protect.help' : 'protect.off') }),
      state.protectedMode && h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'show-files', checked: state.showFiles, onchange: (e) => { state.showFiles = e.target.checked; rescore(); } }), t('protect.showFiles')),
    ),
  );
  $('upload').replaceChildren(drop, protect);
  renderProgress();
}

function renderProgress() {
  const el = $('progress');
  if (el) el.textContent = state.progress ? t('upload.parsing', state.progress) : '';
}

// ---- Results ----------------------------------------------------------------

const fmt = (n) => (n === null || n === undefined ? t('results.none') : n.toFixed(1));

function chips(a) {
  if (!a.readable) {
    const text = a.errorCode ? t(`error.${a.errorCode}`) : formatFlag('unreadable', state.lang);
    return [h('span', { class: 'chip bad', text })];
  }
  const out = [];
  if (a.eligible && !a.flags.length) out.push(h('span', { class: 'chip ok', text: t('results.eligible') }));
  for (const f of a.flags) {
    const bad = f === 'missing_must_have' || (f === 'outside_window' && !a.eligible);
    out.push(h('span', { class: `chip ${bad ? 'bad' : 'warn'}`, text: formatFlag(f, state.lang) }));
  }
  return out;
}

function ratio(a, component) {
  const rs = a.results.filter((r) => r.component === component);
  return rs.length ? `${rs.filter((r) => r.fired).length}/${rs.length}` : t('results.none');
}

function renderResults() {
  const ranked = state.ranked;
  $('results-actions').replaceChildren(
    h('button', { type: 'button', class: 'btn', id: 'export-csv', text: t('results.export'), disabled: !ranked.length, onclick: () => download('talentscout-ranking.csv', toCsv(ranked, state.lang), 'text/csv;charset=utf-8') }),
    h('button', { type: 'button', class: 'btn ghost', text: t('upload.clear'), disabled: !ranked.length, onclick: () => { state.files = []; seq = 0; rescore(); } }),
  );
  if (!ranked.length) {
    $('results').replaceChildren(h('p', { class: 'empty', text: t('results.empty') }));
    return;
  }
  const count = (fn) => ranked.filter((c) => fn(c.analysis)).length;
  const summary = t('results.summary', {
    total: ranked.length,
    eligible: count((a) => a.eligible),
    flagged: count((a) => a.readable && a.flags.length > 0),
    unreadable: count((a) => !a.readable),
  });
  const head = ['results.rank', 'results.candidate', 'results.score', 'results.status', 'component.mustHave', 'component.niceToHave', 'results.school', 'results.grad', null];
  const rows = ranked.map((c) => {
    const a = c.analysis;
    const bar = h('span');
    bar.style.width = `${Math.max(0, Math.min(100, a.total ?? 0))}%`;
    const open = () => openReport(c);
    return h('tr', { class: `clickable${a.eligible ? '' : ' ineligible'}`, onclick: open },
      h('td', { class: 'num', text: String(c.rank) }),
      h('td', {}, h('div', { class: 'cand', text: c.label, title: c.label })),
      h('td', {}, h('div', { class: 'score-cell' }, h('span', { class: 'score-num', text: fmt(a.total) }), h('div', { class: 'bar' }, bar))),
      h('td', {}, chips(a)),
      h('td', { class: 'num', text: ratio(a, 'mustHave') }),
      h('td', { class: 'num', text: ratio(a, 'niceToHave') }),
      h('td', {}, h('div', { class: 'trunc', text: a.extracted?.school ?? t('results.none'), title: a.extracted?.school ?? '' })),
      h('td', { class: 'num', text: a.extracted?.graduationYear ? String(a.extracted.graduationYear) : t('results.none') }),
      h('td', {}, h('button', { type: 'button', class: 'btn small', text: t('results.report'), ariaLabel: `${t('results.report')}: ${c.label}`, onclick: (e) => { e.stopPropagation(); open(); } })),
    );
  });
  $('results').replaceChildren(
    h('p', { class: 'summary', text: summary }),
    h('div', { class: 'table-scroll' },
      h('table', {},
        h('thead', {}, h('tr', {}, head.map((k) => h('th', { scope: 'col', text: k ? t(k) : '' })))),
        h('tbody', {}, rows),
      )),
  );
}

// ---- Report -----------------------------------------------------------------

function evidenceBlock(e) {
  const i = e.lineText.indexOf(e.quote);
  const body = i < 0
    ? [e.lineText]
    : [e.lineText.slice(0, i), h('mark', { text: e.quote }), e.lineText.slice(i + e.quote.length)];
  return h('div', { class: 'evidence' }, h('span', { class: 'ln', text: t('report.line', { n: e.line }) }), body);
}

function openReport(c) {
  const a = c.analysis;
  const dlg = $('report');
  const close = h('button', { type: 'button', class: 'btn', text: t('report.close'), onclick: () => dlg.close() });
  const head = h('div', { class: 'report-head' },
    h('div', {},
      h('div', { class: 'eyebrow', text: `${t('report.title')} · ${state.rules.name}` }),
      h('h2', { id: 'report-h', text: c.label }),
      h('div', {}, chips(a)),
    ),
    h('div', { class: 'report-score' }, h('b', { text: fmt(a.total) }), ' ', h('span', { text: t('report.scoreOf') }), h('div', {}, close)),
  );

  const body = h('div', { class: 'report-body' });
  if (!a.readable) {
    body.append(h('p', { text: a.errorCode ? t(`error.${a.errorCode}`) : t('report.unreadable') }));
  } else {
    body.append(
      h('div', { class: 'breakdown' }, COMPONENTS.filter((k) => a.results.some((r) => r.component === k)).map((k) => {
        const rs = a.results.filter((r) => r.component === k);
        const got = rs.reduce((s, r) => s + r.points, 0);
        const max = rs.reduce((s, r) => s + r.maxPoints, 0);
        return h('div', {}, h('div', { class: 'k', text: t(`component.${k}`) }), h('div', { class: 'v', text: `${got.toFixed(1)} / ${max.toFixed(1)}` }));
      })),
      h('p', { class: 'report-note', text: t('report.sum') }),
      ...a.results.map((r) =>
        h('div', { class: `rule ${r.fired ? 'fired' : 'miss'}` },
          h('span', { class: 'tick', text: r.fired ? '✓' : '–', ariaHidden: 'true' }),
          h('span', { class: 'title' }, r.component === 'school' || r.component === 'graduation' ? t(`component.${r.component}`) : r.label, h('span', { class: 'comp', text: r.component === 'mustHave' || r.component === 'niceToHave' ? t(`component.${r.component}`) : '' })),
          h('span', { class: 'pts', text: `${r.points.toFixed(1)} / ${r.maxPoints.toFixed(1)}` }),
          h('span', { class: 'why', text: formatReason(r.reason, state.lang) }),
          r.evidence.map(evidenceBlock),
        )),
    );
    const kinds = [...new Set(a.protectedSpans.map((s) => s.type))].map((k) => t(`protected.${k}`));
    const note = !a.protectedMode ? t('report.maskOff') : kinds.length ? t('report.masked', { list: kinds.join(state.lang === 'zh' ? '、' : ', ') }) : t('report.maskedNone');
    body.append(
      h('p', { class: 'report-note', text: note }),
      ...(a.identityZone ?? []).map((z) => h('p', { class: 'report-note', text: t('report.zone', { from: z.fromLine, to: z.toLine }) })),
      h('details', {}, h('summary', { text: t('report.text') }), h('pre', { class: 'rawtext', text: a.text })),
    );
  }
  dlg.replaceChildren(head, body);
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}

// ---- Language and boot ------------------------------------------------------

function applyLanguage() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : 'en';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang));
  renderEditor();
  renderUpload();
  rescore();
  $('report').close();
}

for (const b of document.querySelectorAll('[data-lang]')) {
  b.addEventListener('click', () => {
    state.lang = b.dataset.lang;
    store.set('ts2.lang', state.lang);
    state.notice = null;
    applyLanguage();
  });
}
$('report').addEventListener('click', (e) => { if (e.target === $('report')) $('report').close(); });
$('boot-warning')?.remove();
applyLanguage();

// Shareable demo links: ?demo loads the built-in samples, ?demo&report=2 also
// opens the report of the candidate ranked second.
const query = new URLSearchParams(location.search);
if (query.has('demo')) {
  await addFiles(fromSamples());
  const wanted = state.ranked[Number(query.get('report')) - 1];
  if (wanted) openReport(wanted);
}
document.documentElement.dataset.ready = 'true';
