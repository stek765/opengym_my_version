import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { displayName, lastSession, measureOf, increaseOffer, finishSession, PHASES, phaseOf } from '../lib/training.js'
import { setValue, toggleSet, addSet, skipEntry, addEntry, answerOffer, renameEntry, settle, openEntry, removeSet, replaceEntry, nextOpen } from '../lib/session.js'
import { num } from '../lib/format.js'
import { openNumber } from '../components/NumberSheet.jsx'
import { openPicker } from '../components/ExercisePicker.jsx'
import { confirmAsk, promptAsk, useLongPress } from '../components/ask.jsx'
import { afterWorkout, cue } from '../lib/coach-api.js'
import { newExercise } from '../components/newExercise.jsx'
import RestStrip from '../components/RestStrip.jsx'
import MuscleTag from '../components/MuscleTag.jsx'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import HowTo from '../components/HowTo.jsx'
import ExerciseInfo from '../components/ExerciseInfo.jsx'
import Phases, { PHASE_CHIP } from '../components/Phases.jsx'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { t } from '../lib/i18n.js'
import { unlockAudio } from '../lib/sound.js'
import { haptic } from '../lib/haptic.js'

export function Clock({ start }) {
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i) }, [])
  const s = Math.floor((Date.now() - start) / 1000)
  return <>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</>
}

// Above or below last time's set: the value itself turns green or red, the pill keeps its size.
const trend = (v, prev) => v == null || prev == null || v === prev ? '' : v > prev ? ' text-success' : ' text-destructive'

function Name({ S, id, className }) {
  const update = useStore(s => s.update)
  const press = useLongPress(() => promptAsk(t('Rinomina esercizio'), displayName(S, id), v => update(s => { s.exNames = { ...s.exNames, [id]: v } })))
  return <div className={className} {...press}>{displayName(S, id)}</div>
}

const VAL = 'flex h-12 min-w-0 flex-1 items-baseline justify-center gap-1 rounded-xl bg-foreground/10 pt-2.5 text-[21px] font-semibold tabular-nums transition-colors active:bg-foreground/20'
const UNIT = 'text-[13px] font-medium text-muted-foreground'

