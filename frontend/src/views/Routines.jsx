import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { displayName, routineColor, PALETTE, CATS, catOf, setCat } from '../lib/training.js'
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
import { lastDone, lastLine, pics } from './Train.jsx'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SEG, SEGT } from './ExerciseDetail.jsx'

const HEAD = 'px-1 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground'

const ROW = 44   // px, one wheel row (h-11)
const range = (a, b, s = 1) => Array.from({ length: (b - a) / s + 1 }, (_, i) => a + i * s)
const SETS = range(1, 10), REPS = range(1, 50), SECS = range(5, 600, 5)
const isTimed = id => EXIDX[id]?.kind === 'time'
const newEx = id => ({ id, sets: 3, reps: isTimed(id) ? 30 : 10, weight: null })
const undoToast = (msg, run) => useUI.getState().toast(msg, { label: t('Annulla'), run })

// Scroll-snap wheel, read once on Fatto (same feel as the rest picker).
function Wheel({ items, value, wref }) {
  useLayoutEffect(() => { wref.current.scrollTop = items.reduce((b, v, k) => (Math.abs(v - value) < Math.abs(items[b] - value) ? k : b), 0) * ROW }, [])
  return <div ref={wref} data-nodrag className="h-[132px] w-[76px] snap-y snap-mandatory overflow-y-scroll py-11 [mask-image:linear-gradient(transparent,#000_35%,#000_65%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map(v => <div key={v} className="flex h-11 snap-center items-center justify-center text-[28px] font-semibold tabular-nums">{v}</div>)}
  </div>
}

// Sets and reps of one exercise together; "Togli" lives here instead of an × on every row.
function SetsSheet({ name, e, check, onDone, onRemove, close }) {
  const s = useRef(null), r = useRef(null)
  const reps = isTimed(e.id) ? SECS : REPS
  const at = (el, items) => items[Math.max(0, Math.min(items.length - 1, Math.round(el.current.scrollTop / ROW)))]
  return <div>
    <div className="mb-3 text-lg font-semibold">{name}</div>
    {!check && <>
      <div className="relative isolate flex items-center justify-center gap-2">
        <div className="absolute inset-x-[18%] top-1/2 -z-10 h-11 -translate-y-1/2 rounded-xl bg-raised" />
        <Wheel items={SETS} value={e.sets} wref={s} /><b className="text-[28px] font-semibold">×</b><Wheel items={reps} value={e.reps} wref={r} />
      </div>
      <div className="mb-5 mt-1 flex justify-center gap-8 text-[13px] text-muted-foreground"><span className="w-[76px] text-center">{t('serie')}</span><span className="w-[76px] text-center">{t(isTimed(e.id) ? 'secondi' : 'ripetizioni')}</span></div>
      <Button size="lg" className="w-full" onClick={() => { onDone(at(s, SETS), at(r, reps)); close() }}>{t('Fatto')}</Button>
    </>}
    <Button variant="ghost" className="mt-2 w-full text-destructive" onClick={() => { close(); onRemove() }}><Icon name="trash" size={18} />{t('Togli')}</Button>
  </div>
}

