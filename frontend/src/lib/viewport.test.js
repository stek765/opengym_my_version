import { it, expect } from 'vitest'
import { screenGap } from './viewport.js'

it('screenGap is 0 when the page already starts below the status bar (nothing to correct)', () => {
  // opaque status bar: safe-area-inset-top is 0 and innerHeight is screen minus the bar, which is the whole usable area
  expect(screenGap({ standalone: true, screenH: 844, innerH: 797, safeTop: 0 })).toBe(0)
})
it('screenGap is the missing px only when the page is drawn under the status bar yet declared shorter', () => {
  expect(screenGap({ standalone: true, screenH: 844, innerH: 797, safeTop: 47 })).toBe(47)
})
it('screenGap is 0 in a browser tab, when equal, or when the difference is implausible', () => {
  expect(screenGap({ standalone: false, screenH: 844, innerH: 797, safeTop: 47 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 844, innerH: 844, safeTop: 47 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 844, innerH: 500, safeTop: 47 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 390, innerH: 400, safeTop: 47 })).toBe(0)
})
