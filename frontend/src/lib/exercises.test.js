import { describe, it, expect } from 'vitest'
import { EXDB, searchTerms, searchText, matchesTerms } from './exercises.js'

const find = q => { const g = searchTerms(q); return EXDB.filter(e => matchesTerms(g, searchText(e, e.n))) }

describe('Italian search', () => {
  it('finds the English library from Italian words', () => {
    expect(find('panca').some(e => e.n.includes('bench press'))).toBe(true)
    expect(find('lat machine').some(e => e.n.includes('pulldown'))).toBe(true)
    expect(find('spalle manubri').every(e => /dumbbell/.test(searchText(e, e.n)))).toBe(true)
    expect(find('stacco').length).toBeGreaterThan(0)
  })
  it('keeps plain English search working', () => expect(find('squat').length).toBeGreaterThan(5))
})

describe('word starts', () => {
  it('does not match inside words', () => {
    expect(find('rematore').some(e => /throw|narrow/.test(e.n) && !/\brow/.test(e.n))).toBe(false)
    expect(find('corsa').some(e => e.n.includes('crunch') && !/\brun/.test(e.n))).toBe(false)
  })
})
