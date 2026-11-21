import { useRef, useState } from 'react'
import { useUI } from '../store/useUI.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { t } from '../lib/i18n.js'

// danger: the risky choice is the red one and "keep" is the primary, so a hurried tap is the safe one.
export function confirmAsk(title, okText, onOk, { danger, cancelText } = {}) {
  useUI.getState().openSheet(close => <div>
    <div className="mb-5 text-lg font-semibold leading-snug">{title}</div>
    <div className="flex gap-2">
      <Button size="lg" variant={danger ? 'default' : 'secondary'} className="flex-1" onClick={close}>{cancelText || t('Annulla')}</Button>
      <Button size="lg" variant={danger ? 'destructive' : 'default'} className="flex-1" onClick={() => { close(); onOk() }}>{okText}</Button>
    </div>
  </div>)
}

// danger = { label, run }: a red link at the bottom of the sheet, away from Salva (e.g. delete).
function Prompt({ title, value, onOk, danger, close }) {
  const [v, setV] = useState(value || '')
  const save = e => { e.preventDefault(); if (v.trim()) { close(); onOk(v.trim()) } }
  return <form onSubmit={save}>
    <div className="mb-3 text-lg font-semibold">{title}</div>
    <Input autoFocus enterKeyHint="done" value={v} onChange={e => setV(e.target.value)}
      className="h-12 rounded-xl border-0 bg-raised px-4 text-[17px] md:text-[17px] focus-visible:border-transparent focus-visible:ring-0 dark:bg-raised" />
    <Button type="submit" size="lg" className="mt-4 w-full" disabled={!v.trim()}>{t('Salva')}</Button>
    {danger && <Button type="button" variant="ghost" className="mt-2 w-full text-destructive hover:text-destructive" onClick={() => { close(); danger.run() }}>{danger.label}</Button>}
  </form>
}
export const promptAsk = (title, value, onOk, opts) => useUI.getState().openSheet(close => <Prompt title={title} value={value} onOk={onOk} danger={opts?.danger} close={close} />)

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
