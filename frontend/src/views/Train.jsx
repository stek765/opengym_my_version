import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { suggestedRoutine, routineColor, mainOf } from '../lib/training.js'
import { useUI } from '../store/useUI.js'
import { ddmm, num, todayISO, isoOf } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import { openWeight } from '../lib/weight.js'
import { t, weekday, weekLetters } from '../lib/i18n.js'

export const lastDone = (S, id) => (S.workouts || []).reduce((d, w) => (w.routineId === id && w.d > d ? w.d : d), '')

const daysSince = iso => Math.round((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 864e5)
// "ieri", "lunedì" within the week, a date beyond it.
export const ago = iso => {
  if (!iso) return t('mai fatta')
  const n = daysSince(iso)
  return n === 0 ? t('oggi') : n === 1 ? t('ieri') : n < 7 ? weekday(iso) : ddmm(iso)
}
export const pics = (S, r) => (r?.ex || []).map(e => e.id).filter(id => EXIDX[id]?.img)

function Week({ S, open }) {
  const lists = {}, byDay = {}
  for (const w of S.workouts || []) (lists[w.d] = lists[w.d] || []).push(w)
  for (const d in lists) byDay[d] = mainOf(S, lists[d])
  const today = todayISO()
  const mon = new Date(); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7)
  return <div className="week">{weekLetters().map((l, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    const iso = isoOf(d)
    const w = byDay[iso], c = w && routineColor(S, w.routineId)
    return <button key={i} disabled={!w} onClick={() => open(w)} className={(w ? 'on' : '') + (iso === today ? ' t' : '')}>{l}<b style={c ? { background: c, color: '#1a1a1a' } : undefined}>{d.getDate()}</b></button>
  })}</div>
}

export default function Train() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)

  const sug = suggestedRoutine(S)
  const A = S.active
  const heroR = A ? S.routines.find(r => r.id === A.routineId) : sug
  const last = sug && lastDone(S, sug.id)
  const nEx = r => r.ex.filter(e => (S.customEx || []).find(c => c.id === e.id)?.kind !== 'check').length
  const bw = S.bodyweight || [], lastBw = bw.at(-1), prevBw = bw.at(-2)
  const dBw = lastBw && prevBw ? Math.round((lastBw.w - prevBw.w) * 10) / 10 : 0
  return <div className="narrow">
    <div className="hdr"><span className="logo">openGym</span></div>
    {(A || sug) && <div className="hero">
      <span className="chip"><Icon name="clock" />{A ? t('In corso') : last ? t('Ferma da {0} giorni', daysSince(last)) : t('Mai fatta')}</span>
      <h1>{A ? A.name : sug.name}</h1>
      {!A && <div className="m">{t("{0} esercizi · l'ultima volta {1}", nEx(sug), ago(last))}</div>}
      <div className="thumbs">{pics(S, heroR).slice(0, 4).map(id => <Thumb key={id} id={id} size={62} />)}</div>
      <div className="btns">
        {A ? <button className="btn white" onClick={() => nav('/allenamento')}><Icon name="play" />{t('Riprendi')}</button>
          : <button className="btn white" onClick={() => nav('/inizia')}><Icon name="play" />{t('Inizia')}</button>}
      </div>
    </div>}

    <section className="panel">
    <div className="sec"><h2><Icon name="calendar" />{t('Questa settimana')}</h2><button className="secbtn" onClick={() => nav('/storico', { state: { back: '/allenati' } })}><Icon name="calendar" />{t('Storico')}</button></div>
    <Week S={S} open={w => useUI.getState().toast(S.routines.find(r => r.id === w.routineId)?.name || w.name)} />
    </section>

    <section className="panel">
      <div className="sec"><h2><Icon name="scale" />{t('Peso')}</h2></div>
      <div className="row between">
        <div>
          <div className="big">{lastBw ? num(lastBw.w) : '—'}<small> kg</small></div>
          <div className="eb" style={{ marginTop: 6 }}>{lastBw ? `${ago(lastBw.d)}${dBw ? ` · ${dBw > 0 ? '+' : '−'}${num(Math.abs(dBw))} kg` : ''}` : t('Non hai ancora registrato il peso')}</div>
        </div>
        <button className="btn" style={{ width: 'auto', padding: '14px 18px' }} onClick={() => openWeight(S, update)}><Icon name="plus" />{t('Registra')}</button>
      </div>
    </section>

  </div>
}
