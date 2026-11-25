/* The coach: one chat per person, plus the memory of what they told it.
 *
 * Everything the coach produces lives in files this server alone writes under data/coach/,
 * never in the synced state blob: a client PUTs its whole state and the newest `_ts` wins, so
 * anything the server wrote in there would be erased by the next sync.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pdfParse from 'pdf-parse';
import * as cfgStore from './config.js';
import { adapterFor } from './adapters/index.js';
import { buildContext, nameOf } from './context.js';

const DATA = process.env.DATA_DIR || '/data';
const COACH_DIR = path.join(DATA, 'coach');
const PROMPTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prompts');
const LIBRARY = createRequire(import.meta.url)('./library.json').exercises;

export const TIMEOUT_MS = 120000;
const CHAT_MAX = 1000, MEMORY_MAX = 200, CHAT_IN_PROMPT = 20, PDF_TEXT_CAP = 6000;
const DAILY_DEFAULT = 40;
// The library's own muscle tags (the app translates them), plus the Italian names a model may still use.
const MUSCLES = ['pectorals', 'delts', 'lats', 'upper back', 'traps', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'];
const IT_MUSCLE = { petto: 'pectorals', pettorali: 'pectorals', spalle: 'delts', deltoidi: 'delts', dorsali: 'lats', schiena: 'upper back', trapezi: 'traps', bicipiti: 'biceps', tricipiti: 'triceps', avambracci: 'forearms', addominali: 'abs', quadricipiti: 'quads', femorali: 'hamstrings', glutei: 'glutes', polpacci: 'calves', adduttori: 'adductors', abduttori: 'abductors' };

const safe = uid => String(uid).replace(/[^a-zA-Z0-9_-]/g, '');
const file = (kind, uid) => path.join(COACH_DIR, `${kind}-${safe(uid)}.json`);
const pdfDir = uid => path.join(DATA, 'diet-pdfs', safe(uid));
function readJSON(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function writeJSON(p, v) {
  fs.mkdirSync(path.dirname(p), { recursive: true, mode: 0o700 });
  fs.writeFileSync(p + '.tmp', JSON.stringify(v), { mode: 0o600 });
  fs.renameSync(p + '.tmp', p);
}

class CoachError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
export { CoachError };

let adapterOverride = null;
/** Test seam: drive the coach with a fake model. */
export const _setAdapter = a => { adapterOverride = a; };
let notify = () => {};
export const setNotifier = fn => { notify = fn; };

/* ---------- per-user files ---------- */

export const readState = uid => readJSON(path.join(DATA, 'state-' + safe(uid) + '.json'), null);
export const readChat = uid => readJSON(file('chat', uid), []);
export const readMemory = uid => readJSON(file('memory', uid), []);
export const readDiet = uid => readJSON(file('diet', uid), null);
export const listFiles = uid => { try { return fs.readdirSync(pdfDir(uid)).filter(f => f.toLowerCase().endsWith('.pdf')).sort(); } catch { return []; } };
/** The full path of one of his files, or null: only a name listFiles returns, so no ../ escapes. */
export const filePath = (uid, name) => (listFiles(uid).includes(name) ? path.join(pdfDir(uid), name) : null);
export const deleteFile = (uid, name) => { const p = filePath(uid, name); if (p) fs.rmSync(p); return listFiles(uid); };

// Clears one section of the chat (chat / after-workout / weekly); what the coach remembers about him stays.
// A chat is split in sessions like a browser chat (sid); messages from before sessions existed form session 'old'.
// With a sid only that session goes, otherwise the whole kind.
const sidOf = m => m.sid || 'old';
export const clearChat = (uid, kind, sid) => writeJSON(file('chat', uid), readChat(uid).filter(m => (m.kind || 'chat') !== kind || (sid && sidOf(m) !== sid)));
function appendChat(uid, ...msgs) { writeJSON(file('chat', uid), [...readChat(uid), ...msgs].slice(-CHAT_MAX)); }
function remember(uid, facts) {
  const add = (facts || []).filter(f => typeof f === 'string' && f.trim()).map(text => ({ text: text.trim().slice(0, 300), at: Date.now() }));
  if (add.length) writeJSON(file('memory', uid), [...readMemory(uid), ...add].slice(-MEMORY_MAX));
}

