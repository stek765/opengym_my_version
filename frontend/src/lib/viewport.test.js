import { it, expect } from 'vitest'
import { screenGap } from './viewport.js'

it('screenGap is the px iOS leaves undrawn at the bottom of an installed app drawn under the clock', () => {
  expect(screenGap({ standalone: true, screenH: 844, innerH: 797 })).toBe(47)
})
it('screenGap is 0 in a browser tab, when equal, or when the difference is implausible', () => {
  expect(screenGap({ standalone: false, screenH: 844, innerH: 797 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 844, innerH: 844 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 844, innerH: 500 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 390, innerH: 400 })).toBe(0)
})
