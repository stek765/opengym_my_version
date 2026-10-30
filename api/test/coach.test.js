import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tempData, writeState } from './helpers.mjs';

const dir = tempData();
const cfg = await import('../coach/config.js');
const jobs = await import('../coach/jobs.js');
const { weeklyDue } = await import('../coach/cadence.js');
const { buildContext } = await import('../coach/context.js');

cfg.save({ enabled: true, provider: 'claude', auth: { type: 'cli-token', data: cfg.encrypt({ token: 'x' }) } });
const real = JSON.parse(fs.readFileSync(new URL('./fixtures/state-sample.json', import.meta.url), 'utf8'));
const UID = 'u1';
writeState(dir, UID, { ...real, exNames: { '0314': 'Panca inclinata' } });

// Fake model: answers from a queue, records every prompt.
let replies = [], prompts = [];
const fake = { async check() { return { ok: true } }, async invoke({ prompt }) {
  prompts.push(prompt);
  const r = replies.shift();
  if (r instanceof Error) throw r;
  return { code: 0, text: typeof r === 'string' ? r : JSON.stringify(r) };
} };
jobs._setAdapter(fake);
const sent = [];
jobs.setNotifier((uid, payload) => sent.push({ uid, payload }));
const reset = () => { replies = []; prompts = []; sent.length = 0; };

test('ask stores question and answer in the chat and what to remember in memory', async () => {
  reset();
  replies = [{ answer: 'Ok, recupera domani.', remember: ['sabato sgarro: pizza e 3 birre'] }];
  const r = await jobs.ask(UID, 'ho sgarrato sabato');
  assert.equal(r.answer, 'Ok, recupera domani.');
  const chat = jobs.readChat(UID);
  assert.deepEqual(chat.slice(-2).map(m => [m.role, m.text]), [['user', 'ho sgarrato sabato'], ['coach', 'Ok, recupera domani.']]);
  assert.equal(jobs.readMemory(UID).at(-1).text, 'sabato sgarro: pizza e 3 birre');
});

test('memory and the user\'s names reach the next prompt', async () => {
  reset();
  replies = [{ answer: 'Sì.', remember: [] }];
  await jobs.ask(UID, 'e adesso?');
  assert.match(prompts[0], /sabato sgarro: pizza e 3 birre/);
  assert.match(prompts[0], /Panca inclinata/);
});

test('a malformed answer is retried once, then fails as unusable without a coach message', async () => {
  reset();
  replies = ['non json', { answer: 'ok', remember: [] }];
  assert.equal((await jobs.ask(UID, 'uno')).answer, 'ok');
  reset();
  const before = jobs.readChat(UID).length;
  replies = ['no', 'ancora no'];
  await assert.rejects(jobs.ask(UID, 'due'), e => e.code === 'unusable');
  assert.equal(jobs.readChat(UID).filter(m => m.role === 'coach').length, jobs.readChat(UID).slice(0, before).filter(m => m.role === 'coach').length);
});

test('afterWorkout never throws when the model fails, and leaves the chat as it was', async () => {
  reset();
  const before = jobs.readChat(UID).length;
  replies = [new Error('provider down')];
  await jobs.afterWorkout(UID, real.workouts.at(-1).id);
  assert.equal(jobs.readChat(UID).length, before);
  assert.equal(sent.length, 0);
});

test('afterWorkout adds a coach comment and pushes a notification', async () => {
  reset();
  replies = [{ answer: 'Leg extension 70×10: la prossima sali.', remember: [] }];
  await jobs.afterWorkout(UID, real.workouts.at(-1).id);
  const m = jobs.readChat(UID).at(-1);
  assert.equal(m.kind, 'after-workout');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].uid, UID);
});

test('cue is cached per exercise', async () => {
  reset();
  replies = [{ answer: 'Spingi via il pavimento.', remember: [] }];
  assert.equal((await jobs.cue(UID, '0259')).text, 'Spingi via il pavimento.');
  assert.equal((await jobs.cue(UID, '0259')).text, 'Spingi via il pavimento.');
  assert.equal(prompts.length, 1);
});

