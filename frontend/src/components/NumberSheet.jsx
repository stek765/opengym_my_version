import { useState } from 'react'
import { useUI } from '../store/useUI.js'
import { num } from '../lib/format.js'
import { Button } from '@/components/ui/button'
import { Delete } from 'lucide-react'
import { t } from '../lib/i18n.js'

const STEPS = { w: [-5, -2.5, -1, 1, 2.5, 5], r: [-2, -1, 1, 2] }

// Weight or reps of one set. The first keypad tap replaces the value; the steps adjust it.
function NumberSheet({ title, value, field, steps = STEPS[field], later, onDone, close }) {
  const [v, setV] = useState(value == null ? '' : String(value))
  const [fresh, setFresh] = useState(true)
  const n = parseFloat(v.replace(',', '.')) || 0
  const key = k => {
    if (k === '⌫') { setV(fresh ? '' : v.slice(0, -1)); setFresh(false); return }
    setV((fresh ? '' : v) + k); setFresh(false)
  }
  const done = alsoLater => { onDone(v === '' ? null : n, alsoLater); close() }
  return <div>
    <div className="truncate text-center text-[13px] text-muted-foreground">{title}</div>
    <div className="my-2 text-center text-[44px] font-semibold leading-tight tabular-nums tracking-tight">
      {v === '' ? '—' : v.replace('.', ',')}{field === 'w' && <span className="text-lg font-medium text-muted-foreground"> kg</span>}
    </div>
    <div className="mb-3 flex gap-2">{steps.map(d => <Button key={d} variant="secondary" className="h-11 flex-1 px-0 text-[15px] font-semibold tabular-nums text-tinta"
      onClick={() => { setV(num(Math.max(0, Math.round((n + d) * 100) / 100))); setFresh(true) }}>{d > 0 ? '+' : '−'}{num(Math.abs(d))}</Button>)}</div>
    <div className="grid grid-cols-3 gap-2">{['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(k => k === ',' && field === 'r'
      ? <span key={k} />
      : <button key={k} aria-label={k === '⌫' ? 'backspace' : undefined} onClick={() => key(k)}
        className="flex h-14 items-center justify-center rounded-xl bg-raised text-2xl font-medium tabular-nums transition-colors active:bg-foreground/20">
        {k === '⌫' ? <Delete size={24} strokeWidth={1.8} /> : k}
      </button>)}</div>
    <div className="mt-3 flex gap-2">
      {later ? <>
        <Button size="lg" variant="secondary" className="flex-1" onClick={() => done(false)}>{t('Solo questa')}</Button>
        <Button size="lg" className="flex-1" onClick={() => done(true)}>{t('Anche le dopo')}</Button>
      </> : <Button size="lg" className="w-full" onClick={() => done(false)}>{t('Fatto')}</Button>}
    </div>
  </div>
}

export const openNumber = props => useUI.getState().openSheet(close => <NumberSheet {...props} close={close} />)
