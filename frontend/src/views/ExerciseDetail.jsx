import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { displayName, exerciseHistory, measureOf, topOf } from '../lib/training.js'
import { num, ddmm } from '../lib/format.js'
import LineChart from '../components/LineChart.jsx'
import Back from '../components/Back.jsx'
import Thumb from '../components/Thumb.jsx'
import { t } from '../lib/i18n.js'

export const RANGES = [['1M', 31], ['3M', 92], ['6M', 183], ['1A', 365], ['Tutto', 0]]

// One row per date, one column per set: weight big, reps small under (reps/sec: the value only).
export function SetsTable({ sessions, measure, noDate }) {
  const cols = Math.max(1, ...sessions.map(s => s.sets.length))
  return <table className={"st" + (noDate ? " nd" : "")}>
    <thead><tr>{!noDate && <th />}{Array.from({ length: cols }, (_, i) => <th key={i}>{t('Serie')} {i + 1}</th>)}</tr></thead>
    <tbody>{sessions.map(s => <tr key={s.d}>
      {!noDate && <td>{ddmm(s.d)}</td>}
      {Array.from({ length: cols }, (_, i) => {
        const x = s.sets[i]
        if (!x) return <td key={i} className="fa">—</td>
        return <td key={i}>{measure === 'kg' ? <>{num(x.w)}<small>× {x.r}</small></> : measure === 'sec' ? num(x.sec) : x.r}</td>
      })}
    </tr>)}</tbody>
  </table>
}

export default function ExerciseDetail() {
  const nav = useNavigate()
  const { exId } = useParams()
  const S = useStore(s => s.S)
  const [range, setRange] = useState('6M')
  const days = RANGES.find(r => r[0] === range)[1]
  const from = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : ''
  const measure = measureOf(S, exId)
  const all = exerciseHistory(S, exId)          // newest first
  const shown = exerciseHistory(S, exId, from)
  if (!all.length) return <div className="narrow"><Back label={t('Progressi')} onClick={() => nav('/progressi')} /><h1>{displayName(S, exId)}</h1><div className="empty">{t('Mai fatto')}</div></div>
  const now = topOf(all[0].sets, measure), first = all[all.length - 1]
  const firstTop = topOf(first.sets, measure)
  const d = Math.round((now - firstTop) * 100) / 100
  const u = measure === 'kg' ? ' kg' : measure === 'reps' ? ' ' + t('rip') : ' s'

  return <div className="narrow">
    <Back label={t('Progressi')} onClick={() => nav('/progressi')} />
    <div className="row" style={{ gap: 14, margin: '10px 0 14px' }}><Thumb id={exId} size={72} /><h1 style={{ margin: 0 }}>{displayName(S, exId)}</h1></div>
    <div className="big">{num(now)}<small>{u}</small></div>
    {d !== 0 && firstTop > 0 && <div className={'small ' + (d > 0 ? 'up' : 'dn')} style={{ margin: '4px 0 12px' }}>
      {d > 0 ? '+' : '−'}{num(Math.abs(d))}{u} {t('dal {0}', ddmm(first.d))} · {d > 0 ? '+' : '−'}{Math.abs(Math.round(d / firstTop * 100))}%
    </div>}
    <div className="seg" style={{ marginTop: 14 }}>{RANGES.map(([k]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{t(k)}</button>)}</div>
    <LineChart points={[...shown].reverse().map(s => ({ t: new Date(s.d + 'T12:00:00').getTime(), y: topOf(s.sets, measure), d: s.d }))} color="var(--fg)" />
    <SetsTable sessions={shown.length ? shown : all.slice(0, 1)} measure={measure} />
  </div>
}
