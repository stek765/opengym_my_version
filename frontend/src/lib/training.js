// Training logic over the state S. Pure: every view reads from here, nothing here touches the store.
import { exOr } from './exercises.js'
import { todayISO, uid } from './format.js'

const done = sets => (sets || []).filter(s => s.done)
const round1 = n => Math.round(n * 10) / 10

// Custom exercises live in S.customEx; looking there first keeps this pure (no registry needed).
const exOf = (S, id) => (S.customEx || []).find(e => e.id === id) || exOr(id)

export const displayName = (S, id) => S.exNames?.[id] || exOf(S, id).n

// Every session of one exercise, oldest first, with only the ticked sets.
function sessionsOf(S, id) {
  const out = []
  for (const w of S.workouts || []) {
    for (const e of w.entries || []) {
      if (e.id !== id) continue
      const sets = done(e.sets).map(s => ({ w: s.w, r: s.r, sec: s.sec }))
      if (sets.length) out.push({ d: w.d, sets })
    }
  }
  return out
}

export function lastSession(S, id) {
  const all = sessionsOf(S, id)
  return all.length ? all[all.length - 1] : null
}

export function measureOf(S, id) {
  const ex = exOf(S, id)
  if (ex.kind === 'check') return 'check'
  if (ex.kind === 'time') return 'sec'
  const last = lastSession(S, id)
  if (!last) return ex.eq === 'body weight' ? 'reps' : 'kg'
  return last.sets.some(s => s.w > 0) ? 'kg' : 'reps'
}

export function startSets(S, id, routineEx) {
  const last = lastSession(S, id)
  if (last) return last.sets.map(s => ({ w: s.w ?? null, r: s.r, done: false }))
  return Array.from({ length: routineEx?.sets || 3 }, () => ({ w: null, r: routineEx?.reps ?? 10, done: false }))
}

export function increaseOffer(S, id) {
  if (measureOf(S, id) !== 'kg') return null
  const last = lastSession(S, id)
  if (!last || !last.sets.every(s => (s.r || 0) >= (S.threshold ?? 10))) return null
  return { last: last.sets.map(s => ({ w: s.w, r: s.r })), preferred: S.incr?.[id] ?? 2.5 }
}

export const applyIncrease = (sets, inc) => sets.map(s => ({ ...s, w: round1((s.w || 0) + inc) }))

export function topOf(sets, measure) {
  const f = measure === 'reps' ? 'r' : measure === 'sec' ? 'sec' : 'w'
  return Math.max(0, ...sets.map(s => s[f] || 0))
}

export function finishSession(active) {
  const entries = []
  for (const e of active.entries || []) {
    if ('check' in e) { if (e.check) entries.push({ id: e.id, check: true, sets: [] }); continue }
    const sets = done(e.sets)
    if (sets.length) entries.push({ ...e, sets })
  }
  return { id: uid(), d: todayISO(), routineId: active.routineId || null, name: active.name, start: active.start, end: Date.now(), entries }
}

export function exerciseRows(S) {
  const ids = new Set()
  for (const w of S.workouts || []) for (const e of w.entries || []) if (!('check' in e)) ids.add(e.id)
  const rows = []
  for (const id of ids) {
    const all = sessionsOf(S, id)
    if (!all.length) continue
    const measure = measureOf(S, id)
    const first = topOf(all[0].sets, measure), now = topOf(all[all.length - 1].sets, measure)
    rows.push({
      id, name: displayName(S, id), muscle: muscleOf(S, id), first, now, measure, count: all.length,
      deltaPct: first ? Math.round((now - first) / first * 100) : null
    })
  }
  return rows.sort((a, b) => b.count - a.count)
}

export const exerciseHistory = (S, id, fromISO = '') =>
  sessionsOf(S, id).filter(s => s.d >= fromISO).reverse()

// Average change of each exercise's top value against the previous workout of the same routine.
export function workoutDelta(S, workoutId) {
  const ws = S.workouts || []
  const i = ws.findIndex(w => w.id === workoutId)
  if (i < 0) return null
  const w = ws[i]
  let prev = null
  for (let j = i - 1; j >= 0; j--) if (ws[j].routineId && ws[j].routineId === w.routineId) { prev = ws[j]; break }
  if (!prev) return null
  const sets = x => Object.fromEntries((x.entries || []).filter(e => !('check' in e)).map(e => [e.id, done(e.sets)]))
  const a = sets(w), b = sets(prev)
  // Same measure on both sides: kg if both had weight, reps if neither did; a dip that gained
  // a plate is not comparable this time.
  const ch = []
  for (const id of Object.keys(a)) {
    if (!b[id]?.length || !a[id].length) continue
    const kgA = a[id].some(s => s.w > 0), kgB = b[id].some(s => s.w > 0)
    if (kgA !== kgB) continue
    const m = kgA ? 'kg' : 'reps', x = topOf(a[id], m), y = topOf(b[id], m)
    if (x && y) ch.push((x - y) / y)
  }
  return ch.length ? round1(ch.reduce((x, y) => x + y, 0) / ch.length * 100) : null
}

export function monthSummary(S, year, month0) {
  const prefix = `${year}-${String(month0 + 1).padStart(2, '0')}`
  const ws = (S.workouts || []).filter(w => w.d.startsWith(prefix))
  const deltas = ws.map(w => workoutDelta(S, w.id)).filter(x => x != null)
  const bw = (S.bodyweight || []).filter(b => b.d.startsWith(prefix))
  return {
    count: ws.length,
    meanDelta: deltas.length ? round1(deltas.reduce((x, y) => x + y, 0) / deltas.length) : null,
    lastWeight: bw.length ? bw[bw.length - 1].w : null
  }
}

const muscleOf = (S, id) => S.muscles?.[id] || exOf(S, id).tg || exOf(S, id).bp || ''

export function setsPerMuscle(S, today, days = 30) {
  const from = new Date(new Date(today + 'T12:00:00').getTime() - days * 864e5).toISOString().slice(0, 10)
  const c = {}
  for (const w of S.workouts || []) {
    if (w.d < from || w.d > today) continue
    for (const e of w.entries || []) {
      const n = done(e.sets).length
      if (!n) continue
      const m = muscleOf(S, e.id)
      if (m) c[m] = (c[m] || 0) + n
    }
  }
  return Object.entries(c).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets)
}

export function suggestedRoutine(S) {
  const last = id => (S.workouts || []).reduce((d, w) => (w.routineId === id && w.d > d ? w.d : d), '')
  let best = null
  for (const r of S.routines || []) if (!best || last(r.id) < last(best.id)) best = r
  return best
}

// One colour per routine (by position), shared by the calendar, its legend and the week strip.
const ROUTINE_COLORS = ['#c4b5fd', '#fde68a', '#f9a8d4', '#a5f3fc', '#bbf7d0']
export function routineColor(S, id) {
  const i = (S.routines || []).findIndex(r => r.id === id)
  return i < 0 ? null : ROUTINE_COLORS[i % ROUTINE_COLORS.length]
}

// One weight per day: logging again the same day replaces it. Oldest first.
export const withWeight = (list, w, d, t = Date.now()) =>
  [...(list || []).filter(b => b.d !== d), { d, w, t }].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))