export function saveFile(uid, name, buf) {
  const clean = path.basename(String(name || 'documento.pdf')).replace(/[^\w .()-]/g, '_').slice(0, 120);
  const fname = clean.toLowerCase().endsWith('.pdf') ? clean : clean + '.pdf';
  fs.mkdirSync(pdfDir(uid), { recursive: true });
  fs.writeFileSync(path.join(pdfDir(uid), fname), buf);
  return fname;
}

/** One-time: the diet and PDFs that used to be global belong to the instance owner. Copies, never moves. */
export function migrateDiet(ownerUid) {
  if (fs.existsSync(file('diet', ownerUid))) return false;
  const diet = readJSON(path.join(DATA, 'diet.json'), null);
  if (!diet) return false;
  writeJSON(file('diet', ownerUid), diet);
  const src = path.join(DATA, 'diet-pdfs');
  try {
    fs.mkdirSync(pdfDir(ownerUid), { recursive: true });
    for (const f of fs.readdirSync(src)) if (f.toLowerCase().endsWith('.pdf')) fs.copyFileSync(path.join(src, f), path.join(pdfDir(ownerUid), f));
  } catch { /* no pdfs */ }
  return true;
}

async function pdfTexts(uid) {
  const out = {};
  for (const f of listFiles(uid)) {
    try { const { text } = await pdfParse(fs.readFileSync(path.join(pdfDir(uid), f))); if (text.trim()) out[f] = text.trim().slice(0, PDF_TEXT_CAP); }
    catch { /* unreadable pdf: skip */ }
  }
  return out;
}

/* ---------- caps ---------- */

const todayISO = () => new Date().toISOString().slice(0, 10);
function bumpDaily(uid) {
  const d = todayISO(), cur = readJSON(file('daily', uid), null);
  writeJSON(file('daily', uid), cur?.date === d ? { date: d, count: cur.count + 1 } : { date: d, count: 1 });
}
export function capState(uid) {
  const cur = readJSON(file('daily', uid), null);
  return { used: cur?.date === todayISO() ? cur.count : 0, limit: Math.max(cfgStore.load().caps?.perProfileDaily || 0, DAILY_DEFAULT) };
}

/* ---------- talking to the model ---------- */

/** The model's answer, tolerating a code fence or prose around the JSON object. */
export function extractJSON(text) {
  const raw = String(text || '').trim();
  if (!raw) return { error: 'the provider returned nothing' };
  try { return { value: JSON.parse(raw) }; } catch { /* keep looking */ }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return { value: JSON.parse(fenced[1]) }; } catch { /* keep looking */ }
  }
  const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return { value: JSON.parse(raw.slice(first, last + 1)) }; } catch { /* give up */ }
  }
  return { error: 'the answer was not JSON' };
}

function ready(uid, { counted = true } = {}) {
  if (!adapterOverride && (!cfgStore.isEnabled() || !cfgStore.isConnected())) throw new CoachError('off', 'il coach non è configurato');
  const S = readState(uid);
  if (!S?.coach?.consent?.agreedAt) throw new CoachError('consent', 'il coach aspetta il tuo ok');
  if (counted) {
    const { used, limit } = capState(uid);
    if (limit > 0 && used >= limit) throw new CoachError('cap', 'per oggi il coach ha finito, riprova domani');
    bumpDaily(uid);
  }
  return S;
}

async function context(uid, S) {
  return [
    '## I suoi allenamenti', '```json', JSON.stringify(buildContext(S, todayISO()), null, 1), '```',
    '## Piano alimentare e composizione corporea (trascritti)', '```json', JSON.stringify(readDiet(uid)), '```',
    '## Documenti originali del nutrizionista (testo estratto: fonte di verità)', '```json', JSON.stringify(await pdfTexts(uid)), '```',
    '## Cosa ti ha raccontato in passato', ...readMemory(uid).map(m => `- ${new Date(m.at).toISOString().slice(0, 10)}: ${m.text}`)
  ].join('\n');
}