export function RoutineEditor({ id, back }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [dr, setDr] = useState(null)        // the row being dragged: { i, y0, dy, h, mids }
  const [gone, setGone] = useState(null)    // id of the row collapsing out
  const [fresh, setFresh] = useState([])    // ids just added: they rise in
  const listRef = useRef(null), left = useRef(false)
  const r = S.routines.find(x => x.id === id)
  useEffect(() => { if (!r && !left.current) { left.current = true; back() } })
  if (!r) return null

  const mut = fn => update(s => { const r = s.routines.find(x => x.id === id); if (r) fn(r) })
  const move = (i, j) => mut(x => { if (j < 0 || j >= x.ex.length) return; const [e] = x.ex.splice(i, 1); x.ex.splice(j, 0, e) })
  const isCheck = exId => (S.customEx || []).find(c => c.id === exId)?.kind === 'check'
  const remove = i => {
    const e = r.ex[i]
    setGone(e.id)
    setTimeout(() => {
      setGone(null)
      mut(x => { x.ex = x.ex.filter(y => y.id !== e.id) })
      undoToast(t('«{0}» tolto', displayName(S, e.id)), () => mut(x => { if (!x.ex.some(y => y.id === e.id)) x.ex.splice(Math.min(i, x.ex.length), 0, e) }))
    }, 200)
  }
  const sets = i => useUI.getState().openSheet(close => <SetsSheet name={displayName(S, r.ex[i].id)} e={r.ex[i]} check={isCheck(r.ex[i].id)} close={close}
    onDone={(n, reps) => mut(x => { x.ex[i].sets = n; x.ex[i].reps = reps })} onRemove={() => remove(i)} />)
  const add = () => openPicker({
    S, multi: true, has: r.ex.map(e => e.id),
    onPickMany: ids => { mut(x => { ids.forEach(i => { if (!x.ex.some(e => e.id === i)) x.ex.push(newEx(i)) }) }); setFresh(ids) },
    onCreate: name => {
      const exId = newExercise(name, (from, to) => mut(x => { if (!x || from === to) return; if (x.ex.some(y => y.id === to)) x.ex = x.ex.filter(y => y.id !== from); else { const e = x.ex.find(y => y.id === from); if (e) e.id = to } }))
      mut(x => { x.ex.push(newEx(exId)) }); setFresh(f => [...f, exId])
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
    ev.currentTarget.setPointerCapture(ev.pointerId)
    const rows = [...listRef.current.children]
    setDr({ i, y0: ev.clientY, dy: 0, h: rows[i].offsetHeight, mids: rows.map(el => el.offsetTop + el.offsetHeight / 2) })
  }
  const to = dr ? dr.mids.filter((m, k) => k !== dr.i && m < dr.mids[dr.i] + dr.dy).length : -1
  const up = () => { if (!dr) return; const { i } = dr; setDr(null); if (to !== i) move(i, to) }
  const shift = k => !dr ? undefined : k === dr.i ? { transform: `translateY(${dr.dy}px)` }
    : { transform: k > dr.i && k <= to ? `translateY(${-dr.h}px)` : k < dr.i && k >= to ? `translateY(${dr.h}px)` : 'none', transition: 'transform .18s cubic-bezier(.2,.8,.2,1)' }
  const n = r.ex.length
  const ph = pics(S, r).slice(0, 4)

  return <div className="narrow">
    <Bar title={r.name} back={{ label: t('Schede'), onClick: back }} large={false} />
    <section className="pb-6 pt-2">
      {ph.length > 0 && <div className="mb-3 flex gap-1.5">{ph.map(x => <Thumb key={x} id={x} size={44} />)}</div>}
      <button className="flex max-w-full items-center gap-2 text-left active:opacity-60" onClick={rename}>
        <h1 className="m-0 truncate text-[28px] font-bold leading-tight tracking-tight">{r.name}</h1><Icon name="pencil" size={18} className="shrink-0 text-muted-foreground" />
      </button>
      <div className="mt-3 flex items-center gap-2">
        <button className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full active:opacity-60" aria-label={t('Colore')} onClick={colors}><i className="size-5 rounded-full" style={{ background: color }} /></button>
        <Tabs value={catOf(r)} onValueChange={v => mut(x => setCat(x, v))} className="flex-1">
          <TabsList className={SEG}>
            <TabsTrigger value="forza" className={SEGT}>{t('Forza')}</TabsTrigger>
            <TabsTrigger value="mob" className={SEGT}>{t('Mobilità')}</TabsTrigger>
            <TabsTrigger value="stretch" className={SEGT}>{t('Stretching')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </section>
    <div className={HEAD}>{n === 1 ? t('1 esercizio') : t('{0} esercizi', n)}</div>
    <section className="rounded-2xl bg-card">
      <div ref={listRef}>{r.ex.map((e, k) => <div key={e.id} style={shift(k)}
        className={'group relative flex max-h-24 min-h-[60px] select-none items-center pl-4 transition-[max-height,min-height,opacity] duration-200 '
          + (dr?.i === k ? 'z-10 rounded-xl bg-raised shadow-[0_10px_28px_rgba(0,0,0,.5)] ' : '')
          + (gone === e.id ? 'pointer-events-none max-h-0 min-h-0 overflow-hidden opacity-0 ' : '')
          + (fresh.includes(e.id) ? 'duration-300 animate-in fade-in slide-in-from-bottom-1 ' : '')}>
        <Thumb id={e.id} size={40} />
        <div className={'ml-3 flex min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border group-first:border-t-0 ' + (dr?.i === k ? 'border-transparent' : '')}>
          <div className="min-w-0 flex-1 text-[16px] leading-tight">{displayName(S, e.id)}</div>
          <button className="h-8 min-w-16 shrink-0 rounded-full bg-raised px-3 text-[15px] font-medium tabular-nums active:opacity-60" onClick={() => sets(k)}>{isCheck(e.id) ? <Icon name="check" size={16} /> : <>{e.sets} × {e.reps}{isTimed(e.id) ? ' s' : ''}</>}</button>
          <button className="flex h-11 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground/60" aria-label={t('Sposta')} onPointerDown={ev => down(k, ev)} onPointerMove={ev => dr && setDr({ ...dr, dy: ev.clientY - dr.y0 })}
            onPointerUp={up} onPointerCancel={up} onKeyDown={ev => { if (ev.key === 'ArrowUp') move(k, k - 1); if (ev.key === 'ArrowDown') move(k, k + 1) }}><Icon name="grip" size={20} /></button>
        </div>
      </div>)}</div>
      <button className={'flex min-h-11 w-full items-center gap-3 px-4 text-[16px] text-tinta active:opacity-60 ' + (n ? 'border-t border-border' : '')} onClick={add}><Icon name="plus" size={20} />{t('Aggiungi esercizi')}</button>
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

// All routines in one list, gym first, then recovery. A new one takes the first colour nobody uses.
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
  // Name cards with the routine's colour as a stripe: no pictures, he recognises them by name.
  // An inset-grouped list: a tile in the routine's colour with the group's icon, name, last time.
  const group = (label, list) => <div key={label} className="mb-6">
    <div className={HEAD}>{label}</div>
    <div className="overflow-hidden rounded-2xl bg-card">{!list.length && <div className="px-4 py-3 text-[15px] text-muted-foreground">{t('Nessuna scheda')}</div>}{list.map(r => <button key={r.id} className="group flex min-h-[60px] w-full items-center pl-4 text-left active:bg-raised" onClick={() => open(r.id)}>
      <Thumb id={pics(S, r)[0]} size={40} />
      <span className="ml-3 flex min-w-0 flex-1 items-center gap-2 self-stretch border-t border-border py-2.5 pr-3 group-first:border-t-0">
        <span className="min-w-0 flex-1"><span className="block truncate text-[16px] font-medium">{r.name}</span><span className="block truncate text-[13px] text-muted-foreground">{lastLine(r.ex.length, lastDone(S, r.id))}</span></span>
        <Icon name="chevronRight" size={18} className="shrink-0 text-muted-foreground/60" />
      </span>
    </button>)}</div>
  </div>
  return <>
    {CATS.map(([c, label]) => group(t(label), S.routines.filter(r => catOf(r) === c)))}
    <button className="flex min-h-11 w-full items-center gap-3 rounded-2xl bg-card px-4 text-[16px] text-tinta active:bg-raised" onClick={create}><Icon name="plus" size={20} />{t('Nuova scheda')}</button>
  </>
}
