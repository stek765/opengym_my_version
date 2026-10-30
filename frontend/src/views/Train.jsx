import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { displayName, suggestedRoutine, routineColor } from '../lib/training.js'
import { useUI } from '../store/useUI.js'
import { startSession } from '../lib/session.js'
import { ddmm, num, uid, todayISO, isoOf } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import Back from '../components/Back.jsx'
import { openWeight } from '../lib/weight.js'
import { openNumber } from '../components/NumberSheet.jsx'
import { openPicker } from '../components/ExercisePicker.jsx'
import { confirmAsk, promptAsk } from '../components/ask.jsx'
import { newExercise } from '../components/newExercise.jsx'
import { t, weekday, weekLetters } from '../lib/i18n.js'

export const lastDone = (S, id) => (S.workouts || []).reduce((d, w) => (w.routineId === id && w.d > d ? w.d : d), '')

function RoutineEditor({ id, back, backLabel, onStart }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)
  if (!r) { back(); return null }
  const mut = fn => update(s => { const r = s.routines.find(x => x.id === id); if (r) fn(r) })
  const move = (i, d) => mut(x => { const j = i + d; if (j < 0 || j >= x.ex.length) return; [x.ex[i], x.ex[j]] = [x.ex[j], x.ex[i]] })
  const num = (i, field) => openNumber({
    title: `${displayName(S, r.ex[i].id)} · ${t(field === 'sets' ? 'serie' : 'ripetizioni')}`, value: r.ex[i][field], field: 'r',
    onDone: v => mut(x => { x.ex[i][field] = Math.max(field === 'sets' ? 1 : 0, Math.round(v || 0)) })
  })
  const add = () => openPicker({
    S,
    onPick: exId => mut(x => { if (!x.ex.some(e => e.id === exId)) x.ex.push({ id: exId, sets: 3, reps: 10, weight: null }) }),
    onCreate: name => {
      const exId = newExercise(name, (from, to) => mut(x => { if (!x || from === to) return; if (x.ex.some(y => y.id === to)) x.ex = x.ex.filter(y => y.id !== from); else { const e = x.ex.find(y => y.id === from); if (e) e.id = to } }))
      mut(x => { x.ex.push({ id: exId, sets: 3, reps: 10, weight: null }) })
    }
  })
  return <div className="narrow">
    <Back label={backLabel} onClick={back} />
    <button className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }} onClick={() => promptAsk(t('Nome scheda'), r.name, v => mut(x => { x.name = v }))}>{r.name}<Icon name="pencil" size={20} className="mu" /></button>
    <div className="eb" style={{ marginBottom: 6 }}>{t("Tocca serie e ripetizioni per cambiarle, le frecce per spostare l'esercizio.")}</div>
    {r.ex.map((e, i) => <div key={e.id} className="line">
      <Thumb id={e.id} size={36} /><span className="grow">{displayName(S, e.id)}</span>
      <span className="row" style={{ gap: 6 }}>
        {(S.customEx || []).find(c => c.id === e.id)?.kind !== 'check' && <><button className="pill" style={{ minWidth: 0 }} onClick={() => num(i, 'sets')}>{e.sets}</button><span className="mu">×</span><button className="pill" style={{ minWidth: 0 }} onClick={() => num(i, 'reps')}>{e.reps}</button></>}
        <button className="iconbtn sm" aria-label={t('Su')} onClick={() => move(i, -1)}><Icon name="chevronUp" /></button>
        <button className="iconbtn sm" aria-label={t('Giù')} onClick={() => move(i, 1)}><Icon name="chevronDown" /></button>
        <button className="iconbtn sm" aria-label={t('Togli')} onClick={() => mut(x => { x.ex.splice(i, 1) })}><Icon name="xmark" /></button>
      </span>
    </div>)}
    <button className="btn" style={{ marginTop: 14 }} onClick={add}><Icon name="plus" />{t('Aggiungi esercizio')}</button>
    {r.ex.length > 0 && <button className="btn primary" style={{ marginTop: 10 }} onClick={() => onStart(r)}><Icon name="play" />{t('Inizia questa scheda')}</button>}
    <div style={{ height: 30 }} />
    <button className="btn ghost" onClick={() => confirmAsk(t('Eliminare la scheda «{0}»? Gli allenamenti fatti restano.', r.name), t('Elimina'), () => { update(s => { s.routines = s.routines.filter(x => x.id !== id) }); back() })}>{t('Elimina scheda')}</button>
  </div>
}