const SHAPE = 'Rispondi con un solo oggetto JSON: {"answer": "<testo>", "remember": ["<fatto nuovo>", ...]}.';
const CHAT_SHAPE = 'Rispondi con un solo oggetto JSON: {"answer": "<testo>", "remember": ["<fatto nuovo>", ...], "schede": [<modifiche alle schede, solo se le fai>], "azioni": [<altre cose che fai nell\'app, solo se le fai>]}. Vedi sotto.';


/** One model call with one repair retry. `check(value)` says whether the JSON has the right shape. */
async function call(prompt, check) {
  const cfg = cfgStore.load();
  const adapter = adapterOverride || adapterFor(cfg.provider);
  if (!adapter) throw new CoachError('off', 'nessun provider');
  const jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'coach-'));
  const env = adapterOverride ? {} : cfgStore.jobEnv(jobDir);
  try {
    if (!adapterOverride) {
      const ids = (await import('./adapters/spawn.js')).unprivilegedIds();
      if (ids) fs.chownSync(jobDir, ids.uid, ids.gid);
    }
    let p = prompt;
    const deadline = Date.now() + TIMEOUT_MS;   // both attempts together, so the app never waits past it
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = deadline - Date.now();
      if (left < 15000) break;
      const r = await adapter.invoke({ cfg, prompt: p, jobDir, env, model: cfg.model || null, timeoutMs: left });
      if (r.timedOut) throw new CoachError('timeout', 'il coach non ha risposto in tempo');
      if (r.spawnError || r.code !== 0) {
        console.error('coach provider', (r.stderr || r.text || '').slice(0, 500));
        throw new CoachError('provider', 'il coach non è raggiungibile adesso, riprova tra poco');
      }
      const parsed = extractJSON(r.text);
      if (!parsed.error && check(parsed.value)) return parsed.value;
      p = prompt + '\n\n---\nLa tua risposta precedente non era JSON valido nella forma richiesta. Rimandala corretta, solo l\'oggetto JSON su una riga.\n```\n' + String(r.text || '').slice(0, 1500) + '\n```';
    }
    if (deadline - Date.now() < 15000) throw new CoachError('timeout', 'il coach non ha risposto in tempo');
    throw new CoachError('unusable', 'il coach ha risposto in un formato sbagliato');
  } finally {
    fs.rmSync(jobDir, { recursive: true, force: true });
  }
}
const isAnswer = v => typeof v?.answer === 'string';
const common = S => fs.readFileSync(path.join(PROMPTS, 'common.md'), 'utf8') +
  (S?.lang === 'en' ? '\n\n**Lingua: la persona usa l\'app in inglese. Scrivi ogni testo (answer, remember) in inglese.**' : '');

/* ---------- what the app asks for ---------- */

export async function ask(uid, text, sid = 'old') {
  const S = ready(uid);
  const past = readChat(uid).filter(m => (m.kind || 'chat') === 'chat' && sidOf(m) === sid).slice(-CHAT_IN_PROMPT).map(m => `${m.role === 'user' ? 'Lui' : 'Tu'}: ${m.text}`).join('\n');
  const v = await call([common(S), CHAT_SHAPE, fs.readFileSync(path.join(PROMPTS, 'app.md'), 'utf8'), await context(uid, S), '## Conversazione recente', past, '## Nuovo messaggio', text].join('\n\n'), isAnswer);
  const changes = [...resolveChanges(S, v.schede), ...resolveActions(S, v.azioni)];
  const at = Date.now();
  appendChat(uid, { role: 'user', kind: 'chat', sid, text, at }, { role: 'coach', kind: 'chat', sid, text: v.answer, at, ...(changes.length ? { changes: changes.map(c => ({ op: c.op, id: c.id, name: c.name, d: c.d })) } : {}) });
  remember(uid, v.remember);
  return { answer: v.answer, changes };
}

