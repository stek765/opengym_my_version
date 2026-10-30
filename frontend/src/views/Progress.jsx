import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { exerciseRows, exerciseHistory, topOf } from '../lib/training.js'
import { num } from '../lib/format.js'
import LineChart from '../components/LineChart.jsx'
import Thumb from '../components/Thumb.jsx'
import Icon from '../components/Icon.jsx'
import { openWeight } from '../lib/weight.js'
import { RANGES } from './ExerciseDetail.jsx'
import { t } from '../lib/i18n.js'

const BW = 'peso'   // the body-weight line, listed with the exercises
const unitOf = m => (m === 'kg' ? 'kg' : m === 'reps' ? t('rip') : 's')

// One chart, one list: tap an exercise (or body weight) and the chart shows it. Neutral colours only.
export default function Progress() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const rows = exerciseRows(S)
  const byId = Object.fromEntries(rows.map(r => [r.id, r]))
  const seen = new Set()
  const take = list => list.filter(x => x && !seen.has(x.id) && seen.add(x.id))
  const groups = (S.routines || []).map(r => ({ id: r.id, name: r.name, rows: take(r.ex.map(e => byId[e.id])) }))
  groups.push({ id: 'altri', name: t('Altri esercizi'), rows: take(rows) })
  const first = groups.find(g => g.rows.length)?.rows[0]?.id || BW
  const [sel, setSel] = useState(first)
  const [range, setRange] = useState('6M')

  const days = RANGES.find(x => x[0] === range)[1]
  const from = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : ''
  const bw = S.bodyweight || []
  const r = byId[sel]
  const pts = sel === BW
    ? bw.filter(b => b.d >= from).map(b => ({ t: new Date(b.d + 'T12:00:00').getTime(), y: b.w, d: b.d }))
    : exerciseHistory(S, sel, from).reverse().map(s => ({ t: new Date(s.d + 'T12:00:00').getTime(), y: topOf(s.sets, r.measure), d: s.d }))
  const name = sel === BW ? t('Peso corporeo') : r?.name
  const u = sel === BW ? 'kg' : unitOf(r?.measure)
  const now = sel === BW ? bw.at(-1)?.w : r?.now
  const change = pts.length > 1 ? t('da {0} a {1} {2}', num(pts[0].y), num(pts.at(-1).y), u) : t('un solo allenamento in questo periodo')
  const pick = id => { setSel(id); document.getElementById('app')?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const addBw = () => openWeight(S, update)
  const Row = ({ id, label, value, thumb }) => <button className={'prow' + (sel === id ? ' on' : '')} onClick={() => pick(id)}>
    {thumb}<span className="grow">{label}</span><span className="v">{value}</span>
  </button>

  return <div className="narrow">
    <h1>{t('Progressi')}</h1>
    <div className="card chartcard">
      <div className="row" style={{ gap: 12 }}>
        {sel === BW ? <span className="thumb none" style={{ width: 48, height: 48 }}><Icon name="scale" size={22} /></span> : <Thumb id={sel} size={48} />}
        <b className="grow" style={{ fontSize: 18 }}>{name}</b>
        {sel === BW && <button className="iconbtn" aria-label={t('Aggiungi peso')} onClick={addBw}><Icon name="plus" /></button>}
      </div>
      <div className="big" style={{ margin: '14px 0 2px' }}>{now == null ? '—' : num(now)}<small> {u}</small></div>
      <div className="eb">{change}</div>
      <LineChart points={pts} color="var(--fg)" />
      <div className="seg" style={{ margin: '6px 0 0' }}>{RANGES.map(([k]) => <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{t(k)}</button>)}</div>
    </div>

    <div className="grp">{t('Corpo')}</div>
    <Row id={BW} label={t('Peso corporeo')} value={bw.length ? num(bw.at(-1).w) + ' kg' : '—'} thumb={<span className="thumb none" style={{ width: 40, height: 40 }}><Icon name="scale" size={18} /></span>} />
    {groups.filter(g => g.rows.length).map(g => <div key={g.id}>
      <div className="grp">{g.name}</div>
      {g.rows.map(x => <Row key={x.id} id={x.id} label={x.name} value={num(x.now) + ' ' + unitOf(x.measure)} thumb={<Thumb id={x.id} size={40} />} />)}
    </div>)}
    {r && <button className="lnk" style={{ marginTop: 10 }} onClick={() => nav('/progressi/' + sel)}>{t('Tutte le serie di {0}', r.name)} ›</button>}
  </div>
}
