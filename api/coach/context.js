/* What the coach reads about one person's training: a compact summary, not the raw state.
 * Mirrors the progress maths of frontend/src/lib/training.js (top weight, or reps for
 * bodyweight work) — small enough that duplicating beats sharing across the two runtimes. */
import { createRequire } from 'node:module';

const LIB = new Map(createRequire(import.meta.url)('./library.json').exercises.map(e => [e.id, e]));

const exOf = (S, id) => (S.customEx || []).find(e => e.id === id) || LIB.get(id) || { n: id };
export const nameOf = (S, id) => S.exNames?.[id] || exOf(S, id).n;
const muscleOf = (S, id) => S.muscles?.[id] || exOf(S, id).tg || exOf(S, id).bp || '';
const done = sets => (sets || []).filter(s => s.done);

function sessions(S, id) {
  const out = [];
  for (const w of S.workouts || []) for (const e of w.entries || []) {
    if (e.id !== id) continue;
    const sets = done(e.sets);
    if (sets.length) out.push({ d: w.d, sets });
  }
  return out;
}
const isKg = sets => sets.some(s => s.w > 0);
const top = sets => (isKg(sets) ? Math.max(...sets.map(s => s.w || 0)) : Math.max(...sets.map(s => s.r || 0)));
const fmtSets = sets => sets.map(s => (isKg(sets) ? `${s.w}×${s.r}` : `${s.r}`)).join(', ');

export function buildContext(S, today) {
  const ids = new Set();
  for (const w of S.workouts || []) for (const e of w.entries || []) if (!('check' in e)) ids.add(e.id);
  const esercizi = [...ids].map(id => {
    const all = sessions(S, id);
    if (!all.length) return null;
    const last = all[all.length - 1];
    return {
      nome: nameOf(S, id), muscolo: muscoloIt(muscleOf(S, id)), misura: isKg(last.sets) ? 'kg' : 'ripetizioni',
      inizio: top(all[0].sets), ora: top(last.sets), volte: all.length, ultimaVolta: `${last.d}: ${fmtSets(last.sets)}`
    };
  }).filter(Boolean);

  const from = new Date(new Date(today + 'T12:00:00').getTime() - 30 * 864e5).toISOString().slice(0, 10);
  const perM = {};
  for (const w of S.workouts || []) {
    if (w.d < from || w.d > today) continue;
    for (const e of w.entries || []) { const n = done(e.sets).length; const m = muscleOf(S, e.id); if (n && m) perM[m] = (perM[m] || 0) + n; }
  }

  return {
    oggi: today,
    profilo: S.coach?.profile || null,
    schede: (S.routines || []).map(r => ({ nome: r.name, esercizi: (r.ex || []).map(e => `${nameOf(S, e.id)} ${e.sets}×${e.reps}`) })),
    esercizi,
    ultimiAllenamenti: (S.workouts || []).slice(-10).map(w => ({
      data: w.d, scheda: w.name, minuti: w.end && w.start ? Math.round((w.end - w.start) / 60000) : null,
      esercizi: (w.entries || []).map(e => ('check' in e ? nameOf(S, e.id) + ' ✓' : `${nameOf(S, e.id)}: ${fmtSets(done(e.sets))}`))
    })),
    pesoCorporeo: (S.bodyweight || []).slice(-20).map(b => `${b.d}: ${b.w}`),
    seriePerMuscolo30g: Object.entries(perM).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${muscoloIt(m)}: ${n}`)
  };
}

const IT = { pectorals: 'pettorali', biceps: 'bicipiti', triceps: 'tricipiti', delts: 'deltoidi', lats: 'dorsali', 'upper back': 'parte alta della schiena', quads: 'quadricipiti', hamstrings: 'femorali', glutes: 'glutei', abs: 'addominali', calves: 'polpacci', forearms: 'avambracci', traps: 'trapezi', waist: 'addominali' };
const muscoloIt = m => IT[m] || m;