/* ---------- the coach editing routines ----------
 * The routines live in the synced state, which only the app writes (see the top of this file).
 * So the server only checks and resolves what the model asked for; the app applies it. */
const PHASES = new Set(['mob', 'core', 'rin', 'forza', 'stretch']);
const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const int = (x, lo, hi, d) => { const n = Math.round(+x); return n >= lo && n <= hi ? n : d; };

/** An exercise the model named: one he already has, else the library's, else a new custom one. */
function exerciseFor(S, e, fresh) {
  const mine = new Set([...Object.keys(S.exNames || {}), ...(S.customEx || []).map(c => c.id)]);
  for (const w of S.workouts || []) for (const x of w.entries || []) mine.add(x.id);
  for (const r of S.routines || []) for (const x of r.ex || []) mine.add(x.id);
  if (e.id && (mine.has(e.id) || LIBRARY.some(l => l.id === e.id))) return e.id;
  const n = norm(e.nome || e.name);
  if (!n) return null;
  const hit = [...mine].find(id => norm(nameOf(S, id)) === n) || LIBRARY.find(l => norm(l.n) === n)?.id;
  if (hit) return hit;
  // ponytail: word overlap, shortest name wins; a wrong pick shows in the routine and he swaps it
  const words = n.split(' ');
  const near = LIBRARY.filter(l => words.every(w => norm(l.n).split(' ').includes(w))).sort((a, b) => a.n.length - b.n.length)[0];
  if (near) return near.id;
  const id = 'c_' + n.replace(/ /g, '_').slice(0, 40);
  if (!fresh.some(c => c.id === id) && !(S.customEx || []).some(c => c.id === id)) fresh.push({ id, n: String(e.nome || e.name).trim().slice(0, 80) });
  return id;
}

export function resolveChanges(S, list) {
  const out = [], routines = S.routines || [];
  for (const c of Array.isArray(list) ? list.slice(0, 10) : []) {
    const op = { crea: 'create', modifica: 'edit', elimina: 'delete' }[c?.azione];
    const old = routines.find(r => r.id === c?.id);
    if (!op || (op !== 'create' && !old)) continue;
    if (op === 'delete') { out.push({ op, id: old.id, name: old.name }); continue; }
    const fresh = [];
    const ex = Array.isArray(c.esercizi) ? c.esercizi.slice(0, 30).map(e => {
      const id = exerciseFor(S, e || {}, fresh), prev = old?.ex?.find(x => x.id === id);
      const ph = PHASES.has(e.fase) ? e.fase : prev?.ph || 'forza';
      // a stretch is held, so a new exercise in that phase counts seconds (the app reads kind 'time')
      if (ph === 'stretch') { const f = fresh.find(x => x.id === id); if (f) f.kind = 'time'; }
      return id && { id, ph, sets: int(e.serie, 1, 10, prev?.sets || 3), reps: int(e.rip, 1, 600, prev?.reps || 10), weight: prev?.weight ?? null };
    }).filter((e, i, a) => e && a.findIndex(x => x?.id === e.id) === i) : null;
    const name = String(c.nome || old?.name || '').trim().slice(0, 60);
    if (op === 'create' && (!name || !ex?.length)) continue;
    out.push({
      op, id: old?.id || 'r' + Date.now().toString(36) + out.length, name,
      ...(ex ? { ex } : {}), ...(fresh.length ? { newEx: fresh } : {})
    });
  }
  return out;
}

/* ---------- the coach acting on the rest of the app ----------
 * Same deal as the routines: checked and resolved here, applied by the app. Ops the app knows:
 * workout-add / workout-edit / workout-delete, weight / weight-delete, settings, rename, start. */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const day = d => (ISO.test(d) && d <= todayISO() ? d : null);   // no future dates
const num = (x, lo, hi) => { const n = Math.round(+x * 10) / 10; return n >= lo && n <= hi ? n : null; };

