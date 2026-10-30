import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { exOr } from '../lib/exercises.js'
import { t } from '../lib/i18n.js'

// The library's own muscle names: the coach answers with one of these, so "serie per muscolo"
// never splits the same muscle into an English and an Italian group.
export const MUSCLES = ['pectorals', 'delts', 'lats', 'upper back', 'traps', 'biceps', 'triceps', 'forearms', 'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']

export default function MuscleTag({ S, id }) {
  const update = useStore(s => s.update)
  const ex = (S.customEx || []).find(e => e.id === id) || exOr(id)
  const m = S.muscles?.[id] || ex.tg || ''
  const pick = () => useUI.getState().openSheet(close => <div>
    <div className="eb">{t('Muscolo principale')}</div>
    {MUSCLES.map(x => <button key={x} className="line" onClick={() => { update(s => { s.muscles = { ...s.muscles, [id]: x } }); close() }}><span>{t(x)}</span>{x === m && <span className="r">✓</span>}</button>)}
  </div>)
  return <button className="tag" onClick={pick}>{m ? t(m) : t('muscolo?')}</button>
}
