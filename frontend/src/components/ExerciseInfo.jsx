import { exOr } from '../lib/exercises.js'
import { displayName } from '../lib/training.js'
import { DESCR_IT } from '../lib/descr-it.js'
import { getLang, t } from '../lib/i18n.js'
import HowTo from './HowTo.jsx'

// What an exercise is, big: how it moves, which muscles, how it's done (Italian when written,
// else the library's English steps). The sheets put their own buttons under it.
export default function ExerciseInfo({ S, id }) {
  const ex = (S.customEx || []).find(e => e.id === id) || exOr(id)
  const it = getLang() === 'it' && DESCR_IT[id]
  const muscles = [S.muscles?.[id] || ex.tg, ...(ex.sm || [])].filter(Boolean).map(m => t(m))
  return <>
    <div className="mb-3 text-xl font-semibold leading-snug">{displayName(S, id)}</div>
    <HowTo id={id} className="mb-3" />
    {muscles.length > 0 && <div className="mb-2 text-[15px] text-muted-foreground">{muscles.join(' · ')}{ex.eq && <> — {ex.eq}</>}</div>}
    {it ? <p className="mb-4 text-[16px] leading-relaxed">{it}</p>
      : ex.st?.length > 0 && <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-snug">{ex.st.map((x, i) => <li key={i}>{x}</li>)}</ol>}
  </>
}
