import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { displayName, routineColor, PALETTE, PHASES, phaseOf, byPhase } from '../lib/training.js'
import { startSession } from '../lib/session.js'
import { uid } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import Bar from '../components/Bar.jsx'
import { openPicker } from '../components/ExercisePicker.jsx'
import { promptAsk } from '../components/ask.jsx'
import { newExercise } from '../components/newExercise.jsx'
import { t } from '../lib/i18n.js'
import { lastDone, lastLine, pics, nEsercizi } from './Train.jsx'
import { Button } from '@/components/ui/button'
import ExerciseInfo from '../components/ExerciseInfo.jsx'
import Phases, { PHASE_CHIP } from '../components/Phases.jsx'

const HEAD = 'px-1 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground'

const ROW = 44   // px, one wheel row (h-11)
const range = (a, b, s = 1) => Array.from({ length: (b - a) / s + 1 }, (_, i) => a + i * s)
const SETS = range(1, 10), REPS = range(1, 50), SECS = range(5, 600, 5)
const isTimed = id => EXIDX[id]?.kind === 'time'
const newEx = (id, ph) => ({ id, ph, sets: 3, reps: isTimed(id) ? 30 : 10, weight: null })
const undoToast = (msg, run) => useUI.getState().toast(msg, { label: t('Annulla'), run })

// Scroll-snap wheel; onPick gets the value it settles on.
function Wheel({ items, value, onPick }) {
  const ref = useRef(null)
  useLayoutEffect(() => { ref.current.scrollTop = items.reduce((b, v, k) => (Math.abs(v - value) < Math.abs(items[b] - value) ? k : b), 0) * ROW }, [])
  const read = () => onPick(items[Math.max(0, Math.min(items.length - 1, Math.round(ref.current.scrollTop / ROW)))])
  return <div ref={ref} data-nodrag onScroll={read} className="h-[132px] w-[76px] snap-y snap-mandatory overflow-y-scroll py-11 [mask-image:linear-gradient(transparent,#000_35%,#000_65%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map(v => <div key={v} className="flex h-11 snap-center items-center justify-center text-[28px] font-semibold tabular-nums">{v}</div>)}
  </div>
}

// One exercise of the routine, opened: how it's done, its sets × reps, its phase, and Togli.
// Reads the routine from the store, so the phase chips follow a change. The wheels save on
// their own when the sheet goes away, swipe included: nothing is lost by not tapping Fatto.
function ExSheet({ rid, exId, mut, remove, close }) {
  const S = useStore(s => s.S)
  const r = S.routines.find(x => x.id === rid), e = r?.ex.find(x => x.id === exId)
  const pick = useRef({})
  useEffect(() => () => {
    const { sets, reps } = pick.current
    if (sets != null || reps != null) mut(x => { const y = x.ex.find(z => z.id === exId); if (y) { if (sets != null) y.sets = sets; if (reps != null) y.reps = reps } })
  }, [])
  if (!e) return null
  const check = (S.customEx || []).find(c => c.id === exId)?.kind === 'check'
  const ph = phaseOf(S, e, r)
  return <div className="-mx-5 max-h-[85vh] overflow-y-auto overscroll-contain px-5" data-nodrag>
    <ExerciseInfo S={S} id={exId} />
    {!check && <div className="mb-4 rounded-2xl bg-raised pb-2 pt-3">
      <div className="relative isolate flex items-center justify-center gap-2">
        <div className="absolute inset-x-[18%] top-1/2 -z-10 h-11 -translate-y-1/2 rounded-xl bg-foreground/10" />
        <Wheel items={SETS} value={e.sets} onPick={v => { pick.current.sets = v }} /><b className="text-[28px] font-semibold">×</b><Wheel items={isTimed(exId) ? SECS : REPS} value={e.reps} onPick={v => { pick.current.reps = v }} />
      </div>
      <div className="mt-1 flex justify-center gap-8 text-[13px] text-muted-foreground"><span className="w-[76px] text-center">{t('serie')}</span><span className="w-[76px] text-center">{t(isTimed(exId) ? 'secondi' : 'ripetizioni')}</span></div>
    </div>}
    <div className={HEAD}>{t('Fase')}</div>
    <div className="mb-5 flex flex-wrap gap-1.5">{PHASES.map(([p, label]) => <Button key={p} size="sm" variant={p === ph ? 'default' : 'secondary'} aria-pressed={p === ph} className="h-8 rounded-full px-3 text-[14px]"
      onClick={() => mut(x => { const y = x.ex.find(z => z.id === exId); if (y) y.ph = p })}>{t(label)}</Button>)}</div>
    <div className="sticky bottom-0 bg-popover pb-1 pt-2">
      <Button size="lg" className="w-full" onClick={close}>{t('Fatto')}</Button>
      <Button variant="ghost" className="mt-1 w-full text-destructive hover:text-destructive" onClick={() => { close(); remove(exId) }}><Icon name="trash" size={18} />{t('Togli dalla scheda')}</Button>
    </div>
  </div>
}

