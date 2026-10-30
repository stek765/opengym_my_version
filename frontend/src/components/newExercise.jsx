import { useStore } from '../store/useStore.js'
import { classify } from '../lib/coach-api.js'
import { displayName } from '../lib/training.js'
import { uid } from '../lib/format.js'
import { confirmAsk } from './ask.jsx'
import { t } from '../lib/i18n.js'

// A typed exercise is created at once; then the coach checks (in the background) whether it
// is one the user already has, and which muscle it trains. replace(oldId, newId) swaps it in.
export function newExercise(name, replace) {
  const id = 'c_' + uid()
  useStore.getState().update(s => { s.customEx = [...s.customEx, { id, n: name }] })
  classify(name).then(({ matchId, muscle }) => {
    const S = useStore.getState().S
    if (matchId && matchId !== id) confirmAsk(t('Intendi «{0}», che hai già?', displayName(S, matchId)), t('Sì, è quello'), () => replace(id, matchId))
    if (muscle) useStore.getState().update(s => { s.muscles = { ...s.muscles, [id]: muscle } })
  }).catch(() => {})   // coach off or offline: the exercise just has no muscle tag yet
  return id
}
