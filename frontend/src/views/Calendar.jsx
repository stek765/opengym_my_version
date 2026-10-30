import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Back from '../components/Back.jsx'
import { useStore } from '../store/useStore.js'
import { workoutDelta, monthSummary, routineColor } from '../lib/training.js'
import { num, pct, todayISO } from '../lib/format.js'
import { t, weekday, monthName, weekLetters } from '../lib/i18n.js'

const GIORNO = d => weekday(d, false) + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7)
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export default function Calendar() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const now = new Date()
  const [ym, setYm] = useState([now.getFullYear(), now.getMonth()])
  const [y, m] = ym
  const go = d => setSel(null) || setYm(([yy, mm]) => { const t = new Date(yy, mm + d, 1); return [t.getFullYear(), t.getMonth()] })
  const lead = (new Date(y, m, 1).getDay() + 6) % 7          // Monday first
  const days = new Date(y, m + 1, 0).getDate()
  const today = todayISO()
  const byDay = {}
  for (const w of S.workouts || []) (byDay[w.d] = byDay[w.d] || []).push(w)
  const sum = monthSummary(S, y, m)
  const [sel, setSel] = useState(null)   // the tapped day: its routine shows under the calendar, no new screen
  const nameOf = w => S.routines.find(r => r.id === w.routineId)?.name || w.name
  const monthWs = (S.workouts || []).filter(w => w.d.startsWith(iso(y, m, 1).slice(0, 7)))
  const legend = S.routines.filter(r => monthWs.some(w => w.routineId === r.id))
  const other = monthWs.some(w => !routineColor(S, w.routineId))
  const picked = sel && byDay[sel]

  return <div className="narrow">
    <Back label={t('Allenati')} onClick={() => nav('/allenati')} />
    <h1>{t('Storico allenamenti')}</h1>
    <div className="row between" style={{ margin: '2px 0 12px' }}>
      <button className="mu" onClick={() => go(-1)}>‹</button>
      <b style={{ fontSize: 20, textTransform: 'capitalize' }}>{monthName(y, m)} {y !== now.getFullYear() ? y : ''}</b>
      <button className="mu" onClick={() => go(1)}>›</button>
    </div>
    <div className="cal">
      {weekLetters().map((d, i) => <div key={i} className="h">{d}</div>)}
      {Array.from({ length: lead }, (_, i) => <div key={'e' + i} />)}
      {Array.from({ length: days }, (_, i) => {
        const d = iso(y, m, i + 1), list = byDay[d]
        const delta = list ? workoutDelta(S, list[list.length - 1].id) : null
        const c = list && (routineColor(S, list[list.length - 1].routineId) || 'var(--s2)')
        return <button key={d} className={'d' + (list ? ' w' : '') + (d === today ? ' today' : '') + (d === sel ? ' sel' : '')} disabled={!list} onClick={() => setSel(d === sel ? null : d)}>
          <span style={c ? { background: c, color: routineColor(S, list[list.length - 1].routineId) ? '#1a1a1a' : undefined } : undefined}>{i + 1}</span>
          {list && delta != null && <i className={delta > 0 ? 'up' : delta < 0 ? 'dn' : 'mu'}>{pct(Math.round(delta))}</i>}
        </button>
      })}
    </div>
    {picked && <div className="picked">{picked.map(w => <div key={w.id}><i style={{ background: routineColor(S, w.routineId) || 'var(--s2)' }} /><b>{nameOf(w)}</b><span className="mu">{GIORNO(sel)}</span></div>)}</div>}
    {(legend.length > 0 || other) && <div className="legend">
      {legend.map(r => <span key={r.id}><i style={{ background: routineColor(S, r.id) }} />{r.name}</span>)}
      {other && <span><i style={{ background: 'var(--s2)' }} />{t('Altro')}</span>}
    </div>}
    <div className="sum">
      <div>{t('allenamenti')}<b>{sum.count}</b></div>
      <div>{t('media')}<b className={sum.meanDelta > 0 ? 'up' : sum.meanDelta < 0 ? 'dn' : ''}>{sum.meanDelta == null ? '—' : pct(sum.meanDelta)}</b></div>
      <div>{t('peso')}<b>{sum.lastWeight ? num(sum.lastWeight) : '—'}</b></div>
    </div>
  </div>
}
