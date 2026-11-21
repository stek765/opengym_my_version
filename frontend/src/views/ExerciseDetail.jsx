import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { displayName, exerciseHistory, measureOf, topOf } from '../lib/training.js'
import { num, ddmm } from '../lib/format.js'
import LineChart from '../components/LineChart.jsx'
import Bar from '../components/Bar.jsx'
import HowTo from '../components/HowTo.jsx'
import Icon from '../components/Icon.jsx'
import { t } from '../lib/i18n.js'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const RANGES = [['1M', 31], ['3M', 92], ['6M', 183], ['1A', 365], ['Tutto', 0]]
// ISO start of a range ('' = everything)
export const rangeFrom = range => { const days = RANGES.find(r => r[0] === range)[1]; return days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : '' }
// iOS segmented control on shadcn Tabs (shared by the Esercizi tab and the Coach).
export const SEG = 'h-9 w-full rounded-[10px] bg-black/20 p-[2px]'
export const SEGT = 'min-w-0 basis-0 rounded-[8px] text-[13px] font-semibold text-foreground data-active:bg-white/25 data-active:shadow-none'
export const Pills = ({ range, setRange }) => <Tabs value={range} onValueChange={setRange}>
  <TabsList className={SEG}>{RANGES.map(([k]) => <TabsTrigger key={k} value={k} className={SEGT}>{t(k)}</TabsTrigger>)}</TabsList>
</Tabs>
// The chart over the chosen range: from its start to today, so the range is visible even with few points.
export const RangeChart = ({ sessions, from, unit }) => <LineChart unit={unit}
  points={sessions.map(s => ({ t: new Date(s.d + 'T12:00:00').getTime(), y: s.y, d: s.d }))}
  from={from ? new Date(from + 'T12:00:00').getTime() : undefined} to={Date.now()} />

// "+5 kg dal 03/09 · +8%": green up, red down, nothing when flat.
export function Delta({ a, b, since, u }) {
  const d = Math.round((b - a) * 100) / 100
  if (!d || !a) return null
  const s = d > 0 ? '+' : '−'
  return <div className={'text-[15px] font-medium tabular-nums ' + (d > 0 ? 'text-success' : 'text-destructive')}>
    {s}{num(Math.abs(d))} {u} <span className="text-muted-foreground">{t('dal {0}', ddmm(since))}</span> · {s}{Math.abs(Math.round(d / a * 100))}%
  </div>
}

// One row per date, one column per set: weight big, reps small under (reps/sec: the value only).
export function SetsTable({ sessions, measure, noDate }) {
  const cols = Math.max(1, ...sessions.map(s => s.sets.length))
  const th = 'px-1 py-2 text-center text-[12px] font-semibold text-muted-foreground'
  return <table className="w-full border-collapse tabular-nums">
    <thead><tr className="border-b border-border">{!noDate && <th className={th + ' text-left'} />}{Array.from({ length: cols }, (_, i) => <th key={i} className={th}>{t('Serie')} {i + 1}</th>)}</tr></thead>
    <tbody className="divide-y divide-border">{sessions.map(s => <tr key={s.d}>
      {!noDate && <td className="py-2.5 pr-1 text-[13px] text-muted-foreground">{ddmm(s.d)}</td>}
      {Array.from({ length: cols }, (_, i) => {
        const x = s.sets[i]
        if (!x) return <td key={i} className="py-2.5 text-center text-muted-foreground/50">—</td>
        return <td key={i} className="py-2.5 text-center text-[17px] font-semibold leading-tight">{measure === 'kg' ? <>{num(x.w)}<small className="block text-[11px] font-normal text-muted-foreground">× {x.r}</small></> : measure === 'sec' ? num(x.sec) : x.r}</td>
      })}
    </tr>)}</tbody>
  </table>
}

export default function ExerciseDetail() {
  const nav = useNavigate()
  const { exId } = useParams()
  const S = useStore(s => s.S)
  const [range, setRange] = useState('6M')
  const from = rangeFrom(range)
  const measure = measureOf(S, exId)
  const all = exerciseHistory(S, exId)          // newest first
  const shown = exerciseHistory(S, exId, from)
  const back = { label: t('Progressi'), onClick: () => nav('/progressi', { state: { sec: 'prog' } }) }
  if (!all.length) return <div className="narrow"><Bar title={displayName(S, exId)} back={back} />
    <HowTo id={exId} className="mb-2" />
    <div className="flex flex-col items-center gap-1 py-16 text-center"><Icon name="dumbbell" size={32} className="mb-2 text-muted-foreground" /><b className="text-[17px] font-semibold">{t('Mai fatto')}</b><span className="text-[15px] text-muted-foreground">{t('Le serie compaiono dopo il primo allenamento')}</span></div>
  </div>
  const now = topOf(all[0].sets, measure), first = all[all.length - 1]
  const firstTop = topOf(first.sets, measure)
  const u = measure === 'kg' ? 'kg' : measure === 'reps' ? t('rip') : 's'

  return <div className="narrow">
    <Bar title={displayName(S, exId)} back={back} large={false} />
    <h1 className="m-0 pb-3 pt-2 text-[22px] font-bold leading-tight tracking-tight">{displayName(S, exId)}</h1>
    <HowTo id={exId} className="mb-4" />
    <section className="rounded-2xl bg-card p-4">
      <div className="text-[32px] font-semibold leading-none tabular-nums">{num(now)}<span className="ml-1 text-[17px] font-medium text-muted-foreground">{u}</span></div>
      <div className="mb-3 mt-1.5 min-h-5"><Delta a={firstTop} b={now} since={first.d} u={u} /></div>
      <RangeChart sessions={[...shown].reverse().map(s => ({ d: s.d, y: topOf(s.sets, measure) }))} from={from} unit={u} />
      <div className="mt-3"><Pills range={range} setRange={setRange} /></div>
    </section>
    <div className="px-1 pb-2 pt-6 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{t('Storico')}</div>
    <section className="rounded-2xl bg-card px-4 py-1">
      <SetsTable sessions={shown.length ? shown : all.slice(0, 1)} measure={measure} />
    </section>
  </div>
}
