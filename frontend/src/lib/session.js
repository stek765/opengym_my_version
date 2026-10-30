// The workout in progress (S.active). Pure: each function returns a new active session.
import { exOr } from './exercises.js'
import { startSets, applyIncrease } from './training.js'

const kindOf = (S, id) => ((S.customEx || []).find(e => e.id === id) || exOr(id)).kind
const clone = a => JSON.parse(JSON.stringify(a))
const withEntry = (a, id, fn) => {
  const out = clone(a)
  const e = out.entries.find(x => x.id === id)
  if (e) fn(e)
  return out
}
const entryFor = (S, ex) => kindOf(S, ex.id) === 'check'
  ? { id: ex.id, check: false, sets: [] }
  : { id: ex.id, sets: startSets(S, ex.id, ex) }

// The workout starts from the warm-up: an unticked check entry counts as "to do".
const pending = e => !e.skipped && ('check' in e ? !e.check : e.sets.some(s => !s.done))
export function nextOpen(a) {
  const e = a.entries.find(pending)
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
  const a = { routineId: routine?.id || null, name: routine?.name || 'Allenamento libero', start: now, entries: (routine?.ex || []).map(ex => entryFor(S, ex)), openId: null }
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

export function addEntry(S, a, id) {
  if (a.entries.some(e => e.id === id)) return a
  const out = clone(a)
  out.entries.push(entryFor(S, { id, sets: 3, reps: 10 }))
  out.openId = id
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
