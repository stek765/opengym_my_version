import { it, expect } from 'vitest'
import { bundleOf, shouldReload } from './update.js'

const page = js => `<!doctype html><html><head><script type="module" crossorigin src="/assets/${js}"></script></head><body></body></html>`

it('bundleOf finds the hashed script name in the served page', () => {
  expect(bundleOf(page('index-2H4ByEWr.js'))).toBe('index-2H4ByEWr.js')
  expect(bundleOf('<html>nothing here</html>')).toBe(null)
})

it('shouldReload only when the served bundle differs from the running one, and never in a workout', () => {
  expect(shouldReload({ running: 'index-A.js', served: 'index-B.js', inWorkout: false })).toBe(true)
  expect(shouldReload({ running: 'index-A.js', served: 'index-A.js', inWorkout: false })).toBe(false)
  expect(shouldReload({ running: 'index-A.js', served: 'index-B.js', inWorkout: true })).toBe(false)
  expect(shouldReload({ running: null, served: 'index-B.js', inWorkout: false })).toBe(false)   // dev server: no hashed bundle
  expect(shouldReload({ running: 'index-A.js', served: null, inWorkout: false })).toBe(false)   // offline / odd answer
})
