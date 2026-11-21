import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Bar from '../components/Bar.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '@/components/ui/button'
import { useStore } from '../store/useStore.js'
import { workoutDelta, monthSummary, routineColor, mainOf } from '../lib/training.js'
import { num, pct, ddmm, todayISO } from '../lib/format.js'
import { t, weekday, monthName, weekLetters } from '../lib/i18n.js'
import { prevSame } from './WorkoutDetail.jsx'

const GIORNO = d => weekday(d, false) + ' ' + d.slice(8, 10) + '/' + d.slice(5, 7)
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const dateOf = d => new Date(d + 'T12:00:00')
const tone = n => (n > 0 ? 'text-success' : n < 0 ? 'text-destructive' : '')
const OTHER = 'var(--muted-foreground)'   // a workout outside any routine

export default function Calendar() {
  const nav = useNavigate()
  const state = useLocation().state   // { back, d }: d = the day he came back from, shown picked
  const S = useStore(s => s.S)
  const now = new Date()
  const start = state?.d ? dateOf(state.d) : now
  const [[y, m], setYm] = useState([start.getFullYear(), start.getMonth()])
  const [sel, setSel] = useState(state?.d || null)   // the tapped day: its workouts show under the calendar
  const show = d => { setSel(null); setYm([d.getFullYear(), d.getMonth()]) }
  const lead = (new Date(y, m, 1).getDay() + 6) % 7          // Monday first
  const days = new Date(y, m + 1, 0).getDate()
  const today = todayISO()
  const ws = S.workouts || []
  const byDay = {}
  for (const w of ws) (byDay[w.d] = byDay[w.d] || []).push(w)
  const sum = monthSummary(S, y, m)
  const nameOf = w => S.routines.find(r => r.id === w.routineId)?.name || w.name
  const first = iso(y, m, 1)
  const monthWs = ws.filter(w => w.d.startsWith(first.slice(0, 7)))
  const lastBefore = !monthWs.length && ([...ws].reverse().find(w => w.d < first) || ws.at(-1))
  const legend = S.routines.filter(r => monthWs.some(w => w.routineId === r.id))
  const other = monthWs.some(w => !routineColor(S, w.routineId))
  const picked = sel && byDay[sel]

  return <div className="narrow">
    <Bar title={<span className="capitalize">{monthName(y, m)} {y !== now.getFullYear() ? y : ''}</span>} back={{ label: t('Allenati'), onClick: () => nav(state?.back || '/allenati') }} right={<>
      <Button variant="ghost" size="icon" className="text-tinta" aria-label={t('Mese precedente')} onClick={() => show(new Date(y, m - 1, 1))}><Icon name="chevronLeft" size={24} /></Button>
      <Button variant="ghost" size="icon" className="text-tinta" aria-label={t('Mese successivo')} onClick={() => show(new Date(y, m + 1, 1))}><Icon name="chevronRight" size={24} /></Button>
    </>} />
    <section className="grid grid-cols-3 divide-x divide-border rounded-2xl bg-card py-3">
      {[['dumbbell', t('allenamenti'), sum.count],
        ['chartLine', t('media'), <span className={tone(sum.meanDelta)}>{sum.meanDelta == null ? '—' : pct(sum.meanDelta)}</span>],
        ['scale', t('peso'), sum.lastWeight ? <>{num(sum.lastWeight)}<span className="text-[13px] font-normal text-muted-foreground"> kg</span></> : '—']
      ].map(([ic, label, v]) => <div key={ic} className="flex flex-col items-center gap-0.5 px-2">
        <span className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground"><Icon name={ic} size={14} />{label}</span>
        <b className="text-[22px] font-semibold tabular-nums">{v}</b>
      </div>)}
    </section>
    <section className="chiara mt-4 grid grid-cols-7 gap-y-1 rounded-2xl bg-card px-2 pb-2 pt-3">
      {weekLetters().map((d, i) => <div key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">{d}</div>)}
      {Array.from({ length: lead }, (_, i) => <div key={'e' + i} />)}
      {Array.from({ length: days }, (_, i) => {
        const d = iso(y, m, i + 1), list = byDay[d]
        const main = mainOf(S, list)
        const c = main && (routineColor(S, main.routineId) || OTHER)
        const on = d === sel, now_ = d === today
        return <button key={d} className="flex h-12 flex-col items-center justify-center gap-[3px]" disabled={!list} onClick={() => setSel(d === sel ? null : d)}>
          <span className={'flex size-8 items-center justify-center rounded-full text-[16px] tabular-nums '
            + (on ? (now_ ? 'bg-primary font-semibold text-primary-foreground' : 'bg-foreground font-semibold text-background')
              : now_ ? 'font-semibold text-tinta' : '')}>{i + 1}</span>
          <i className="size-[6px] rounded-full" style={{ background: c || 'transparent' }} />
        </button>
      })}
    </section>
    {picked && <section className="mt-4 divide-y divide-border overflow-hidden rounded-2xl bg-card">{picked.map(w => {
      const dl = workoutDelta(S, w.id)
      return <button key={w.id} className="flex min-h-14 w-full items-center gap-3 py-2.5 pl-4 pr-3 text-left active:bg-raised" onClick={() => nav('/storico/' + w.id, { state: { back: state?.back, fromCal: true } })}>
        <i className="size-2.5 shrink-0 rounded-full" style={{ background: routineColor(S, w.routineId) || OTHER }} />
        <span className="min-w-0 flex-1"><b className="block truncate text-[17px] font-normal">{nameOf(w)}</b><span className="block text-[13px] capitalize text-muted-foreground">{GIORNO(sel)}</span></span>
        {dl != null && <span className="text-right leading-tight"><b className={'block text-[15px] font-semibold tabular-nums ' + tone(dl)}>{pct(dl)}</b><span className="text-[12px] text-muted-foreground">vs {ddmm(prevSame(S, w).d)}</span></span>}
        <Icon name="chevronRight" size={18} className="text-muted-foreground/60" />
      </button>
    })}</section>}
    {(legend.length > 0 || other) && <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 pt-3 text-[13px] text-muted-foreground">
      {legend.map(r => <span key={r.id} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: routineColor(S, r.id) }} />{r.name}</span>)}
      {other && <span className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: OTHER }} />{t('Altro')}</span>}
    </div>}
    {!monthWs.length && <div className="flex flex-col items-center gap-1 pt-10 text-center">
      <Icon name="calendar" size={36} className="mb-2 text-muted-foreground" /><b className="text-[17px] font-semibold">{t('Nessun allenamento')}</b>
      {lastBefore
        ? <Button variant="link" className="text-[15px]" onClick={() => show(dateOf(lastBefore.d))}>{t('Ultimo')} {GIORNO(lastBefore.d)}<Icon name="chevronRight" size={16} /></Button>
        : <span className="text-[15px] text-muted-foreground">{t('Ancora nessun allenamento')}</span>}
    </div>}
  </div>
}
