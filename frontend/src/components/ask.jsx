import { useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'

export function confirmAsk(title, okText, onOk) {
  useUI.getState().openSheet(close => <div>
    <div style={{ fontSize: 18, fontWeight: 600, margin: '4px 0 18px' }}>{title}</div>
    <div className="row"><button className="btn" onClick={close}>{t('Annulla')}</button><button className="btn primary" onClick={() => { close(); onOk() }}>{okText}</button></div>
  </div>)
}

function Prompt({ title, value, onOk, close }) {
  const [v, setV] = useState(value || '')
  return <div>
    <div className="eb">{title}</div>
    <input className="field" autoFocus value={v} onChange={e => setV(e.target.value)} />
    <div style={{ height: 14 }} />
    <button className="btn primary" disabled={!v.trim()} onClick={() => { close(); onOk(v.trim()) }}>{t('Salva')}</button>
  </div>
}
export const promptAsk = (title, value, onOk) => useUI.getState().openSheet(close => <Prompt title={title} value={value} onOk={onOk} close={close} />)

// Press-and-hold handlers: fires after 550 ms unless the finger lifts or moves away first.
export function useLongPress(fn) {
  const t = useRef(null)
  const cancel = () => clearTimeout(t.current)
  return {
    onPointerDown: () => { cancel(); t.current = setTimeout(fn, 550) },
    onPointerUp: cancel, onPointerLeave: cancel, onPointerCancel: cancel,
    onContextMenu: e => e.preventDefault()
  }
}
