import { useLayoutEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'
import { Button } from '@/components/ui/button'
import { t } from '../lib/i18n.js'

const ROW = 44 // px, must match the h-11 of a wheel row
const MINS = Array.from({ length: 10 }, (_, i) => i)
const SECS = Array.from({ length: 12 }, (_, i) => i * 5)

// Native scroll-snap does the "combination lock" feel; the value is read once, on Done.
function Wheel({ items, start, wheelRef }) {
  useLayoutEffect(() => { wheelRef.current.scrollTop = start * ROW }, [])
  return <div ref={wheelRef} data-nodrag
    className="box-border h-[132px] w-[76px] snap-y snap-mandatory overflow-y-scroll py-11 [mask-image:linear-gradient(transparent,#000_35%,#000_65%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map(v => <div key={v} className="flex h-11 snap-center items-center justify-center text-[30px] font-semibold tabular-nums">{String(v).padStart(2, '0')}</div>)}
  </div>
}

function RestPicker({ left, close }) {
  const m = useRef(null), s = useRef(null)
  const r5 = Math.min(Math.round(left / 5) * 5, 9 * 60 + 55)
  const idx = el => Math.round(el.current.scrollTop / ROW)
  const done = () => {
    const sec = MINS[idx(m)] * 60 + SECS[idx(s)]
    // startRest also re-schedules the server push; it works even if the rest ran out meanwhile
    if (sec > 0) useUI.getState().startRest(sec)
    else useUI.getState().stopRest()
    close()
  }
  return <div>
    <div className="mb-2 text-lg font-semibold">{t('Recupero restante')}</div>
    <div className="relative isolate mb-4 flex items-center justify-center gap-1.5">
      <div className="absolute inset-x-[18%] top-1/2 -z-10 h-11 -translate-y-1/2 rounded-xl bg-raised" />
      <Wheel items={MINS} start={Math.floor(r5 / 60)} wheelRef={m} />
      <b className="text-[30px] font-semibold">:</b>
      <Wheel items={SECS} start={(r5 % 60) / 5} wheelRef={s} />
    </div>
    <Button size="lg" className="w-full" onClick={done}>{t('Fatto')}</Button>
  </div>
}

export default function RestStrip() {
  const timer = useUI(s => s.timer)
  const { stopRest, addRest } = useUI.getState()
  if (!timer) return null
  const m = Math.floor(timer.left / 60), s = String(timer.left % 60).padStart(2, '0')
  const pick = () => useUI.getState().openSheet(close => <RestPicker left={useUI.getState().timer?.left || 0} close={close} />)
  // One root in both states (same height), so nothing under the strip moves when the rest runs out,
  // and only the buttons react: a stray tap on the strip does nothing.
  return <div className={'relative mt-3 flex h-16 items-center gap-2 overflow-hidden rounded-xl px-2 duration-200 animate-in fade-in ' + (timer.over ? 'bg-success/15' : 'bg-raised')}>
    {timer.over ? <>
      <b className="flex-1 pl-2 text-[28px] font-semibold text-success">{t('Via!')}</b>
      <Button variant="secondary" className="bg-success/20 text-success" onClick={stopRest}>{t('Salta')}</Button>
    </> : <>
      <Button variant="ghost" size="icon" className="bg-foreground/10 text-[15px] font-semibold tabular-nums" aria-label="-15 s" onClick={() => addRest(-15)}>−15</Button>
      <button className="h-11 flex-1 text-center text-[28px] font-semibold tabular-nums active:opacity-60" aria-label={t('Recupero restante')} onClick={pick}>{m}:{s}</button>
      <Button variant="ghost" size="icon" className="bg-foreground/10 text-[15px] font-semibold tabular-nums" aria-label="+15 s" onClick={() => addRest(15)}>+15</Button>
      <Button variant="ghost" className="text-tinta" onClick={stopRest}>{t('Salta')}</Button>
      <i className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-primary transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${timer.left / timer.total})` }} />
    </>}
  </div>
}