function Routines({ open, back }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const bw = S.bodyweight || [], lastBw = bw.at(-1), prevBw = bw.at(-2)
  const dBw = lastBw && prevBw ? Math.round((lastBw.w - prevBw.w) * 10) / 10 : 0
  const create = () => promptAsk(t('Nome della nuova scheda'), '', name => { const id = uid(); update(s => { s.routines.push({ id, name, ex: [] }) }); open(id) })
  return <div className="narrow">
    <Back label={t('Allenati')} onClick={back} />
    <h1>{t('Schede')}</h1>
    {S.routines.map(r => <button key={r.id} className="line" onClick={() => open(r.id)}><span className="grow">{r.name}</span><span className="r">{t('{0} esercizi', r.ex.length)}</span><Icon name="chevronRight" className="mu" /></button>)}
    <button className="btn" style={{ marginTop: 14 }} onClick={create}><Icon name="plus" />{t('Nuova scheda')}</button>
  </div>
}

const daysSince = iso => Math.round((new Date(todayISO() + 'T12:00:00') - new Date(iso + 'T12:00:00')) / 864e5)
// "ieri", "lunedì" within the week, a date beyond it.
export const ago = iso => {
  if (!iso) return t('mai fatta')
  const n = daysSince(iso)
  return n === 0 ? t('oggi') : n === 1 ? t('ieri') : n < 7 ? weekday(iso) : ddmm(iso)
}
export const pics = (S, r) => (r?.ex || []).map(e => e.id).filter(id => EXIDX[id]?.img)

function Week({ S, open }) {
  const byDay = {}
  for (const w of S.workouts || []) byDay[w.d] = w
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
  const [edit, setEdit] = useState(null)   // null | 'list' | routineId
  const [fromHome, setFromHome] = useState(false)   // the pencil on the hero: back goes home, not to the list
  const editFrom = (id, home) => { setFromHome(home); setEdit(id) }
  if (edit === 'list') return <Routines open={id => editFrom(id, false)} back={() => setEdit(null)} />
  const start = r => { update(s => { s.active = startSession(s, r) }); nav('/allenamento') }
  if (edit) return <RoutineEditor id={edit} back={() => setEdit(fromHome ? null : 'list')} backLabel={t(fromHome ? 'Allenati' : 'Schede')} onStart={start} />

  const sug = suggestedRoutine(S)
  const A = S.active
  const heroR = A ? S.routines.find(r => r.id === A.routineId) : sug
  const last = sug && lastDone(S, sug.id)
  const nEx = r => r.ex.filter(e => (S.customEx || []).find(c => c.id === e.id)?.kind !== 'check').length
  const bw = S.bodyweight || [], lastBw = bw.at(-1), prevBw = bw.at(-2)
  const dBw = lastBw && prevBw ? Math.round((lastBw.w - prevBw.w) * 10) / 10 : 0
  const create = () => promptAsk(t('Nome della nuova scheda'), '', name => { const id = uid(); update(s => { s.routines.push({ id, name, ex: [] }) }); editFrom(id, true) })

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

    {!A && <section className="panel">
      <div className="sec"><h2><Icon name="dumbbell" />{t('Le tue schede')}</h2></div>
      <div className="eb" style={{ marginTop: -4, marginBottom: 10 }}>{t('Tocca una scheda per modificarla')}</div>
      <div className="hscroll">
        {S.routines.map(r => <button key={r.id} className="poster" onClick={() => editFrom(r.id, true)}>
          <div className="pimg">{pics(S, r).slice(0, 4).map(id => <Thumb key={id} id={id} />)}<span className="chip"><i className="rdot" style={{ background: routineColor(S, r.id) }} />{ago(lastDone(S, r.id))}</span><span className="playb"><Icon name="pencil" /></span></div>
          <b>{r.name}</b><small>{t('{0} esercizi', nEx(r))}</small>
        </button>)}
        <button className="poster" onClick={create}>
          <div className="pimg free"><Icon name="plus" /></div>
          <b>{t('Nuova scheda')}</b><small>{t('crea da zero')}</small>
        </button>
      </div>
    </section>}
  </div>
}
