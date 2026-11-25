import { PHASES } from '../lib/training.js'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'

// The picker opens already on the exercises that belong to the phase on screen.
export const PHASE_CHIP = { mob: ['ty', 'mob'], core: ['bp', 'waist'], rin: ['ty', 'rin'], stretch: ['ty', 'stretch'] }

// The five phases of the day side by side; only the chosen one is on screen below it.
// items: { [phase]: { n, done } }: n under the name, a check once done (in the workout).
// Phases with nothing in them are left out when hideEmpty (the workout); the editor shows all five.
export default function Phases({ value, onChange, items, hideEmpty }) {
  const list = PHASES.filter(([p]) => !hideEmpty || items[p]?.n)
  return <div className="grid gap-1 rounded-[12px] bg-black/25 p-1" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }}>
    {list.map(([p, label]) => {
      const it = items[p] || { n: 0 }, on = p === value
      return <button key={p} aria-pressed={on} onClick={() => onChange(p)}
        className={'flex min-w-0 flex-col items-center rounded-[9px] px-0.5 py-1.5 transition-colors active:opacity-70 ' + (on ? 'bg-white/90 text-black' : 'text-foreground')}>
        <span className="w-full truncate text-center text-[12px] font-semibold leading-tight">{t(label)}</span>
        <span className={'mt-0.5 flex h-4 items-center text-[12px] tabular-nums ' + (on ? 'text-black/60' : 'text-muted-foreground')}>
          {it.done ? <Icon name="check" size={14} strokeWidth={3} className={on ? 'text-black' : 'text-success'} /> : it.n}
        </span>
      </button>
    })}
  </div>
}
