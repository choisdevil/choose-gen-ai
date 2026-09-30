#!/usr/bin/env node
// Validates the data files the site reads. Run before every commit:
//   node scripts/validate.mjs
// Exits non-zero (and prints every problem) if anything is inconsistent.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function load(name) {
  try {
    return JSON.parse(readFileSync(join(root, 'data', name), 'utf8'));
  } catch (e) {
    err(`data/${name}: ${e.message}`);
    return null;
  }
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isIso = (v) => isStr(v) && !Number.isNaN(Date.parse(v));
const isDay = (v) => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isUrl = (v) => isStr(v) && /^https:\/\/\S+$/.test(v);

function checkSources(where, sources, { required = true } = {}) {
  if (!Array.isArray(sources) || (required && sources.length === 0)) {
    err(`${where}: sources must be a non-empty array`);
    return;
  }
  sources.forEach((s, i) => {
    if (!isStr(s?.title)) err(`${where}.sources[${i}]: missing title`);
    if (!isUrl(s?.url)) err(`${where}.sources[${i}]: url must be https`);
  });
}

// ---------- models.json ----------
const modelsDoc = load('models.json');
const models = new Map();
if (modelsDoc) {
  if (!isIso(modelsDoc.updatedAt)) err('models.json: updatedAt must be ISO 8601');
  const levelIds = (modelsDoc.effortLevels || []).map((l) => l.id);
  if (JSON.stringify(levelIds) !== JSON.stringify(EFFORTS)) err(`models.json: effortLevels must be exactly ${EFFORTS.join(', ')}`);
  (modelsDoc.effortLevels || []).forEach((l) => { if (!isStr(l.desc)) err(`models.json: effortLevels.${l.id} missing desc`); });

  if (!Array.isArray(modelsDoc.models) || !modelsDoc.models.length) err('models.json: models must be a non-empty array');
  for (const m of modelsDoc.models || []) {
    const where = `models.json[${m.id ?? '?'}]`;
    if (!isStr(m.id) || !/^[a-z0-9][a-z0-9.-]*$/.test(m.id)) err(`${where}: id must be lowercase kebab-case`);
    if (models.has(m.id)) err(`${where}: duplicate id`);
    models.set(m.id, m);
    for (const k of ['name', 'vendor', 'product', 'summary', 'lastVerified']) if (!isStr(m[k])) err(`${where}: missing ${k}`);
    if (!isUrl(m.url)) err(`${where}: url must be https`);
    if (m.released != null && !isStr(m.released)) err(`${where}: released must be a string if present`);
    if (!isDay(m.lastVerified)) err(`${where}: lastVerified must be YYYY-MM-DD`);
    if (!['official', 'search-summary'].includes(m.verification)) err(`${where}: verification must be "official" or "search-summary"`);
    if (typeof m.access?.free !== 'boolean') err(`${where}: access.free must be boolean`);
    if (!isStr(m.access?.plan)) err(`${where}: access.plan must describe the plan needed`);
    for (const e of EFFORTS) if (!isStr(m.effortGuide?.[e])) err(`${where}: effortGuide.${e} missing`);
    checkSources(where, m.sources);
  }
}

