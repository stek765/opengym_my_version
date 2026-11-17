import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { EXDB } from '../lib/exercises.js'
import { displayName, lastSession, topOf, measureOf } from '../lib/training.js'
import { num } from '../lib/format.js'
import Thumb from './Thumb.jsx'
import { t } from '../lib/i18n.js'

// Recently done first (one tap adds with last weight); search over the user's names and the
// library; if nothing matches, create it from the typed text. The type chips browse the
// library without knowing a name (stretching, mobility...), for whoever builds the routine.
const TYPES = [['mob', 'Mobilità'], ['stretch', 'Stretching'], ['rin', 'Rinforzo'], ['atl', 'Atletico']]

function Picker({ S, onPick, onCreate, close }) {
  const [q, setQ] = useState('')
  const [ty, setTy] = useState(null)
  const seen = new Set(), recent = []
  for (const w of [...(S.workouts || [])].reverse())
    for (const e of w.entries || []) if (!('check' in e) && !seen.has(e.id)) { seen.add(e.id); recent.push(e.id) }
  const s = q.trim().toLowerCase()
  const pool = [...(S.customEx || []).filter(c => c.kind !== 'check'), ...EXDB]
  const hits = s ? pool.filter(e => displayName(S, e.id).toLowerCase().includes(s) || e.n.toLowerCase().includes(s)).slice(0, 40) : []
  const pick = id => { onPick(id); close() }
  const last = id => { const l = lastSession(S, id); return l ? num(topOf(l.sets, measureOf(S, id))) + (measureOf(S, id) === 'kg' ? ' kg' : '') : '' }
  return <div>
    <div className="eb">{t('Aggiungi esercizio')}</div>
    <input className="field" autoFocus placeholder={t('cerca o scrivi il nome…')} value={q} onChange={e => setQ(e.target.value)} />
    {!s && <div className="tys">{TYPES.map(([k, l]) => <button key={k} className={ty === k ? 'on' : ''} onClick={() => setTy(ty === k ? null : k)}>{t(l)}</button>)}</div>}
    {!s && ty && EXDB.filter(e => e.ty === ty).sort((a, b) => (a.n < b.n ? -1 : 1)).map(e => <button key={e.id} className="line" onClick={() => pick(e.id)}><Thumb id={e.id} size={44} /><span style={{ flex: 1 }}>{displayName(S, e.id)}</span></button>)}
    {!s && !ty && <><div className="eb" style={{ marginTop: 16 }}>{t('Fatti di recente')}</div>
      {recent.map(id => <button key={id} className="line" onClick={() => pick(id)}><span>{displayName(S, id)}</span><span className="r">{last(id)}</span></button>)}</>}
    {hits.map(e => <button key={e.id} className="line" onClick={() => pick(e.id)}><span>{displayName(S, e.id)}</span><span className="r">{last(e.id)}</span></button>)}
    {s && <button className="line" onClick={() => { onCreate(q.trim()); close() }}><span>{t('Crea «{0}»', q.trim())}</span><span className="r">+</span></button>}
  </div>
}

export const openPicker = props => useUI.getState().openSheet(close => <Picker {...props} close={close} />)