function entriesFor(S, list, fresh) {
  return (Array.isArray(list) ? list.slice(0, 30) : []).map(e => {
    const id = exerciseFor(S, e || {}, fresh);
    const sets = (Array.isArray(e?.serie) ? e.serie.slice(0, 20) : []).map(x => ({ w: num(x?.kg, 0.1, 1000), r: int(x?.rip, 1, 600, null), done: true })).filter(x => x.r);
    return id && sets.length && { id, sets };
  }).filter(Boolean);
}

export function resolveActions(S, list) {
  const out = [], ws = S.workouts || [];
  for (const a of Array.isArray(list) ? list.slice(0, 10) : []) {
    const w = ws.find(x => x.id === a?.id);
    switch (a?.azione) {
      case 'aggiungi_allenamento': case 'modifica_allenamento': {
        const edit = a.azione === 'modifica_allenamento';
        if (edit && !w) break;
        const fresh = [], d = a.data === undefined && edit ? w.d : day(a.data);
        const entries = a.esercizi === undefined && edit ? null : entriesFor(S, a.esercizi, fresh);
        const r = (S.routines || []).find(x => x.id === a.scheda);
        const name = String(a.nome || r?.name || w?.name || '').trim().slice(0, 60);
        if (!d || !name || (entries && !entries.length)) break;
        // the minutes are shown from start/end; a missing time of day is early evening
        const min = int(a.minuti, 1, 600, null), start = min ? new Date(d + 'T18:00:00').getTime() : null;
        out.push({
          op: edit ? 'workout-edit' : 'workout-add', id: w?.id || 'w' + Date.now().toString(36) + out.length, d, name,
          ...(r ? { routineId: r.id } : {}), ...(start ? { start, end: start + min * 60000 } : {}),
          ...(entries ? { entries } : {}), ...(fresh.length ? { newEx: fresh } : {})
        });
        break;
      }
      case 'elimina_allenamento': if (w) out.push({ op: 'workout-delete', id: w.id, d: w.d, name: w.name }); break;
      case 'peso': { const d = day(a.data), kg = num(a.kg, 20, 400); if (d && kg) out.push({ op: 'weight', id: d, d, w: kg, name: String(kg) }); break; }
      case 'elimina_peso': if ((S.bodyweight || []).some(b => b.d === a.data)) out.push({ op: 'weight-delete', id: a.data, d: a.data, name: '' }); break;
      case 'impostazioni': {
        const set = {
          ...(int(a.recuperoSec, 10, 600, null) ? { restSec: int(a.recuperoSec, 10, 600) } : {}),
          ...(int(a.sogliaRip, 1, 50, null) ? { threshold: int(a.sogliaRip, 1, 50) } : {}),
          ...(['it', 'en'].includes(a.lingua) ? { lang: a.lingua } : {})
        };
        if (Object.keys(set).length) out.push({ op: 'settings', id: 'settings', name: '', set });
        break;
      }
      case 'rinomina_esercizio': {
        const name = String(a.nome || '').trim().slice(0, 80), id = exerciseFor(S, { id: a.id }, []);
        if (id === a.id && name) out.push({ op: 'rename', id, name });
        break;
      }
      case 'inizia': { const r = (S.routines || []).find(x => x.id === a.scheda); if (r && !S.active) out.push({ op: 'start', id: r.id, name: r.name }); break; }
    }
  }
  return out;
}

export async function cue(uid, exId) {
  const cached = readJSON(file('cues', uid), {});
  const key = (readState(uid)?.lang === 'en' ? 'en:' : '') + exId;
  if (cached[key]) return { text: cached[key] };
  const S = ready(uid);
  const v = await call([common(S), SHAPE, `Compito: per l'esercizio «${nameOf(S, exId)}» dagli in massimo 2 righe cosa deve sentire e un'immagine mentale concreta da usare durante la serie. remember: [].`].join('\n\n'), isAnswer);
  writeJSON(file('cues', uid), { ...cached, [key]: v.answer });
  return { text: v.answer };
}

