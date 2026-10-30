import { describe, it, expect } from 'vitest'
import real from './fixture-state.json'
import {
  displayName, lastSession, measureOf, startSets, increaseOffer, applyIncrease, topOf,
  finishSession, exerciseRows, exerciseHistory, workoutDelta, monthSummary, setsPerMuscle, suggestedRoutine, routineColor, withWeight
} from './training.js'

const S = (extra = {}) => ({ exNames: {}, incr: {}, threshold: 10, muscles: {}, customEx: [], ...JSON.parse(JSON.stringify(real)), ...extra })
const W = (id, d, routineId, entries) => ({ id, d, routineId, name: 'x', start: 0, end: 1, entries })
const set = (w, r, done = true) => ({ w, r, done })

describe('sample data (3/09 → 21/10)', () => {
  it('exerciseRows: incline press 35 → 40, +14%, 5 times; leg press 90 → 80, −11%', () => {
    const rows = exerciseRows(S())
    const inc = rows.find(r => r.id === '0314')
    expect(inc).toMatchObject({ first: 35, now: 40, deltaPct: 14, count: 5, measure: 'kg' })
    expect(rows.find(r => r.id === '0739')).toMatchObject({ first: 90, now: 80, deltaPct: -11 })
  })
  it('workoutDelta compares with the previous workout of the same routine', () => {
    const s = S()
    expect(workoutDelta(s, 'muyawizsi339x')).toBe(11.1)   // 07/10
    expect(workoutDelta(s, 'muvhbnwgz3ypr')).toBe(-16.4)  // 05/10, push-ups counted in reps
    expect(workoutDelta(s, 'mviafeninj745')).toBe(4.8)    // 21/10
    expect(workoutDelta(s, 'mu5y9ovru8wzd')).toBe(null)   // 17/09, first Petto
  })
  it('monthSummary October 2026: 7 workouts, mean +2.8%', () => {
    expect(monthSummary(S(), 2026, 9)).toMatchObject({ count: 7, meanDelta: 2.8 })
  })
  it('measureOf: push-ups are reps, incline press is kg', () => {
    expect(measureOf(S(), '0259')).toBe('reps')
    expect(measureOf(S(), '0314')).toBe('kg')
  })
  it('startSets copies last time: leg press 80×9, 80×8 even if the routine says 3 sets', () => {
    expect(startSets(S(), '0739', { id: '0739', sets: 3, reps: 8 })).toEqual([
      { w: 80, r: 9, done: false }, { w: 80, r: 8, done: false }
    ])
  })
  it('increaseOffer: leg extension 70×10,10,10 asks; leg press 80×9,8 and push-ups do not', () => {
    expect(increaseOffer(S(), '0585')).toMatchObject({ preferred: 2.5 })
    expect(increaseOffer(S(), '0739')).toBe(null)
    expect(increaseOffer(S(), '0259')).toBe(null)
    expect(increaseOffer(S({ incr: { '0585': 5 } }), '0585')).toMatchObject({ preferred: 5 })
  })
  it('suggestedRoutine is the one not done for longest (dorso, 16/10)', () => {
    expect(suggestedRoutine(S()).id).toBe('muo9kmi8xyd9k')
  })
})

