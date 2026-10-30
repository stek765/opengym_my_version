import { it as test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import it from '../locales/it.js'
import en from '../locales/en.js'
import { t, setLang, weekLetters } from './i18n.js'

// Every literal t('...') key must be either an English source (in it.js) or an Italian one (in en.js).
test('every t() string has a translation', () => {
  const keys = new Set()
  const walk = d => readdirSync(d).forEach(f => {
    const p = join(d, f)
    if (statSync(p).isDirectory()) { if (f !== 'locales') walk(p) }
    else if (/\.jsx?$/.test(f) && !/test|exercises-data/.test(f)) for (const m of readFileSync(p, 'utf8').matchAll(/\bt\((['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(m[2].replace(/\\'/g, "'"))
  })
  walk(join(__dirname, '..'))
  const missing = [...keys].filter(k => !(k in it) && !(k in en))
  expect(missing).toEqual([])
})

test('t follows the chosen language', () => {
  setLang('en'); expect(t('Fine allenamento')).toBe('Finish workout'); expect(t('Cancel')).toBe('Cancel'); expect(weekLetters()[0]).toBe('M')
  setLang('it'); expect(t('Fine allenamento')).toBe('Fine allenamento'); expect(t('Cancel')).toBe('Annulla'); expect(weekLetters()[3]).toBe('G')
})
