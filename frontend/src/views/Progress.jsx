import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { exerciseRows } from '../lib/training.js'
import { num } from '../lib/format.js'
import Thumb from '../components/Thumb.jsx'
import Icon from '../components/Icon.jsx'
import { openWeight } from '../lib/weight.js'
import { rangeFrom, Pills, RangeChart, Delta, SEG, SEGT } from './ExerciseDetail.jsx'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { t } from '../lib/i18n.js'
import { RoutineList } from './Routines.jsx'
import Bar from '../components/Bar.jsx'

const unitOf = m => (m === 'kg' ? 'kg' : m === 'reps' ? t('rip') : 's')

// The Esercizi tab: the routines (default) and, on the second chip, the progress chart.
let lastSec = 'schede'   // the chip he was on, for the rest of the session
export default function Exercises() {
  const asked = useLocation().state?.sec   // coming back from one exercise's detail lands on Progressi
  const [sec, setSec] = useState(() => (lastSec = asked || lastSec))
  const pick = v => setSec(lastSec = v)
  return <div className="narrow">
    <Bar title={t('Exercises')} />
    <Tabs value={sec} onValueChange={pick} className="mb-5">
      <TabsList className={SEG}>
        <TabsTrigger value="schede" className={SEGT}>{t('Schede')}</TabsTrigger>
        <TabsTrigger value="prog" className={SEGT}>{t('Progressi')}</TabsTrigger>
      </TabsList>
    </Tabs>
    {sec === 'schede' ? <RoutineList /> : <Progress />}
  </div>
}

// Body weight on top, then every exercise: a tap opens its own page (number, change, chart, sets).
function Progress() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const rows = exerciseRows(S)
  const byId = Object.fromEntries(rows.map(r => [r.id, r]))
  const seen = new Set()
  const take = list => list.filter(x => x && !seen.has(x.id) && seen.add(x.id))
  const groups = (S.routines || []).map(r => ({ id: r.id, name: r.name, rows: take(r.ex.map(e => byId[e.id])) }))
  groups.push({ id: 'altri', name: t('Altri esercizi'), rows: take(rows) })
  const [range, setRange] = useState('6M')
  const from = rangeFrom(range)
  const bw = S.bodyweight || []
  const pts = bw.filter(b => b.d >= from).map(b => ({ d: b.d, y: b.w }))

  return <>
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold">{t('Peso corporeo')}</span>
        <Button variant="tinted" size="icon-sm" aria-label={t('Aggiungi peso')} onClick={() => openWeight(S, update)}><Icon name="plus" size={18} /></Button>
      </div>
      <div className="mt-1 text-[32px] font-semibold leading-none tabular-nums">{bw.length ? num(bw.at(-1).w) : '—'}<span className="ml-1 text-[17px] font-medium text-muted-foreground">kg</span></div>
      <div className="mb-3 mt-1.5 min-h-5">{pts.length > 1 && <Delta a={pts[0].y} b={pts.at(-1).y} since={pts[0].d} u="kg" />}</div>
      <RangeChart sessions={pts} from={from} unit="kg" />
      <div className="mt-3"><Pills range={range} setRange={setRange} /></div>
    </section>

    {groups.filter(g => g.rows.length).map(g => <div key={g.id} className="mt-6">
      <div className="px-1 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{g.name}</div>
      <div className="overflow-hidden rounded-2xl bg-card">{g.rows.map(x => <button key={x.id} className="group flex min-h-[60px] w-full items-center pl-4 text-left active:bg-raised" onClick={() => nav('/progressi/' + x.id)}>
        <Thumb id={x.id} size={40} />
        <span className="ml-3 flex min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border pr-3 group-first:border-t-0">
          <span className="min-w-0 flex-1 truncate text-[16px]">{x.name}</span>
          <span className="text-[16px] font-semibold tabular-nums">{num(x.now)}<span className="ml-0.5 text-[13px] font-normal text-muted-foreground">{unitOf(x.measure)}</span></span>
          <Icon name="chevronRight" size={18} className="shrink-0 text-muted-foreground/60" />
        </span>
      </button>)}</div>
    </div>)}
  </>
}
