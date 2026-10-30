import { it, expect } from 'vitest'
import real from './fixture-state.json'
import { startSession, setValue, toggleSet, addSet, skipEntry, addEntry, answerOffer, nextOpen, settle, removeEntry, openEntry, removeSet } from './session.js'

const S = () => ({ exNames: {}, incr: {}, threshold: 10, muscles: {}, ...JSON.parse(JSON.stringify(real)), customEx: [{ id: 'c_riscaldamento', n: 'Riscaldamento', kind: 'check' }] })
const r1 = () => ({ id: 'r1', name: 'Gambe + Spalle', ex: [{ id: 'c_riscaldamento', sets: 1, reps: 0 }, { id: '0585', sets: 3, reps: 10 }, { id: '0739', sets: 3, reps: 8 }] })

it('startSession builds entries from last time, warm-up as a check, and starts from the warm-up', () => {
  const a = startSession(S(), r1(), 1000)
  expect(a).toMatchObject({ routineId: 'r1', name: 'Gambe + Spalle', start: 1000, openId: 'c_riscaldamento' })
  expect(a.entries[0]).toEqual({ id: 'c_riscaldamento', check: false, sets: [] })
  expect(a.entries[2].sets).toEqual([{ w: 80, r: 9, done: false }, { w: 80, r: 8, done: false }])
})

it('setValue "anche le serie dopo" changes the later sets that are not done yet, never done ones', () => {
  let a = startSession(S(), r1(), 0)
  a = toggleSet(a, '0585', 0)
  a = setValue(a, '0585', 1, 'w', 75, true)
  expect(a.entries[1].sets.map(s => s.w)).toEqual([70, 75, 75])
  a = setValue(a, '0585', 2, 'r', 8, false)
  expect(a.entries[1].sets.map(s => s.r)).toEqual([10, 10, 8])
})

it('toggleSet flips done; addSet copies the last set undone; skipEntry marks it skipped', () => {
  let a = startSession(S(), r1(), 0)
  a = toggleSet(a, '0739', 0)
  expect(a.entries[2].sets[0].done).toBe(true)
  a = addSet(a, '0739')
  expect(a.entries[2].sets[2]).toEqual({ w: 80, r: 8, done: false })
  a = skipEntry(a, '0739')
  expect(a.entries[2].skipped).toBe(true)
})

it('toggleSet on a check entry flips the check', () => {
  const a = toggleSet(startSession(S(), r1(), 0), 'c_riscaldamento')
  expect(a.entries[0].check).toBe(true)
})

it('answerOffer adds the increase to every undone set and records it; "no" only records', () => {
  let a = startSession(S(), r1(), 0)
  a = answerOffer(a, '0585', 2.5)
  expect(a.entries[1].sets.map(s => s.w)).toEqual([72.5, 72.5, 72.5])
  expect(a.entries[1].offer).toBe(2.5)
  const b = answerOffer(startSession(S(), r1(), 0), '0585', 0)
  expect(b.entries[1].sets.map(s => s.w)).toEqual([70, 70, 70])
  expect(b.entries[1].offer).toBe(0)
})

it('addEntry appends with last time\'s sets and opens it; adding twice does nothing', () => {
  let a = addEntry(S(), startSession(S(), r1(), 0), '0314')
  expect(a.entries.at(-1)).toEqual({ id: '0314', sets: [{ w: 40, r: 6, done: false }, { w: 35, r: 8, done: false }, { w: 35, r: 5, done: false }] })
  expect(a.openId).toBe('0314')
  expect(addEntry(S(), a, '0314').entries.length).toBe(a.entries.length)
})

it('nextOpen is the first entry not finished and not skipped; an unticked warm-up counts', () => {
  let a = startSession(S(), r1(), 0)
  expect(nextOpen(a)).toBe('c_riscaldamento')
  a = toggleSet(a, 'c_riscaldamento')
  for (const i of [0, 1, 2]) a = toggleSet(a, '0585', i)
  expect(nextOpen(a)).toBe('0739')
})

it('settle moves on once the warm-up is ticked, and leaves an open exercise alone', () => {
  let a = startSession(S(), r1(), 0)
  a = settle(toggleSet(a, 'c_riscaldamento'))
  expect(a.openId).toBe('0585')
  a = settle(toggleSet(a, '0585', 0))
  expect(a.openId).toBe('0585')
  expect(settle(skipEntry(a, '0585')).openId).toBe('0739')
})

it('openEntry remembers where he was, so a wrong tap can go back', () => {
  let a = settle(toggleSet(startSession(S(), r1(), 0), 'c_riscaldamento'))
  a = openEntry(a, '0739')
  expect(a).toMatchObject({ openId: '0739', prevId: '0585' })
})

it('removeSet drops the last set not done, never a ticked one or the only one', () => {
  let a = startSession(S(), r1(), 0)
  a = toggleSet(a, '0739', 1)
  a = removeSet(a, '0739')
  expect(a.entries[2].sets.map(s => s.done)).toEqual([true])
  expect(removeSet(a, '0739').entries[2].sets).toHaveLength(1)
})

it('removeEntry drops an exercise added by mistake', () => {
  const a = removeEntry(addEntry(S(), startSession(S(), r1(), 0), '0314'), '0314')
  expect(a.entries.some(e => e.id === '0314')).toBe(false)
  expect(a.openId).toBe('c_riscaldamento')
})

it('renameEntry swaps the id in place and keeps the ticked sets; into an existing entry it merges', async () => {
  const { renameEntry } = await import('./session.js')
  let a = startSession(S(), r1(), 0)
  a = addEntry(S(), a, 'c_new')
  a = toggleSet(a, 'c_new', 0)
  const b = renameEntry(a, 'c_new', '0326')
  expect(b.entries.at(-1).id).toBe('0326')
  expect(b.entries.at(-1).sets[0].done).toBe(true)
  const c = renameEntry(a, 'c_new', '0739')
  expect(c.entries.filter(e => e.id === '0739').length).toBe(1)
  expect(c.entries.find(e => e.id === '0739').sets.filter(x => x.done).length).toBe(1)
  expect(c.entries.some(e => e.id === 'c_new')).toBe(false)
  expect(renameEntry(a, 'c_new', 'c_new')).toBe(a)
})
