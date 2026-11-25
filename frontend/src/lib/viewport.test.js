import { it, expect } from 'vitest'
import { screenGap } from './viewport.js'

it('a band is left undrawn only by an installed app drawn under the clock', () => {
  expect(screenGap({ standalone: true, screenH: 844, innerH: 797, sat: 47 })).toBe(47)
})
it('no band with the opaque status bar, in a browser tab, or for implausible values', () => {
  expect(screenGap({ standalone: true, screenH: 844, innerH: 797, sat: 0 })).toBe(0)
  expect(screenGap({ standalone: false, screenH: 844, innerH: 797, sat: 47 })).toBe(0)
  expect(screenGap({ standalone: true, screenH: 844, innerH: 500, sat: 47 })).toBe(0)
})
