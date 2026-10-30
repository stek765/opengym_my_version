// Two languages. Older components pass English text to t() and it.js translates it;
// newer views pass Italian text and en.js translates that. A missing key shows the text as is.
import it from '../locales/it.js'
import en from '../locales/en.js'

let lang = 'it'
// S.lang when chosen in Settings, otherwise the phone's language. Called by the shell on every render.
export const setLang = l => { lang = l || (navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en') }
export const getLang = () => lang
export const dateLocale = () => (lang === 'it' ? 'it-IT' : 'en-GB')

export function t(s, ...args) {
  let v = (lang === 'it' ? it : en)[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}

// Day and month names from the browser, so neither language needs a hand-written list.
const fmt = (iso, o) => new Date(iso + 'T12:00:00').toLocaleDateString(dateLocale(), o)
export const weekday = (iso, long = true) => fmt(iso, { weekday: long ? 'long' : 'short' })
export const monthName = (y, m) => new Date(y, m, 15).toLocaleDateString(dateLocale(), { month: 'long' })
// Monday-first single letters: L M M G V S D / M T W T F S S
export const weekLetters = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale(), { weekday: 'narrow' }))
