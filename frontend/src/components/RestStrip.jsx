import { useLayoutEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'

const ROW = 44 // px, must match .wheel div height in index.css
const MINS = Array.from({ length: 10 }, (_, i) => i)
const SECS = Array.from({ length: 12 }, (_, i) => i * 5)

// Native scroll-snap does the "combination lock" feel; the value is read once, on Done.
function Wheel({ items, start, wheelRef }) {
  useLayoutEffect(() => { wheelRef.current.scrollTop = start * ROW }, [])
  return <div className="wheel" ref={wheelRef} data-nodrag>
    {items.map(v => <div key={v}>{String(v).padStart(2, '0')}</div>)}
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
  return <div className="ns">
    <div className="t">{t('Recupero restante')}</div>
    <div className="wheels">
      <Wheel items={MINS} start={Math.floor(r5 / 60)} wheelRef={m} />
      <b>:</b>
      <Wheel items={SECS} start={(r5 % 60) / 5} wheelRef={s} />
    </div>
    <button className="btn primary" style={{ width: '100%' }} onClick={done}>{t('Fatto')}</button>
  </div>
}

export default function RestStrip() {
  const timer = useUI(s => s.timer)
  const stop = useUI(s => s.stopRest)
  if (!timer) return null
  const m = Math.floor(timer.left / 60), s = String(timer.left % 60).padStart(2, '0')
  const pick = () => useUI.getState().openSheet(close => <RestPicker left={useUI.getState().timer?.left || 0} close={close} />)
  // Only "Salta" and the digits react: the rest of the strip is not a button, so a stray tap does nothing.
  return <div className="rest">
    <Icon name="timer" /><button className="rt" onClick={pick}>{m}:{s}</button><span>{t('recupero')}</span><button onClick={stop}>{t('Salta')}</button>
  </div>
}
