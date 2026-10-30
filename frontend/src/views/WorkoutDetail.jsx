import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { displayName, measureOf, workoutDelta } from '../lib/training.js'
import { ddmm, num, pct } from '../lib/format.js'
import Back from '../components/Back.jsx'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import { t, weekday } from '../lib/i18n.js'

const dayName = d => { const w = weekday(d); return w[0].toUpperCase() + w.slice(1) + ' ' + ddmm(d) }

// One line per exercise: what he lifted, not the full table (that lives in Progressi).
function sets(S, e) {
  const d = e.sets.filter(s => s.done)
  if (!d.length) return ''
  if (measureOf(S, e.id) !== 'kg') return d.map(s => s.r).join(' · ') + ' ' + t('rip')
  const ws = [...new Set(d.map(s => s.w))]
  return ws.length === 1 ? `${num(ws[0])} kg × ${d.map(s => s.r).join(' · ')}` : d.map(s => `${num(s.w)}×${s.r}`).join(' · ')
}

export default function WorkoutDetail() {
  const nav = useNavigate()
  const state = useLocation().state
  const { workoutId } = useParams()
  const S = useStore(s => s.S)
  const ws = S.workouts || []
  const back = state?.back && !state.fromCal
    ? <Back label={t('Allenati')} onClick={() => nav(state.back)} />
    : <Back label={t('Storico')} onClick={() => nav('/storico', { state: state?.back ? { back: state.back } : null })} />

  // Two workouts on the same day: list them first.
  if (workoutId.startsWith('giorno-')) {
    const d = workoutId.slice(7)
    return <div className="narrow">{back}<h1>{dayName(d)}</h1>
      {ws.filter(w => w.d === d).map(w => <button key={w.id} className="line" onClick={() => nav('/storico/' + w.id, { state })}><span>{w.name}</span><span className="r">{t('{0} esercizi', w.entries.length)}</span></button>)}
    </div>
  }
  const w = ws.find(x => x.id === workoutId)
  if (!w) return <div className="narrow">{back}<div className="empty">{t('Allenamento non trovato')}</div></div>
  const delta = workoutDelta(S, w.id)
  const min = w.end && w.start ? Math.round((w.end - w.start) / 60000) : null
  return <div className="narrow">
    {back}
    <div className="eb">{dayName(w.d)}{min ? ' · ' + t('{0} minuti', min) : ''}</div>
    <div className="row" style={{ alignItems: 'center', margin: '4px 0 16px' }}>
      <h1 className="grow" style={{ margin: 0 }}>{w.name}</h1>
      {delta != null && <span className={'pill ' + (delta > 0 ? 'up' : delta < 0 ? 'dn' : '')}>{pct(delta)}</span>}
    </div>
    {w.entries.map(e => <div key={e.id} className="it">
      <Thumb id={e.id} size={44} icon={'check' in e ? 'flame' : 'dumbbell'} />
      <span className="n"><b>{displayName(S, e.id)}</b>{!('check' in e) && <small>{sets(S, e)}</small>}</span>
      {'check' in e && <Icon name="check" className="mu" />}
    </div>)}
  </div>
}
