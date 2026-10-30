import { it, expect } from 'vitest'
import real from './fixture-state.json'
import { migrateState } from './migrate.js'

const old = () => ({ ...JSON.parse(JSON.stringify(real)), week: { 1: 'r2' }, dayPlan: {}, effort: null, exWeights: { '0585': { w: 100 } }, active: { routineId: 'r1', entries: [] } })

it('migrateState keeps every workout, the active session and exWeights, and adds the new fields', () => {
  const m = migrateState(old())
  expect(m.workouts.length).toBe(12)
  expect(m.active).toEqual({ routineId: 'r1', entries: [] })
  expect(m.exWeights).toEqual({ '0585': { w: 100 } })
  expect(m).toMatchObject({ exNames: {}, incr: {}, muscles: {}, threshold: 10, schemaV: 2 })
})

it('migrateState is idempotent and keeps values already set', () => {
  const once = migrateState(old())
  expect(migrateState(once)).toEqual(once)
  expect(migrateState({ ...old(), threshold: 12, exNames: { a: 'b' } })).toMatchObject({ threshold: 12, exNames: { a: 'b' } })
})
