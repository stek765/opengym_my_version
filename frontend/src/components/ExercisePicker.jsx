import { useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { EXDB, searchTerms, searchText, matchesTerms } from '../lib/exercises.js'
import { displayName, lastSession, topOf, measureOf } from '../lib/training.js'
import { num } from '../lib/format.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Thumb from './Thumb.jsx'
import Icon from './Icon.jsx'
import ExerciseInfo from './ExerciseInfo.jsx'
import { t } from '../lib/i18n.js'

// Recently done first; search over the user's names and the library (Italian words too); the
// chips browse by body part or type without knowing a name. Only when nothing matches does the
// typed text become "Crea". multi: rows tick, one button at the bottom adds them all.
const TYPES = [['mob', 'Mobilità'], ['stretch', 'Stretching'], ['rin', 'Rinforzo'], ['atl', 'Atletico']]
// body parts in gym order, not alphabetical
const BPS = ['chest', 'back', 'shoulders', 'upper legs', 'upper arms', 'waist', 'lower legs', 'lower arms', 'cardio', 'neck']
const CHIPS = [...BPS.map(b => ['bp', b, b]), ...TYPES.map(([k, l]) => ['ty', k, l])]

// Tapping a row shows how it's done before adding it.
function Preview({ S, id, added, add, close }) {
  return <div className="-mx-5 max-h-[85vh] overflow-y-auto overscroll-contain px-5" data-nodrag>
    <ExerciseInfo S={S} id={id} />
    <div className="sticky bottom-0 bg-popover pb-1 pt-2">
      <Button size="lg" className="w-full" disabled={added} onClick={() => { close(); add() }}><Icon name="plus" />{added ? t('Già aggiunto') : t('Aggiungi')}</Button>
    </div>
  </div>
}

function Picker({ S, onPick, onPickMany, onCreate, multi, has = [], chip = null, close }) {
  const [q, setQ] = useState('')
  const [f, setF] = useState(chip)   // [field, value] of the selected chip; chip: the one it opens on
  const [sel, setSel] = useState([])
  const first = useRef(!!chip)   // bring the chip it opened on into view, once
  const seen = new Set(), recent = []
  for (const w of [...(S.workouts || [])].reverse())
    for (const e of w.entries || []) if (!('check' in e) && !seen.has(e.id)) { seen.add(e.id); recent.push(e.id) }
  const inF = e => !f || e[f[0]] === f[1]
  const g = q.trim() && searchTerms(q)
  let list = null
  if (g) {
    const name = new Map()
    list = [...(S.customEx || []).filter(c => c.kind !== 'check'), ...EXDB].filter(e => {
      if (!inF(e) || !matchesTerms(g, searchText(e, displayName(S, e.id)))) return false
      name.set(e.id, matchesTerms(g, searchText({ n: e.n }, displayName(S, e.id))))
      return true
    }).sort((a, b) => name.get(b.id) - name.get(a.id)).slice(0, 60)
  } else if (f) list = EXDB.filter(inF).sort((a, b) => (displayName(S, a.id) < displayName(S, b.id) ? -1 : 1))
  const inR = new Set(has)
  const pick = id => { onPick(id); close() }
  const create = () => { if (sel.length) onPickMany(sel); onCreate(q.trim()); close() }
  const last = id => { const l = lastSession(S, id); return l ? num(topOf(l.sets, measureOf(S, id))) + (measureOf(S, id) === 'kg' ? ' kg' : '') : '' }
  const toggle = id => setSel(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id])
  const peek = id => useUI.getState().openSheet(c => <Preview S={S} id={id} added={inR.has(id) || (multi && sel.includes(id))} add={() => multi ? toggle(id) : pick(id)} close={c} />)
  const row = id => {
    const on = inR.has(id) || sel.includes(id)
    // the row opens the preview; in multi mode the circle on the right still ticks it in one tap
    return <button key={id} disabled={inR.has(id)} onClick={() => peek(id)}
      className="group flex w-full items-center gap-3 text-left active:bg-foreground/5 disabled:opacity-50">
      <Thumb id={id} size={44} />
      <span className="flex min-h-[60px] flex-1 items-center gap-3 border-t border-border py-2 group-first:border-t-0">
        <span className="line-clamp-2 flex-1 text-[16px] leading-snug">{displayName(S, id)}</span>
        <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{last(id)}</span>
        {multi && <span onClick={e => { e.stopPropagation(); toggle(id) }} className="-m-3 shrink-0 p-3"><span className={'flex size-6 items-center justify-center rounded-full border-2 transition-colors ' + (on ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 text-transparent')}>
          <Icon name="check" size={14} strokeWidth={3} />
        </span></span>}
      </span>
    </button>
  }
  return <div className="flex h-[calc(90vh-var(--kb)-var(--sab)-50px)] flex-col">
    <div className="relative shrink-0">
      <Icon name="magnifier" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" autoFocus enterKeyHint="search" placeholder={t('cerca o scrivi il nome…')} value={q}
        onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
        className="h-10 rounded-xl border-0 bg-raised pl-9 text-[17px] md:text-[17px] focus-visible:border-transparent focus-visible:ring-0 dark:bg-raised" />
    </div>
    <div className="-mx-5 flex shrink-0 gap-1.5 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" data-nodrag>{CHIPS.map(([k, v, l]) => {
      const on = f?.[0] === k && f[1] === v
      return <Button key={k + v} ref={on && first.current ? el => { if (el) { first.current = false; el.scrollIntoView({ inline: 'center', block: 'nearest' }) } } : undefined} size="sm" variant={on ? 'default' : 'secondary'} aria-pressed={on}
        className={'h-8 rounded-full px-3 text-[14px]' + (k === 'ty' && v === 'mob' ? ' ml-3' : '')} onClick={() => setF(on ? null : [k, v])}>{t(l)}</Button>
    })}</div>
    <div className="-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border px-5 pb-4" data-nodrag>
      {!list && recent.length > 0 && <div className="px-1 pb-1 pt-4 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{t('Fatti di recente')}</div>}
      <div>{(list ? list.map(e => e.id) : recent).map(row)}</div>
      {g && !list.length && <button onClick={create}
        className="mt-3 flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 text-left text-[16px] font-medium text-tinta active:bg-foreground/5">
        <Icon name="plus" /><span className="flex-1 truncate">{t('Crea «{0}»', q.trim())}</span>
      </button>}
    </div>
    {multi && <div className="-mx-5 shrink-0 border-t border-border px-5 pt-3">
      <Button size="lg" className="w-full" disabled={!sel.length} onClick={() => { onPickMany(sel); close() }}><Icon name="plus" />{sel.length ? t('Aggiungi {0}', sel.length) : t('Aggiungi')}</Button>
    </div>}
  </div>
}

// openPicker({ S, onPick, onCreate }) picks one; add multi, has (ids already in) and onPickMany(ids) to pick several; chip: [field, value] to open filtered.
export const openPicker = props => useUI.getState().openSheet(close => <Picker {...props} close={close} />)