describe('edge cases', () => {
  it('a never-done exercise starts from the routine, with no weight', () => {
    expect(startSets(S(), '9999', { id: '9999', sets: 3, reps: 8 })).toEqual([
      { w: null, r: 8, done: false }, { w: null, r: 8, done: false }, { w: null, r: 8, done: false }
    ])
    expect(increaseOffer(S(), '9999')).toBe(null)
    expect(lastSession(S(), '9999')).toBe(null)
  })
  it('a bodyweight exercise once done with 12.5 kg is reps if the last session was at 0', () => {
    const s = S({ workouts: [
      W('a', '2026-10-01', 'r', [{ id: 'd', sets: [set(12.5, 6)] }]),
      W('b', '2026-10-08', 'r', [{ id: 'd', sets: [set(0, 8), set(0, 7)] }])
    ] })
    expect(measureOf(s, 'd')).toBe('reps')
  })
  it('a check exercise (warm-up) measures as check', () => {
    expect(measureOf(S({ customEx: [{ id: 'c_riscaldamento', n: 'Riscaldamento', kind: 'check' }] }), 'c_riscaldamento')).toBe('check')
  })
  it('lastSession ignores unticked sets and sessions with none ticked', () => {
    const s = S({ workouts: [
      W('a', '2026-10-01', 'r', [{ id: 'e', sets: [set(50, 10), set(50, 9, false)] }]),
      W('b', '2026-10-08', 'r', [{ id: 'e', sets: [set(55, 8, false)] }])
    ] })
    expect(lastSession(s, 'e')).toEqual({ d: '2026-10-01', sets: [{ w: 50, r: 10, sec: undefined }] })
  })
  it('finishSession drops unticked sets, empty entries and unticked checks', () => {
    const w = finishSession({ routineId: 'r', name: 'x', start: 1, entries: [
      { id: 'a', sets: [set(50, 10), set(50, 9, false)] },
      { id: 'b', sets: [set(20, 10, false)] },
      { id: 'c_riscaldamento', check: true, sets: [] },
      { id: 'c_x', check: false, sets: [] }
    ] })
    expect(w.entries.map(e => e.id)).toEqual(['a', 'c_riscaldamento'])
    expect(w.entries[0].sets).toEqual([set(50, 10)])
    expect(w.id).toBeTruthy()
    expect(w.d).toMatch(/^\d{4}-\d\d-\d\d$/)
  })
  it('applyIncrease adds to every weight; topOf picks by measure', () => {
    expect(applyIncrease([set(70, 10, false), set(70, 10, false)], 2.5).map(s => s.w)).toEqual([72.5, 72.5])
    expect(topOf([{ w: 40, r: 6 }, { w: 35, r: 8 }], 'kg')).toBe(40)
    expect(topOf([{ w: 0, r: 10 }, { w: 0, r: 8 }], 'reps')).toBe(10)
  })
  it('displayName prefers the user\'s own name', () => {
    expect(displayName(S({ exNames: { '0571': 'Chopper' } }), '0571')).toBe('Chopper')
    expect(displayName(S(), '0577')).toBe('lever chest press')
  })
  it('exerciseHistory is newest first and cut at fromISO', () => {
    const h = exerciseHistory(S(), '0314', '2026-10-01')
    expect(h.map(x => x.d)).toEqual(['2026-10-19', '2026-10-12', '2026-10-07'])
  })
  it('setsPerMuscle counts ticked sets in the last 30 days, own tag first', () => {
    const s = S({ muscles: { c_x: 'spalle' }, workouts: [
      W('a', '2026-10-20', 'r', [{ id: 'c_x', sets: [set(5, 10), set(5, 10)] }, { id: '0314', sets: [set(30, 8)] }]),
      W('b', '2026-08-01', 'r', [{ id: 'c_x', sets: [set(5, 10)] }])
    ] })
    expect(setsPerMuscle(s, '2026-10-22')).toEqual([{ muscle: 'spalle', sets: 2 }, { muscle: 'pectorals', sets: 1 }])
  })
  it('workoutDelta is null when nothing is in common', () => {
    const s = S({ workouts: [
      W('a', '2026-10-01', 'r', [{ id: 'x', sets: [set(10, 10)] }]),
      W('b', '2026-10-08', 'r', [{ id: 'y', sets: [set(10, 10)] }])
    ] })
    expect(workoutDelta(s, 'b')).toBe(null)
  })
})

describe('review fixes', () => {
  it('workoutDelta uses one measure per exercise: dip 0×8 then 12.5×8 is not +56%', () => {
    const s = S({ workouts: [
      W('a', '2026-10-01', 'r', [{ id: 'd', sets: [set(0, 8)] }, { id: 'e', sets: [set(50, 10)] }]),
      W('b', '2026-10-08', 'r', [{ id: 'd', sets: [set(12.5, 8)] }, { id: 'e', sets: [set(55, 10)] }])
    ] })
    expect(workoutDelta(s, 'b')).toBe(10)   // only e (50 → 55) is comparable
  })
})

describe('routineColor', () => {
  it('gives each routine its own colour, in routine order, and none to a deleted one', () => {
    const s = { routines: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }
    const cs = ['a', 'b', 'c'].map(id => routineColor(s, id))
    expect(new Set(cs).size).toBe(3)
    expect(routineColor(s, 'gone')).toBe(null)
  })
})

describe('withWeight', () => {
  it('adds today\'s weight, keeps the list in date order, and replaces a weight already logged that day', () => {
    const list = [{ d: '2026-10-20', w: 74.5, t: 1 }, { d: '2026-10-22', w: 75, t: 2 }]
    const a = withWeight(list, 75.4, '2026-10-23', 9)
    expect(a.map(b => b.d)).toEqual(['2026-10-20', '2026-10-22', '2026-10-23'])
    expect(a.at(-1)).toEqual({ d: '2026-10-23', w: 75.4, t: 9 })
    const b = withWeight(a, 75.2, '2026-10-23', 10)
    expect(b.filter(x => x.d === '2026-10-23')).toEqual([{ d: '2026-10-23', w: 75.2, t: 10 }])
    expect(list.length).toBe(2)   // the input is not mutated
  })
})
