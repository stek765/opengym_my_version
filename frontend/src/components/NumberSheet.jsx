import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { num } from '../lib/format.js'
import { t } from '../lib/i18n.js'

const STEPS = { w: [-5, -2.5, -1, 1, 2.5, 5], r: [-2, -1, 1, 2] }

// Weight or reps of one set. The first keypad tap replaces the value; the steps adjust it.
function NumberSheet({ title, value, field, later, onDone, close }) {
  const [v, setV] = useState(value == null ? '' : String(value))
  const [fresh, setFresh] = useState(true)
  const n = parseFloat(v.replace(',', '.')) || 0
  const key = k => {
    if (k === '⌫') { setV(fresh ? '' : v.slice(0, -1)); setFresh(false); return }
    if (k === ',' && field === 'r') return
    setV((fresh ? '' : v) + k); setFresh(false)
  }
  const done = alsoLater => { onDone(v === '' ? null : n, alsoLater); close() }
  return <div className="ns">
    <div className="t">{title}</div>
    <div className="val">{v === '' ? '—' : v.replace('.', ',')}{field === 'w' && <small className="mu" style={{ fontSize: 18, fontWeight: 500 }}> kg</small>}</div>
    <div className="chips">{STEPS[field].map(d => <button key={d} onClick={() => { setV(num(Math.max(0, Math.round((n + d) * 100) / 100))); setFresh(true) }}>{d > 0 ? '+' : '−'}{num(Math.abs(d))}</button>)}</div>
    <div className="pad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(k => <button key={k} onClick={() => key(k)}>{k}</button>)}</div>
    <div className="two">
      {later ? <>
        <button className="btn" onClick={() => done(false)}>{t('Solo questa')}</button>
        <button className="btn primary" onClick={() => done(true)}>{t('Anche le dopo')}</button>
      </> : <button className="btn primary" onClick={() => done(false)}>{t('Fatto')}</button>}
    </div>
  </div>
}

export const openNumber = props => useUI.getState().openSheet(close => <NumberSheet {...props} close={close} />)