function OpenEntry({ S, e, upd, prev, next, nextPh, finish }) {
  const update = useStore(s => s.update)
  const startRest = useUI(s => s.startRest)
  const [hint, setHint] = useState('')
  const [popped, setPopped] = useState(-1)   // the set just ticked: only its check pops
  const feel = () => { setHint('…'); cue(e.id).then(r => setHint(r.text)).catch(err => setHint(t(err.message || 'Coach non raggiungibile'))) }
  const measure = measureOf(S, e.id)
  const last = lastSession(S, e.id)
  const offer = e.offer === undefined ? increaseOffer(S, e.id) : null
  // a hold or a stretch counts seconds and has no weight unless one was put on
  const showW = measure === 'kg' || e.sets.some(s => s.w > 0)
  const unit = measure === 'sec' ? 's' : t('rip')
  const name = displayName(S, e.id)
  const edit = (i, field) => openNumber({
    title: `${name} · ${t('serie')} ${i + 1} · ${t(field === 'w' ? 'peso' : measure === 'sec' ? 'secondi' : 'ripetizioni')}`,
    value: e.sets[i][field], field, later: e.sets.some((s, j) => j > i && !s.done),
    onDone: (v, later) => upd(a => setValue(a, e.id, i, field, v, later))
  })
  const tick = i => {
    unlockAudio(); haptic()
    setPopped(e.sets[i].done ? -1 : i)
    upd(a => toggleSet(a, e.id, i))
    if (!e.sets[i].done) startRest(S.restSec || 90)
    else if (useUI.getState().timer?.over) useUI.getState().stopRest()
  }
  const swap = () => openPicker({
    S, chip: PHASE_CHIP[e.ph],
    onPick: id => upd(a => replaceEntry(S, a, e.id, id)),
    onCreate: n => {
      const id = newExercise(n, (from, to) => update(s => { if (s.active) s.active = renameEntry(s.active, from, to) }))
      update(s => { s.active = replaceEntry(s, s.active, e.id, id) })
    }
  })
  const allDone = e.sets.length > 0 && e.sets.every(s => s.done)
  const info = () => useUI.getState().openSheet(() => <ExerciseInfo S={S} id={e.id} />)
  const answer = inc => {
    upd(a => answerOffer(a, e.id, inc))
    if (inc) update(s => { s.incr = { ...s.incr, [e.id]: inc } })
  }
  return <section className="mb-4 overflow-hidden rounded-2xl bg-card px-4 pb-4 pt-3">
    {prev && <Button variant="ghost" size="sm" className="-ml-2 mb-1 max-w-full px-2 text-tinta" onClick={() => upd(a => openEntry(a, prev))}>
      <Icon name="chevronLeft" size={16} /><span className="truncate">{t('Torna a {0}', displayName(S, prev))}</span>
    </Button>}
    {/* the drawing big on top, like the first version he used */}
    <HowTo id={e.id} className="mb-3" />
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <Name S={S} id={e.id} className="text-[20px] font-semibold leading-snug select-none" />
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <MuscleTag S={S} id={e.id} readOnly />
          <button className="inline-flex h-6 items-center gap-1 text-[13px] font-medium text-tinta active:opacity-60" onClick={info}>
            <Icon name="info" size={14} />{t('Descrizione')}
          </button>
          {!hint && <button className="inline-flex h-6 items-center gap-1 text-[13px] font-medium text-tinta active:opacity-60" onClick={feel}>
            <Icon name="sparkles" size={14} />{t('Cosa sentire?')}
          </button>}
        </div>
      </div>
    </div>
    {hint && <p className="mt-3 flex gap-2 text-[15px] leading-snug text-muted-foreground"><Icon name="sparkles" size={16} className="mt-0.5 shrink-0 text-tinta" />{hint}</p>}
    {offer && <div className="mt-3">
      <div className="mb-2 text-[13px] text-muted-foreground">{t("L'ultima volta {0} kg × {1}. Sali?", num(offer.last[0].w), offer.last.map(s => s.r).join(', '))}</div>
      <div className="flex gap-2">
        {[1, 2.5, 5].map(inc => <Button key={inc} size="sm" variant={inc === offer.preferred ? 'tinted' : 'secondary'} className="flex-1 tabular-nums" onClick={() => answer(inc)}>+{num(inc)}</Button>)}
        <Button size="sm" variant="ghost" className="flex-1 text-muted-foreground" onClick={() => answer(0)}>{t('No')}</Button>
      </div>
    </div>}
    {!offer && last && <div className="mt-2 text-[14px] tabular-nums text-muted-foreground">{t("L'ultima volta {0}", last.sets.map(x => measure === 'kg' ? `${num(x.w)} × ${x.r}` : x.r).join(' · '))}</div>}
    {/* one row per set: number, kg, reps, an empty circle that turns yellow with a check when done */}
    <div className="-mx-2 mt-3 flex flex-col gap-1.5">
      {e.sets.map((s, i) => {
        const p = last?.sets[i]
        return <div key={i} className={'flex items-center gap-2 rounded-xl px-2 py-1 transition-colors duration-200' + (s.done ? ' bg-success/15' : '')}>
          <span className="w-6 shrink-0 text-center text-[15px] font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
          {showW && <button className={VAL + trend(s.w, p?.w)} aria-label={t('peso')} onClick={() => edit(i, 'w')}>{num(s.w)}<small className={UNIT}>kg</small></button>}
          <button className={VAL + trend(s.r, p?.r)} aria-label={t('ripetizioni')} onClick={() => edit(i, 'r')}>{s.r ?? '—'}<small className={UNIT}>{unit}</small></button>
          <button className="flex size-12 shrink-0 items-center justify-center" aria-label={t(s.done ? 'Annulla serie' : 'Fatta')} onClick={() => tick(i)}>
            <span className={'flex size-10 items-center justify-center rounded-full transition-colors ' + (s.done ? 'bg-success text-primary-foreground' : 'border-2 border-foreground/30 text-transparent') + (s.done && popped === i ? ' animate-[pop_.24s_ease-out]' : '')}>
              <Icon name="check" size={20} strokeWidth={3} />
            </span>
          </button>
        </div>
      })}
    </div>
    <RestStrip />
    {/* Every button always sits in the same place: "− Serie" greys out instead of disappearing. */}
    <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => upd(a => addSet(a, e.id))}><Icon name="plus" size={16} />{t('Serie')}</Button>
    <div className="mt-1 flex">
      <Button variant="ghost" className="flex-1 px-1 text-muted-foreground" disabled={e.sets.length < 2 || allDone} onClick={() => upd(a => removeSet(a, e.id))}><Icon name="minus" size={16} />{t('Serie')}</Button>
      {!showW && <Button variant="ghost" className="flex-1 px-1 text-muted-foreground" onClick={() => edit(Math.max(0, e.sets.findIndex(s => !s.done)), 'w')}><Icon name="plus" size={16} />{t('Peso')}</Button>}
      <Button variant="ghost" className="flex-1 px-1 text-muted-foreground" onClick={swap}><Icon name="swap" size={16} />{t('Cambia')}</Button>
      <Button variant="ghost" className="flex-1 px-1 text-muted-foreground" onClick={() => upd(a => skipEntry(a, e.id))}><Icon name="skip" size={16} />{t('Salta')}</Button>
    </div>
    {allDone && (next
      ? <Button size="lg" className="mt-2 w-full justify-start duration-200 animate-in fade-in" onClick={() => upd(a => openEntry(a, next))}><Thumb id={next} size={28} className="rounded-md" /><span className="truncate">{nextPh ? t('Avanti: {0} · {1}', t(nextPh), displayName(S, next)) : t('Prossimo: {0}', displayName(S, next))}</span></Button>
      : <Button size="lg" className="mt-2 w-full duration-200 animate-in fade-in" onClick={finish}><Icon name="check" />{t('Fine allenamento')}</Button>)}
  </section>
}