/** A typed exercise name: is it one he already has or one from the library, and which muscle does it train? */
export async function classify(uid, name) {
  const S = ready(uid);
  const words = String(name).toLowerCase().split(/[^a-zàèéìòù0-9]+/).filter(w => w.length > 2);
  // His own exercises first (done, in a routine, renamed, created): a name typed in Italian
  // rarely matches the English library, so these are what a duplicate usually is.
  const mine = new Set([...Object.keys(S.exNames || {}), ...(S.customEx || []).map(c => c.id)]);
  for (const w of S.workouts || []) for (const e of w.entries || []) mine.add(e.id);
  for (const r of S.routines || []) for (const e of r.ex || []) mine.add(e.id);
  const cands = [...[...mine].map(id => ({ id, n: nameOf(S, id) })),
    ...LIBRARY.filter(e => words.some(w => e.n.includes(w))).slice(0, 40).map(e => ({ id: e.id, n: e.n }))];
  const v = await call([common(S),
    `Compito: la persona ha scritto il nome di un esercizio. Dimmi se è uno di questi candidati (stesso movimento) e quale muscolo allena principalmente, scelto ESATTAMENTE da questa lista: ${MUSCLES.join(', ')}.`,
    'Rispondi con un solo oggetto JSON: {"matchId": "<id del candidato o null>", "muscle": "<muscolo>"}.',
    '## Nome scritto', name, '## Candidati', JSON.stringify(cands)].join('\n\n'), v => typeof v?.muscle === 'string');
  const m = v.muscle.toLowerCase().trim();
  return { matchId: cands.some(c => c.id === v.matchId) ? v.matchId : null, muscle: MUSCLES.includes(m) ? m : IT_MUSCLE[m] || '' };
}

/** After a workout: a 2-3 line comment, in the chat and as a notification. Never throws. */
export async function afterWorkout(uid, workoutId) {
  try {
    const S = ready(uid, { counted: false });
    const w = (S.workouts || []).find(x => x.id === workoutId);
    if (!w) return;
    const v = await call([common(S), SHAPE, await context(uid, S),
      `Compito: ha appena finito l'allenamento del ${w.d} («${w.name}»). Commentalo in 2-3 righe: cosa è salito rispetto all'ultima volta, cosa no, una cosa concreta da fare la prossima volta. remember: [].`].join('\n\n'), isAnswer);
    appendChat(uid, { role: 'coach', kind: 'after-workout', text: v.answer, at: Date.now() });
    notify(uid, { title: S.lang === 'en' ? 'Your coach' : 'Il coach', body: v.answer.slice(0, 160), tag: 'coach', url: '#/coach' });
  } catch (e) { console.error('coach after-workout', uid, e.code || e.message); }
}

/** Sunday recap: the week's training and body weight. Never throws. */
export async function weekly(uid) {
  try {
    const S = ready(uid, { counted: false });
    const since = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    if (!(S.workouts || []).some(w => w.d >= since)) return;
    const v = await call([common(S), SHAPE, await context(uid, S),
      'Compito: riepilogo della settimana appena finita in 3-4 righe: quanti allenamenti, cosa è salito, il peso corporeo, una cosa su cui concentrarsi la prossima settimana. remember: [].'].join('\n\n'), isAnswer);
    appendChat(uid, { role: 'coach', kind: 'weekly', text: v.answer, at: Date.now() });
    writeJSON(file('weekly', uid), { date: todayISO() });
    notify(uid, { title: S.lang === 'en' ? 'Your week' : 'La tua settimana', body: v.answer.slice(0, 160), tag: 'coach-weekly', url: '#/coach' });
  } catch (e) { console.error('coach weekly', uid, e.code || e.message); }
}
export const lastWeekly = uid => readJSON(file('weekly', uid), null)?.date || null;

/** Admin "test the coach": the real adapter, a trivial round-trip, no user data. */
export async function testRun() {
  try {
    await call('Rispondi esattamente con questo JSON e nient\'altro: {"answer":"ok"}', isAnswer);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}
