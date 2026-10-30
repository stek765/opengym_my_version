import { openNumber } from '../components/NumberSheet.jsx'
import { withWeight } from './training.js'
import { todayISO } from './format.js'
import { t } from './i18n.js'

// The sheet to log today's body weight; starts from the last one so a change is a few taps.
export const openWeight = (S, update) => openNumber({
  title: t('Peso di oggi'), value: (S.bodyweight || []).at(-1)?.w ?? null, field: 'w',
  onDone: w => w && update(s => { s.bodyweight = withWeight(s.bodyweight, w, todayISO()) })
})