test('classify keeps a match only if it is a real candidate', async () => {
  reset();
  replies = [{ matchId: '9999zz', muscle: 'delts' }];
  assert.deepEqual(await jobs.classify(UID, 'alzate inclinate 30 gradi - spalle'), { matchId: null, muscle: 'delts' });
  replies = [{ matchId: '0326', muscle: 'spalle' }];
  assert.deepEqual(await jobs.classify(UID, 'alzate inclinate 30 gradi - spalle'), { matchId: '0326', muscle: 'delts' }, 'Italian names map onto the library tags');
  replies = [{ matchId: null, muscle: 'boh' }];
  assert.equal((await jobs.classify(UID, 'x')).muscle, '');
});

test('weeklyDue fires Sunday at 18:00 once per date', () => {
  assert.equal(weeklyDue({ weekday: 0, hhmm: '18:00', date: '2026-10-25' }, null), true);
  assert.equal(weeklyDue({ weekday: 0, hhmm: '18:00', date: '2026-10-25' }, '2026-10-25'), false);
  assert.equal(weeklyDue({ weekday: 1, hhmm: '18:00', date: '2026-10-26' }, null), false);
  assert.equal(weeklyDue({ weekday: 0, hhmm: '17:59', date: '2026-10-25' }, null), false);
});

test('the global diet moves to the admin once, as a copy', () => {
  fs.writeFileSync(path.join(dir, 'diet.json'), JSON.stringify({ active: 'massa', plans: { massa: { label: 'Massa' } } }));
  fs.mkdirSync(path.join(dir, 'diet-pdfs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'diet-pdfs', 'massa.pdf'), 'pdf');
  assert.equal(jobs.migrateDiet('admin1'), true);
  assert.equal(jobs.migrateDiet('admin1'), false);
  assert.ok(fs.existsSync(path.join(dir, 'diet.json')));
  assert.equal(jobs.readDiet('admin1').plans.massa.label, 'Massa');
  assert.deepEqual(jobs.listFiles('admin1'), ['massa.pdf']);
  assert.equal(jobs.readDiet('someone-else'), null);
});

test('buildContext summarises progress with the user\'s names', () => {
  const c = buildContext({ ...real, exNames: { '0314': 'Panca inclinata' } }, '2026-10-22');
  const inc = c.esercizi.find(e => e.nome === 'Panca inclinata');
  assert.deepEqual([inc.inizio, inc.ora, inc.volte], [35, 40, 5]);
  assert.equal(c.ultimiAllenamenti.length, 10);
  assert.ok(c.seriePerMuscolo30g.length > 0);
});

test('a provider error reaches the user in Italian, without internals', async () => {
  reset();
  jobs._setAdapter({ async invoke() { return { code: 1, stderr: 'Error: ENOENT /app/node_modules/x' }; } });
  await assert.rejects(jobs.ask(UID, 'ciao'), e => e.code === 'provider' && !/ENOENT|\/app/.test(e.message) && /coach/.test(e.message));
  jobs._setAdapter(fake);
});

test('buildContext carries the coach profile (likes and dislikes)', () => {
  const c = buildContext({ ...real, coach: { profile: { goal: 'muscle', dislikes: 'squat, benchpress, stacchi' } } }, '2026-10-22');
  assert.equal(c.profilo.dislikes, 'squat, benchpress, stacchi');
});

test('clearChat empties one section and keeps the others and the memory', () => {
  const memory = jobs.readMemory(UID).length;
  const kinds = new Set(jobs.readChat(UID).map(m => m.kind));
  jobs.clearChat(UID, 'chat');
  assert.ok(!jobs.readChat(UID).some(m => m.kind === 'chat'));
  for (const k of kinds) if (k !== 'chat') assert.ok(jobs.readChat(UID).some(m => m.kind === k));
  assert.equal(jobs.readMemory(UID).length, memory);
});