function summary(S, e) {
  const d = e.sets.filter(s => s.done)
  if (d.length && d.length === e.sets.length) return (measureOf(S, e.id) === 'kg' ? num(d[0].w) + ' × ' : '') + d.map(s => s.r).join(' ')
  const f = e.sets[0]
  return `${e.sets.length} × ${f?.r ?? '—'}${measureOf(S, e.id) === 'sec' ? ' s' : ''}` + (f?.w ? ` · ${num(f.w)} kg` : '')
}

export default function Session() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const stopRest = useUI(s => s.stopRest)
  // finish() navigates to the summary and then clears S.active: that re-render must not
  // redirect to /allenati on top of it (it did, and the summary never showed).
  const leaving = useRef(false)
  const A = S.active
  if (!A) return leaving.current ? null : <Navigate to="/allenati" replace />
  const upd = fn => update(s => { s.active = settle(fn(s.active)) })
  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const done = A.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)

  const finish = () => {
    const w = finishSession(A)
    leaving.current = true
    stopRest()
    // Nothing ticked: a stray tap must not leave an empty day in the calendar.
    if (!w.entries.length) { nav('/allenati', { replace: true }); update(s => { s.active = null }); return }
    nav('/storico/' + w.id, { replace: true, state: { back: '/allenati' } })
    update(s => { s.workouts.push(w); s.active = null })
    // The coach comment is a bonus: a slow or failed coach never holds up the finish.
    useStore.getState().pushState().then(() => afterWorkout(w.id)).catch(() => {})
  }
  // One phase on screen at a time: the one of the open exercise (the last, once all is done).
  const phOf = e => e.ph || phaseOf(S, e)
  const cur = A.entries.find(e => e.id === A.openId)
  const view = cur ? phOf(cur) : (A.entries.length ? phOf(A.entries.at(-1)) : 'forza')
  const complete = e => e.skipped || ('check' in e ? e.check : e.sets.length > 0 && e.sets.every(s => s.done))
  const items = {}
  for (const e of A.entries) { const it = items[phOf(e)] ||= { n: 0, left: 0 }; it.n++; if (!complete(e)) it.left++ }
  for (const k in items) items[k].done = !items[k].left
  // a tap on a phase opens its first exercise still to do, or its first one
  const goPhase = p => {
    const xs = A.entries.filter(e => phOf(e) === p)
    const e = xs.find(x => !complete(x)) || xs[0]
    if (e) upd(a => ({ ...openEntry(a, e.id), prevId: null }))   // a phase jump is not a detour to come back from
    document.getElementById('app')?.scrollTo({ top: 0 })
  }
  const label = p => PHASES.find(x => x[0] === p)?.[1] || p
  const add = () => openPicker({
    S, chip: PHASE_CHIP[view],
    onPick: id => upd(a => addEntry(S, a, id, view)),
    onCreate: name => {
      const id = newExercise(name, (from, to) => update(s => { if (s.active) s.active = renameEntry(s.active, from, to) }))
      update(s => { s.active = addEntry(s, s.active, id, view) })
    }
  })

  // One row of the grouped list for every exercise that is not open; consecutive rows share a card.
  const row = e => {
    const R = 'group flex w-full items-center gap-3 pl-4 text-left active:bg-foreground/5'
    const IN = 'flex min-h-[60px] min-w-0 flex-1 items-center gap-3 border-t border-border py-2 pr-4 group-first:border-t-0'
    const ok = <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-primary-foreground"><Icon name="check" size={14} strokeWidth={3} /></span>
    if ('check' in e) return <button key={e.id} className={R} onClick={() => upd(a => toggleSet(a, e.id))}>
      <Thumb id={e.id} size={40} icon="flame" />
      <span className={IN}><span className="flex-1 truncate text-[16px]">{displayName(S, e.id)}</span>
        {e.check ? ok : <span className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/40" />}</span>
    </button>
    if (e.skipped) return <button key={e.id} className={R} onClick={() => upd(a => skipEntry(a, e.id))}>
      <Thumb id={e.id} size={40} className="opacity-40" />
      <span className={IN}><span className="flex-1 truncate text-[16px] text-muted-foreground line-through">{displayName(S, e.id)}</span>
        <span className="shrink-0 text-[13px] text-tinta">{t('ripristina')}</span></span>
    </button>
    const nd = e.sets.filter(s => s.done).length
    const exDone = nd > 0 && nd === e.sets.length
    return <button key={e.id} className={R} onClick={() => upd(a => openEntry(a, e.id))}>
      <Thumb id={e.id} size={40} />
      <span className={IN}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px]">{displayName(S, e.id)}</span>
          <span className="block truncate text-[13px] tabular-nums text-muted-foreground">{summary(S, e)}</span>
        </span>
        {nd > 0 && !exDone && <Badge variant="secondary" className="h-6 px-2 text-[13px] tabular-nums text-muted-foreground">{nd}/{e.sets.length}</Badge>}
        {exDone ? ok : <Icon name="chevronRight" size={18} className="shrink-0 text-muted-foreground/60" />}
      </span>
    </button>
  }
  const blocks = []
  for (const e of A.entries.filter(x => phOf(x) === view)) {
    if (e.id === A.openId && !e.skipped) blocks.push(e)
    else if (Array.isArray(blocks.at(-1))) blocks.at(-1).push(e)
    else blocks.push([e])
  }

  // Termina asks: save what's done, or throw the session away (he never found a separate cancel button).
  const discard = () => { stopRest(); update(s => { s.active = null }); nav('/allenati') }
  const end = () => useUI.getState().openSheet(close => <div>
    <div className="text-lg font-semibold">{t('Terminare l’allenamento?')}</div>
    <div className="mb-5 mt-1 text-[15px] text-muted-foreground">{t('{0} di {1} serie', done, total)}</div>
    {done > 0 && <Button size="lg" className="w-full" onClick={() => { close(); finish() }}><Icon name="check" />{t('Termina e salva')}</Button>}
    <Button size="lg" variant="secondary" className="mt-2 w-full" onClick={close}>{t('Continua')}</Button>
    <Button variant="ghost" className="mt-4 w-full text-destructive hover:text-destructive" onClick={() => { close(); done ? confirmAsk(t('Annullare l’allenamento? Le serie segnate si perdono.'), t('Scarta'), discard, { danger: true, cancelText: t('Continua') }) : discard() }}><Icon name="trash" />{t('Annulla sessione')}</Button>
  </div>)

  return <div className="narrow">
    <header className="glassbar sticky top-0 z-20 -mx-4 bg-background/85 pt-[var(--sat)] backdrop-blur-xl">
      <div className="flex h-[52px] items-center gap-1 px-2">
        <Button variant="ghost" size="icon" className="text-tinta" aria-label={t("Indietro, l'allenamento resta aperto")} onClick={() => nav('/allenati')}><Icon name="chevronLeft" size={26} /></Button>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[17px] font-semibold">{A.name}</div>
          <div className="truncate text-[13px] tabular-nums text-muted-foreground"><Clock start={A.start} /> · {t('{0} di {1} serie', done, total)}</div>
        </div>
        <Button size="sm" className="mr-2 rounded-full px-4 text-[15px] font-semibold" onClick={end}>{t('Finish')}</Button>
      </div>
      {Object.keys(items).length > 1 && <div className="px-4 pb-2"><Phases value={view} onChange={goPhase} items={items} hideEmpty /></div>}
      <div className="h-0.5 bg-border"><i className="block h-full origin-left bg-primary transition-transform duration-300" style={{ transform: `scaleX(${total ? done / total : 0})` }} /></div>
    </header>
    <div className="pt-4">
      {blocks.map(b => {
        if (Array.isArray(b)) return <div key={'g' + b[0].id} className="mb-4 overflow-hidden rounded-2xl bg-card">{b.map(row)}</div>
        const e = b
        if ('check' in e) return <section key={e.id} className="mb-4 rounded-2xl bg-card p-4">
          <div className="flex items-center gap-3"><Thumb id={e.id} size={48} icon="flame" /><Name S={S} id={e.id} className="flex-1 text-[17px] font-semibold text-tinta select-none" /></div>
          <p className="mt-2 text-[15px] text-muted-foreground">{t('Si parte da qui. Quando hai finito, segnalo.')}</p>
          <Button size="lg" className="mt-4 w-full" onClick={() => upd(a => toggleSet(a, e.id))}><Icon name="check" />{t('Fatto')}</Button>
        </section>
        const nx = nextOpen(A, e.id), nxE = nx && A.entries.find(x => x.id === nx)
        return <OpenEntry key={e.id} S={S} e={e} upd={upd} next={nx} nextPh={nxE && phOf(nxE) !== view ? label(phOf(nxE)) : null} finish={finish} prev={A.prevId && A.prevId !== e.id && A.entries.some(x => x.id === A.prevId && !x.skipped && !('check' in x) && x.sets.some(t => !t.done)) ? A.prevId : null} />
      })}
      {/* dark like the cards: tinted (yellow on yellow) vanished into the workout background */}
      <Button size="lg" className="w-full bg-card text-foreground hover:bg-card" onClick={add}><Icon name="plus" />{t('Aggiungi a {0}', t(label(view)))}</Button>
    </div>
  </div>
}