export function RoutineEditor({ id, back }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [dr, setDr] = useState(null)        // the row being dragged: { i, y0, dy, h, mids }
  const [gone, setGone] = useState(null)    // id of the row collapsing out
  const [fresh, setFresh] = useState([])    // ids just added: they rise in
  const r = S.routines.find(x => x.id === id)
  // opens on the first phase that has something; a new routine on Mobilità, where the day starts
  const [ph, setPh] = useState(() => byPhase(S, r).find(([, xs]) => xs.length)?.[0] || 'mob')
  const listRef = useRef(null), left = useRef(false)
  useEffect(() => { if (!r && !left.current) { left.current = true; back() } })
  if (!r) return null

  const mut = fn => update(s => { const r = s.routines.find(x => x.id === id); if (r) fn(r) })
  const list = r.ex.filter(x => phaseOf(S, x, r) === ph)
  // i, j are positions within the phase on screen; the other phases keep their slots in r.ex
  const move = (i, j) => mut(x => {
    const slots = x.ex.map((e, k) => (phaseOf(S, e, x) === ph ? k : -1)).filter(k => k >= 0)
    if (j < 0 || j >= slots.length) return
    const items = slots.map(k => x.ex[k]), [e] = items.splice(i, 1)
    items.splice(j, 0, e)
    slots.forEach((k, n) => { x.ex[k] = items[n] })
  })
  const remove = exId => {
    const i = r.ex.findIndex(y => y.id === exId), e = r.ex[i]
    if (!e) return
    setGone(exId)
    setTimeout(() => {
      setGone(null)
      mut(x => { x.ex = x.ex.filter(y => y.id !== exId) })
      undoToast(t('«{0}» tolto', displayName(S, exId)), () => mut(x => { if (!x.ex.some(y => y.id === exId)) x.ex.splice(Math.min(i, x.ex.length), 0, e) }))
    }, 200)
  }
  const open = exId => useUI.getState().openSheet(close => <ExSheet rid={id} exId={exId} mut={mut} remove={remove} close={close} />)
  const add = () => openPicker({
    S, multi: true, has: r.ex.map(e => e.id), chip: PHASE_CHIP[ph],
    onPickMany: ids => { mut(x => { ids.forEach(i => { if (!x.ex.some(e => e.id === i)) x.ex.push(newEx(i, ph)) }) }); setFresh(ids) },
    onCreate: name => {
      const exId = newExercise(name, (from, to) => mut(x => { if (!x || from === to) return; if (x.ex.some(y => y.id === to)) x.ex = x.ex.filter(y => y.id !== from); else { const e = x.ex.find(y => y.id === from); if (e) e.id = to } }))
      mut(x => { x.ex.push(newEx(exId, ph)) }); setFresh(f => [...f, exId])
    }
  })
  // Deleting goes back to the list at once; the toast can put it back where it was.
  const del = () => {
    const i = S.routines.indexOf(r)
    update(s => { s.routines = s.routines.filter(x => x.id !== id) })
    undoToast(t('«{0}» eliminata', r.name), () => update(s => { if (!s.routines.some(x => x.id === id)) s.routines.splice(i, 0, r) }))
  }
  const rename = () => promptAsk(t('Nome scheda'), r.name, v => mut(x => { x.name = v }), { danger: { label: t('Elimina scheda'), run: del } })
  const color = routineColor(S, id)
  const colors = () => useUI.getState().openSheet(close => <div>
    <div className="mb-4 text-lg font-semibold">{t('Colore')}</div>
    <div className="mb-2 flex flex-wrap gap-3">{PALETTE.map(c => <button key={c} aria-label={c} className={'size-10 rounded-full ring-offset-[3px] ring-offset-card ' + (c === color ? 'ring-2 ring-foreground' : '')} style={{ background: c }} onClick={() => { mut(x => { x.color = c }); close() }} />)}</div>
  </div>)
  const start = () => { update(s => { s.active = startSession(s, r) }); nav('/allenamento') }

  // Drag by the grip: the row follows the finger, the others slide out of its way; the order changes on release.
  const down = (i, ev) => {
    ev.stopPropagation()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    const rows = [...listRef.current.children]
    setDr({ i, y0: ev.clientY, dy: 0, h: rows[i].offsetHeight, mids: rows.map(el => el.offsetTop + el.offsetHeight / 2) })
  }
  const to = dr ? dr.mids.filter((m, k) => k !== dr.i && m < dr.mids[dr.i] + dr.dy).length : -1
  const up = () => { if (!dr) return; const { i } = dr; setDr(null); if (to !== i) move(i, to) }
  const shift = k => !dr ? undefined : k === dr.i ? { transform: `translateY(${dr.dy}px)` }
    : { transform: k > dr.i && k <= to ? `translateY(${-dr.h}px)` : k < dr.i && k >= to ? `translateY(${dr.h}px)` : 'none', transition: 'transform .18s cubic-bezier(.2,.8,.2,1)' }
  const n = r.ex.length
  const ph0 = PHASES.find(p => p[0] === ph)[1]
  const counts = Object.fromEntries(byPhase(S, r).map(([p, xs]) => [p, { n: xs.length }]))
  const line = e => (S.customEx || []).find(c => c.id === e.id)?.kind === 'check' ? t('da spuntare') : `${e.sets} × ${e.reps}${isTimed(e.id) ? ' s' : ''}`

  return <div className="narrow">
    <Bar title={r.name} back={{ label: t('Schede'), onClick: back }} large={false} />
    <section className="pb-4 pt-2">
      <div className="flex items-center gap-2">
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left active:opacity-60" onClick={rename}>
          <h1 className="m-0 truncate text-[28px] font-bold leading-tight tracking-tight">{r.name}</h1><Icon name="pencil" size={18} className="shrink-0 text-muted-foreground" />
        </button>
        <button className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full active:opacity-60" aria-label={t('Colore')} onClick={colors}><i className="size-5 rounded-full" style={{ background: color }} /></button>
      </div>
      <div className="mt-0.5 text-[14px] text-muted-foreground">{nEsercizi(n)}</div>
    </section>
    <div className="mb-3"><Phases value={ph} onChange={p => { setPh(p); setFresh([]) }} items={counts} /></div>
    <section key={ph} className="rounded-2xl bg-card duration-200 animate-in fade-in">
      <div ref={listRef}>{list.map((e, k) => <div key={e.id} style={shift(k)} role="button" onClick={() => open(e.id)}
        className={'group relative flex max-h-24 min-h-[64px] cursor-pointer select-none items-center pl-4 transition-[max-height,min-height,opacity] duration-200 active:bg-raised '
          + (dr?.i === k ? 'z-10 rounded-xl bg-raised shadow-[0_10px_28px_rgba(0,0,0,.5)] ' : '')
          + (gone === e.id ? 'pointer-events-none max-h-0 min-h-0 overflow-hidden opacity-0 ' : '')
          + (fresh.includes(e.id) ? 'duration-300 animate-in fade-in slide-in-from-bottom-1 ' : '')}>
        <Thumb id={e.id} size={44} />
        <div className={'ml-3 flex min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border group-first:border-t-0 ' + (dr?.i === k ? 'border-transparent' : '')}>
          <div className="min-w-0 flex-1 py-2">
            <div className="line-clamp-2 text-[16px] leading-tight">{displayName(S, e.id)}</div>
            <div className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">{line(e)}</div>
          </div>
          <button className="flex h-11 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60" aria-label={t('Sposta')} onClick={ev => ev.stopPropagation()} onPointerDown={ev => down(k, ev)} onPointerMove={ev => dr && setDr({ ...dr, dy: ev.clientY - dr.y0 })}
            onPointerUp={up} onPointerCancel={up} onKeyDown={ev => { if (ev.key === 'ArrowUp') move(k, k - 1); if (ev.key === 'ArrowDown') move(k, k + 1) }}><Icon name="grip" size={20} /></button>
        </div>
      </div>)}</div>
      {!list.length && <div className="px-4 pb-1 pt-3 text-[15px] text-muted-foreground">{t('Niente in {0}', t(ph0))}</div>}
      <button className={'flex min-h-11 w-full items-center gap-3 px-4 text-[16px] text-tinta active:opacity-60 ' + (list.length ? 'border-t border-border' : '')} onClick={add}><Icon name="plus" size={20} />{t('Aggiungi a {0}', t(ph0))}</button>
    </section>
    {n > 0 && <Button size="lg" className="mt-6 w-full" onClick={start}><Icon name="play" size={18} fill="currentColor" />{t('Inizia questa scheda')}</Button>}
  </div>
}

