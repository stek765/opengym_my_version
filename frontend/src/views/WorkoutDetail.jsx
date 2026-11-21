import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { displayName, measureOf, workoutDelta } from '../lib/training.js'
import { ddmm, num, pct } from '../lib/format.js'
import Bar from '../components/Bar.jsx'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import { t, weekday } from '../lib/i18n.js'

// The workout workoutDelta compares against: the previous one of the same routine.
export const prevSame = (S, w) => {
  const ws = S.workouts || []
  for (let j = ws.indexOf(w) - 1; j >= 0; j--) if (ws[j].routineId && ws[j].routineId === w.routineId) return ws[j]
}

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
  const day = workoutId.startsWith('giorno-') ? workoutId.slice(7) : ws.find(x => x.id === workoutId)?.d
  const back = state?.back && !state.fromCal
    ? { label: t('Allenati'), onClick: () => nav(state.back) }
    : { label: t('Storico'), onClick: () => nav('/storico', { state: { back: state?.back, d: day } }) }

  // Two workouts on the same day: list them first.
  if (workoutId.startsWith('giorno-')) {
    return <div className="narrow"><Bar title={dayName(day)} back={back} />
      <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{ws.filter(w => w.d === day).map(w => <button key={w.id} className="flex min-h-12 w-full items-center gap-3 py-2.5 pl-4 pr-3 text-left active:bg-raised" onClick={() => nav('/storico/' + w.id, { state })}>
        <span className="min-w-0 flex-1 truncate text-[17px]">{w.name}</span>
        <span className="text-[15px] text-muted-foreground">{t('{0} esercizi', w.entries.length)}</span>
        <Icon name="chevronRight" size={18} className="text-muted-foreground/60" />
      </button>)}</section>
    </div>
  }
  const w = ws.find(x => x.id === workoutId)
  if (!w) return <div className="narrow"><Bar title="" back={back} large={false} />
    <div className="flex flex-col items-center gap-1 pt-[18vh] text-center">
      <Icon name="calendar" size={36} className="mb-2 text-muted-foreground" />
      <b className="text-[17px] font-semibold">{t('Allenamento non trovato')}</b>
      <span className="text-[15px] text-muted-foreground">{t('Forse è stato eliminato')}</span>
    </div>
  </div>
  const delta = workoutDelta(S, w.id)
  const min = w.end && w.start ? Math.round((w.end - w.start) / 60000) : null
  return <div className="narrow">
    <Bar title={w.name} back={back} eyebrow={dayName(w.d) + (min ? ' · ' + t('{0} minuti', min) : '')}>
      {delta != null && <span className="text-right leading-tight">
        <b className={'block text-[17px] font-semibold tabular-nums ' + (delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : '')}>{pct(delta)}</b>
        <span className="text-[12px] text-muted-foreground">vs {ddmm(prevSame(S, w).d)}</span>
      </span>}
    </Bar>
    <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{w.entries.map(e => <div key={e.id} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
      <Thumb id={e.id} size={44} icon={'check' in e ? 'flame' : 'dumbbell'} />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[17px] font-normal">{displayName(S, e.id)}</b>
        {!('check' in e) && <span className="block text-[14px] tabular-nums text-muted-foreground">{sets(S, e)}</span>}
      </span>
      {'check' in e && <Icon name="check" size={20} className="text-muted-foreground" />}
    </div>)}</section>
  </div>
}