// ---------- tasks.json ----------
const tasksDoc = load('tasks.json');
if (tasksDoc) {
  if (!isIso(tasksDoc.updatedAt)) err('tasks.json: updatedAt must be ISO 8601');
  if (modelsDoc && tasksDoc.updatedAt !== modelsDoc.updatedAt) warn('tasks.json and models.json have different updatedAt');
  const catIds = new Set();
  const taskIds = new Set();
  const used = new Set();

  const checkPick = (where, p, { mustBeFree = false } = {}) => {
    if (!p) { err(`${where}: missing`); return; }
    const m = models.get(p.model);
    if (!m) err(`${where}: unknown model "${p.model}"`);
    else used.add(m.id);
    if (!EFFORTS.includes(p.effort)) err(`${where}: effort "${p.effort}" not in ${EFFORTS.join('/')}`);
    if (!isStr(p.why)) err(`${where}: missing why`);
    if (mustBeFree && m && !m.access.free) err(`${where}: free pick "${m.id}" is not free to use`);
  };

  if (!Array.isArray(tasksDoc.guidelines)) err('tasks.json: guidelines must be an array');
  (tasksDoc.guidelines || []).forEach((g, i) => {
    if (!isStr(g.title) || !isStr(g.summary)) err(`tasks.json.guidelines[${i}]: missing title/summary`);
    if (!isUrl(g.url)) err(`tasks.json.guidelines[${i}]: url must be https`);
  });
  if (!Array.isArray(tasksDoc.categories) || !tasksDoc.categories.length) err('tasks.json: categories must be non-empty');
  for (const c of tasksDoc.categories || []) {
    const cw = `tasks.json[${c.id ?? '?'}]`;
    if (!isStr(c.id) || catIds.has(c.id)) err(`${cw}: missing or duplicate category id`);
    catIds.add(c.id);
    for (const k of ['name', 'icon', 'desc']) if (!isStr(c[k])) err(`${cw}: missing ${k}`);
    if (!Array.isArray(c.tasks) || !c.tasks.length) err(`${cw}: tasks must be non-empty`);
    for (const t of c.tasks || []) {
      const tw = `${cw}.${t.id ?? '?'}`;
      if (!isStr(t.id) || taskIds.has(t.id)) err(`${tw}: missing or duplicate task id`);
      taskIds.add(t.id);
      if (!isStr(t.name)) err(`${tw}: missing name`);
      if (!Array.isArray(t.keywords) || !t.keywords.length || !t.keywords.every(isStr)) err(`${tw}: keywords must be non-empty strings`);
      checkPick(`${tw}.recommend.paid`, t.recommend?.paid);
      checkPick(`${tw}.recommend.free`, t.recommend?.free, { mustBeFree: true });
      (t.alternatives || []).forEach((a, i) => checkPick(`${tw}.alternatives[${i}]`, a));
      for (const k of ['tips', 'cautions']) {
        if (t[k] != null && (!Array.isArray(t[k]) || !t[k].every(isStr))) err(`${tw}: ${k} must be an array of strings`);
      }
    }
  }
  for (const id of models.keys()) if (!used.has(id)) warn(`model "${id}" is not recommended for any task`);
}

// ---------- signals.json ----------
const signals = load('signals.json');
if (signals) {
  if (!isIso(signals.updatedAt)) err('signals.json: updatedAt must be ISO 8601');
  for (const key of ['benchmarks', 'community']) {
    if (!Array.isArray(signals[key])) { err(`signals.json: ${key} must be an array`); continue; }
    signals[key].forEach((s, i) => {
      const w = `signals.json.${key}[${i}]`;
      if (!isStr(s.name ?? s.source)) err(`${w}: missing name/source`);
      if (!isUrl(s.url)) err(`${w}: url must be https`);
      if (!isDay(s.checkedAt)) err(`${w}: checkedAt must be YYYY-MM-DD`);
      if (!isStr(s.summary)) err(`${w}: missing summary`);
    });
  }
}

// ---------- changelog.json ----------
const changelog = load('changelog.json');
if (changelog) {
  const entries = changelog.entries;
  if (!Array.isArray(entries) || !entries.length) err('changelog.json: entries must be non-empty');
  (entries || []).forEach((e, i) => {
    if (!isDay(e.date)) err(`changelog.json.entries[${i}]: date must be YYYY-MM-DD`);
    if (!isStr(e.summary)) err(`changelog.json.entries[${i}]: missing summary`);
    if (i > 0 && e.date > entries[i - 1].date) err('changelog.json: entries must be newest first');
  });
}

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  console.error(`\n${errors.length} error(s)`);
  process.exit(1);
}
console.log(`ok: ${models.size} models, ${tasksDoc?.categories?.reduce((n, c) => n + c.tasks.length, 0) ?? 0} tasks`);