// The editor by URL (/progressi/scheda/:id): back returns to the list it came from.
export function RoutinePage() {
  const { id } = useParams()
  const nav = useNavigate(), loc = useLocation()
  return <RoutineEditor id={id} back={() => (loc.key !== 'default' ? nav(-1) : nav('/progressi', { replace: true }))} />
}

// All routines in one list. A new one takes the first colour nobody uses.
// Opening one goes through the URL, so the editor has its own address and #app starts at the top.
export function RoutineList() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const open = id => nav('/progressi/scheda/' + id)
  const create = () => promptAsk(t('Nome della nuova scheda'), '', name => {
    const id = uid()
    const used = new Set(S.routines.map(r => routineColor(S, r.id)))
    update(s => { s.routines.push({ id, name, ex: [], color: PALETTE.find(c => !used.has(c)) || PALETTE[0] }) })
    open(id)
  })
  // One list: every routine is a whole day now.
  return <>
    <div className="overflow-hidden rounded-2xl bg-card">{!S.routines.length && <div className="px-4 py-3 text-[15px] text-muted-foreground">{t('Nessuna scheda')}</div>}{S.routines.map(r => <button key={r.id} className="group flex min-h-[64px] w-full items-center pl-4 text-left active:bg-raised" onClick={() => open(r.id)}>
      <Thumb id={pics(S, r)[0]} size={44} />
      <span className="ml-3 flex min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border py-2.5 pr-3 group-first:border-t-0">
        <span className="min-w-0 flex-1"><span className="block truncate text-[16px] font-medium">{r.name}</span><span className="block truncate text-[13px] text-muted-foreground">{lastLine(r.ex.length, lastDone(S, r.id))}</span></span>
        <Icon name="chevronRight" size={18} className="shrink-0 text-muted-foreground/60" />
      </span>
    </button>)}</div>
    <button className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-2xl bg-card px-4 text-[16px] text-tinta active:bg-raised" onClick={create}><Icon name="plus" size={20} />{t('Nuova scheda')}</button>
  </>
}
