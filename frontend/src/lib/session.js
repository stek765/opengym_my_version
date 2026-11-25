// The workout in progress (S.active). Pure: each function returns a new active session.
import { exOr } from './exercises.js'
import { startSets, applyIncrease, byPhase } from './training.js'

const kindOf = (S, id) => ((S.customEx || []).find(e => e.id === id) || exOr(id)).kind
const clone = a => JSON.parse(JSON.stringify(a))
const withEntry = (a, id, fn) => {
  const out = clone(a)
  const e = out.entries.find(x => x.id === id)
  if (e) fn(e)
  return out
}
const entryFor = (S, ex, ph = 'forza') => kindOf(S, ex.id) === 'check'
  ? { id: ex.id, ph, check: false, sets: [] }
  : { id: ex.id, ph, sets: startSets(S, ex.id, ex) }

// The workout starts from the warm-up: an unticked check entry counts as "to do".
const pending = e => !e.skipped && ('check' in e ? !e.check : e.sets.some(s => !s.done))
// from: start looking after that entry (wrapping), so "next" means the one below it.
export function nextOpen(a, from) {
  const i = a.entries.findIndex(x => x.id === from) + 1
  const e = [...a.entries.slice(i), ...a.entries.slice(0, i)].find(pending)
  return e ? e.id : null
}

// After any change: a ticked warm-up or a skipped/removed exercise hands over to the next one.
export function settle(a) {
  const e = a.entries.find(x => x.id === a.openId)
  return !e || e.skipped || ('check' in e && e.check) ? { ...a, openId: nextOpen(a) } : a
}

export const openEntry = (a, id) => (id === a.openId ? a : { ...a, openId: id, prevId: a.openId })

export function removeEntry(a, id) {
  const out = { ...a, entries: a.entries.filter(e => e.id !== id) }
  if (out.prevId === id) out.prevId = null
  return settle(out)
}

export function startSession(S, routine, now = Date.now()) {
  const a = { routineId: routine?.id || null, name: routine?.name || 'Allenamento libero', start: now, entries: byPhase(S, routine).flatMap(([ph, xs]) => xs.map(ex => entryFor(S, ex, ph))), openId: null }
  a.openId = nextOpen(a)
  return a
}

// alsoLater: the same value goes to the later sets that are not done yet.
export const setValue = (a, id, i, field, v, alsoLater) => withEntry(a, id, e => {
  e.sets.forEach((s, j) => { if (j === i || (alsoLater && j > i && !s.done)) s[field] = v })
})

export const toggleSet = (a, id, i) => withEntry(a, id, e => {
  if ('check' in e) e.check = !e.check
  else e.sets[i].done = !e.sets[i].done
})

export const addSet = (a, id) => withEntry(a, id, e => {
  const l = e.sets[e.sets.length - 1] || { w: null, r: 10 }
  e.sets.push({ w: l.w, r: l.r, done: false })
})

// Drops the last set not done yet: a ticked set is a logged one and stays.
export const removeSet = (a, id) => withEntry(a, id, e => {
  const i = e.sets.findLastIndex(s => !s.done)
  if (i >= 0 && e.sets.length > 1) e.sets.splice(i, 1)
})

export const skipEntry = (a, id) => withEntry(a, id, e => { e.skipped = !e.skipped })

// inc 0 = "no": remembered so the question is not asked again in this session.
export const answerOffer = (a, id, inc) => withEntry(a, id, e => {
  if (inc) {
    const up = applyIncrease(e.sets, inc)
    e.sets = e.sets.map((s, j) => (s.done ? s : up[j]))
  }
  e.offer = inc
})

// ph: the phase on screen. It goes after that phase's last exercise, so the day keeps its order.
export function addEntry(S, a, id, ph = 'forza') {
  if (a.entries.some(e => e.id === id)) return a
  const out = clone(a)
  const i = out.entries.findLastIndex(e => e.ph === ph)
  out.entries.splice(i < 0 ? out.entries.length : i + 1, 0, entryFor(S, { id, sets: 3, reps: 10 }, ph))
  out.openId = id
  return out
}

// "Cambia": the new exercise takes the old one's place in the list. Ticked sets are logged
// work, so an entry with some keeps them and the new one goes right after it.
export function replaceEntry(S, a, from, to) {
  if (a.entries.some(e => e.id === to)) return openEntry(a, to)
  const out = clone(a)
  const i = out.entries.findIndex(e => e.id === from)
  if (i < 0) return a
  const old = out.entries[i]
  const kept = old.sets?.some(s => s.done) ? [{ ...old, sets: old.sets.filter(s => s.done) }] : []
  out.entries.splice(i, 1, ...kept, entryFor(S, { id: to, sets: 3, reps: 10 }, old.ph))
  if (out.prevId === from && !kept.length) out.prevId = null
  out.openId = to
  return out
}

// The coach said a typed exercise is one he already has: keep the sets, change the id.
// If that exercise is already in the session, the ticked sets join it instead.
export function renameEntry(a, from, to) {
  if (from === to || !a.entries.some(e => e.id === from)) return a
  const out = clone(a)
  const src = out.entries.find(e => e.id === from)
  const dst = out.entries.find(e => e.id === to)
  if (dst) {
    dst.sets = [...dst.sets.filter(s => s.done), ...src.sets.filter(s => s.done), ...dst.sets.filter(s => !s.done)]
    out.entries = out.entries.filter(e => e !== src)
  } else src.id = to
  if (out.openId === from) out.openId = to
  return out
}
