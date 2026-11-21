import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'

// The library's own muscle names: the coach answers with one of these, so "serie per muscolo"
// never splits the same muscle into an English and an Italian group.
export const MUSCLES = ['pectorals', 'delts', 'lats', 'upper back', 'traps', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']

const TAG = 'inline-flex h-6 shrink-0 items-center rounded-full bg-raised px-2.5 text-[13px] font-medium'

// readOnly: in the workout a tap on the tag must not open a sheet mid-set.
export default function MuscleTag({ S, id, readOnly }) {
  const update = useStore(s => s.update)
  const ex = (S.customEx || []).find(e => e.id === id) || exOr(id)
  const m = S.muscles?.[id] || ex.tg || ''
  const pick = () => useUI.getState().openSheet(close => <div>
    <div className="mb-3 text-lg font-semibold">{t('Muscolo principale')}</div>
    <div className="divide-y divide-border overflow-hidden rounded-2xl bg-raised">
      {MUSCLES.map(x => <button key={x} className="flex min-h-11 w-full items-center px-4 py-3 text-left text-[17px] active:bg-foreground/10"
        onClick={() => { update(s => { s.muscles = { ...s.muscles, [id]: x } }); close() }}>
        <span className="flex-1">{t(x)}</span>{x === m && <Icon name="check" size={18} className="text-tinta" />}
      </button>)}
    </div>
  </div>)
  if (readOnly) return m ? <span className={TAG + ' text-muted-foreground'}>{t(m)}</span> : null
  return <button className={TAG + ' relative after:absolute after:-inset-x-1 after:-inset-y-2.5 active:opacity-60' + (m ? ' text-muted-foreground' : ' text-tinta')} onClick={pick}>{m ? t(m) : t('muscolo?')}</button>
}
