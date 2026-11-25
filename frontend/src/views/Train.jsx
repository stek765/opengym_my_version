import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { suggestedRoutine, mainOf, phaseOf } from '../lib/training.js'
import { ddmm, num, todayISO, isoOf } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { Clock } from './Session.jsx'
import Icon from '../components/Icon.jsx'
import LineChart from '../components/LineChart.jsx'
import { openWeight } from '../lib/weight.js'
import { t, weekday, weekLetters, dateLocale } from '../lib/i18n.js'
import Bar from '../components/Bar.jsx'
import { Button } from '@/components/ui/button'

export const lastDone = (S, id) => (S.workouts || []).reduce((d, w) => (w.routineId === id && w.d > d ? w.d : d), '')

const daysSince = iso => Math.round((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 864e5)
// "ieri", "lunedì" within the week, a date beyond it.
export const ago = iso => {
  if (!iso) return t('mai fatta')
  const n = daysSince(iso)
  return n === 0 ? t('oggi') : n === 1 ? t('ieri') : n < 7 ? weekday(iso) : ddmm(iso)
}
// "5 esercizi · l'ultima volta ieri", or "· mai fatta" for a routine never done.
export const nEsercizi = n => n === 1 ? t('1 esercizio') : t('{0} esercizi', n)
export const lastLine = (n, iso) => nEsercizi(n) + ' · ' + (iso ? t("l'ultima volta {0}", ago(iso)) : t('mai fatta'))
// the strength exercises first: they are what tells one day from another
export const pics = (S, r) => (r?.ex || []).filter(e => EXIDX[e.id]?.img).sort((a, b) => (phaseOf(S, b, r) === 'forza') - (phaseOf(S, a, r) === 'forza')).map(e => e.id)

const H = 'px-1 pb-2 pt-6 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground'
const CARD = 'overflow-hidden rounded-2xl bg-card'

// Monday-first strip of this week: a filled circle on the days he trained, a ring on today.
function Week({ S, open }) {
  const lists = {}, byDay = {}
  for (const w of S.workouts || []) (lists[w.d] = lists[w.d] || []).push(w)
  for (const d in lists) byDay[d] = lists[d].length > 1 ? { ...mainOf(S, lists[d]), id: 'giorno-' + d } : lists[d][0]
  const today = todayISO()
  const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7)
  return <div className="grid grid-cols-7">{weekLetters().map((l, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    const iso = isoOf(d)
    const w = byDay[iso]
    return <button key={i} disabled={!w} onClick={() => open(w)} className="flex flex-col items-center gap-1.5 py-1 text-[11px] font-semibold uppercase text-muted-foreground active:opacity-60">
      {l}
      <span className={'flex size-9 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums '
        + (w ? 'bg-primary text-primary-foreground' : 'text-foreground')
        + (iso === today ? ' ring-[1.5px] ring-foreground ring-offset-2 ring-offset-card' : '')}>{d.getDate()}</span>
    </button>
  })}</div>
}

export default function Train() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const sug = suggestedRoutine(S)
  const A = S.active
  const bw = S.bodyweight || [], lastBw = bw.at(-1), prevBw = bw.at(-2)
  const dBw = lastBw && prevBw ? Math.round((lastBw.w - prevBw.w) * 10) / 10 : 0
  const since = isoOf(new Date(Date.now() - 60 * 864e5))
  const spark = bw.filter(b => b.d >= since).map(b => ({ t: new Date(b.d + 'T12:00:00').getTime(), y: b.w, d: b.d }))
  const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7)
  const done = new Set((S.workouts || []).filter(w => w.d >= isoOf(mon)).map(w => w.d)).size
  const today = new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  const gear = <Button variant="ghost" size="icon" className="text-tinta" aria-label={t('Impostazioni')} onClick={() => nav('/impostazioni', { state: { back: '/allenati' } })}><Icon name="gear" size={22} /></Button>

  return <div className="narrow">
    <Bar title={t('Allenati')} eyebrow={today} right={gear} />

    {/* a workout is open: impossible to miss, in the workout's own yellow, with its clock running */}
    {A ? <button className="mt-1 flex h-[76px] w-full items-center gap-4 rounded-2xl bg-[#ffd60a] px-5 text-left text-[#1a1500] shadow-[0_0_40px_rgba(255,214,10,.45)] active:opacity-85" onClick={() => nav('/allenamento')}>
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1a1500] text-[#ffd60a]"><span className="absolute inset-0 animate-ping rounded-full bg-[#1a1500]/30" /><Icon name="play" size={22} /></span>
      <span className="min-w-0 flex-1"><b className="block text-[19px] font-bold">{t('Riprendi allenamento')}</b><span className="block truncate text-[14px] font-medium tabular-nums opacity-75">{A.name} · <Clock start={A.start} /></span></span>
      <Icon name="chevronRight" size={22} />
    </button> : <Button size="lg" className="mt-1 h-16 w-full justify-start rounded-2xl px-5 text-left" onClick={() => nav('/inizia')}>
      <Icon name="play" size={24} /><span className="flex-1"><b className="block text-[19px] font-semibold">{t('Allenati')}</b>{sug && <span className="block text-[13px] font-normal opacity-80">{t('consigliata')}: {sug.name}</span>}</span><Icon name="chevronRight" size={20} />
    </Button>}

    <div className={H + ''}>{t('Questa settimana')}</div>
    <section className={CARD + ' chiara'}>
      <div className="flex items-center px-4 pt-3">
        <span className="flex-1 text-[15px]"><b className="text-[22px] font-semibold tabular-nums">{done}</b> <span className="text-muted-foreground">{t('allenamenti')}</span></span>
        <button className="-mr-2 flex h-11 items-center gap-0.5 px-2 text-[15px] text-tinta active:opacity-60" onClick={() => nav('/storico', { state: { back: '/allenati' } })}>{t('Storico')}<Icon name="chevronRight" size={18} /></button>
      </div>
      <div className="px-2 pb-3"><Week S={S} open={w => nav('/storico/' + w.id, { state: { back: '/allenati' } })} /></div>
    </section>

    <div className={H}>{t('Peso')}</div>
    <section className={CARD}>
      <div role="button" className="flex min-h-16 items-center gap-3 py-2 pl-4 pr-2 active:bg-raised" onClick={() => nav('/progressi', { state: { sec: 'prog' } })}>
        <span className="min-w-0 flex-1">
          <b className="text-[22px] font-semibold tabular-nums">{lastBw ? num(lastBw.w) : '—'}<span className="text-[15px] font-normal text-muted-foreground"> kg</span></b>
          <span className="block truncate text-[13px] text-muted-foreground">{lastBw ? <>{ago(lastBw.d)}{dBw ? <> · <span className={dBw > 0 ? 'text-success' : 'text-destructive'}>{dBw > 0 ? '+' : '−'}{num(Math.abs(dBw))}</span></> : ''}</> : t('Non hai ancora registrato il peso')}</span>
        </span>
        {spark.length > 1 && <span className="pointer-events-none w-24 shrink-0 [&_circle]:hidden [&_svg]:h-10 [&_svg]:w-full"><LineChart points={spark} h={44} axes={false} color="var(--primary)" /></span>}
        <Button variant="tinted" size="icon-sm" aria-label={t('Registra')} onClick={e => { e.stopPropagation(); openWeight(S, update) }}><Icon name="plus" size={20} /></Button>
      </div>
    </section>

  </div>
}
