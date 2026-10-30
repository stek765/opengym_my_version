import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { displayName, lastSession, measureOf, increaseOffer, finishSession } from '../lib/training.js'
import { setValue, toggleSet, addSet, skipEntry, addEntry, answerOffer, renameEntry, settle, openEntry, removeEntry, removeSet } from '../lib/session.js'
import { num } from '../lib/format.js'
import { EXIDX, imgSrc } from '../lib/exercises.js'
import { openNumber } from '../components/NumberSheet.jsx'
import { openPicker } from '../components/ExercisePicker.jsx'
import { confirmAsk, promptAsk, useLongPress } from '../components/ask.jsx'
import { afterWorkout, cue } from '../lib/coach-api.js'
import { newExercise } from '../components/newExercise.jsx'
import RestStrip from '../components/RestStrip.jsx'
import MuscleTag from '../components/MuscleTag.jsx'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import { t } from '../lib/i18n.js'

function Clock({ start }) {
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(i) }, [])
  const s = Math.floor((Date.now() - start) / 1000)
  return <>{Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}</>
}

const delta = (v, prev) => {
  if (v == null || prev == null) return null
  const d = Math.round((v - prev) * 100) / 100
  return d > 0 ? <span className="up">+{num(d)}</span> : d < 0 ? <span className="dn">−{num(-d)}</span> : null
}

function Name({ S, id, className }) {
  const update = useStore(s => s.update)
  const press = useLongPress(() => promptAsk(t('Rinomina esercizio'), displayName(S, id), v => update(s => { s.exNames = { ...s.exNames, [id]: v } })))
  return <div className={className} {...press}>{displayName(S, id)}</div>
}

function OpenEntry({ S, e, upd, prev }) {
  const update = useStore(s => s.update)
  const startRest = useUI(s => s.startRest)
  const [hint, setHint] = useState('')
  const feel = () => { setHint('…'); cue(e.id).then(r => setHint(r.text)).catch(err => setHint(t(err.message || 'Coach non raggiungibile'))) }
  const measure = measureOf(S, e.id)
  const last = lastSession(S, e.id)
  const offer = e.offer === undefined ? increaseOffer(S, e.id) : null
  const showW = measure !== 'reps' || e.sets.some(s => s.w > 0)
  const name = displayName(S, e.id)
  const ex = EXIDX[e.id]
  const edit = (i, field) => openNumber({
    title: `${name} · ${t('serie')} ${i + 1} · ${t(field === 'w' ? 'peso' : 'ripetizioni')}`,
    value: e.sets[i][field], field, later: e.sets.some((s, j) => j > i && !s.done),
    onDone: (v, later) => upd(a => setValue(a, e.id, i, field, v, later))
  })
  const tick = i => {
    upd(a => toggleSet(a, e.id, i))
    if (!e.sets[i].done) startRest(S.restSec || 90)
  }
  const answer = inc => {
    upd(a => answerOffer(a, e.id, inc))
    if (inc) update(s => { s.incr = { ...s.incr, [e.id]: inc } })
  }
  return <div className="ex-open">
    <div className={'pic' + (ex?.img ? '' : ' none')}>
      {ex?.img && <img src={imgSrc(ex)} alt="" />}
      <MuscleTag S={S} id={e.id} />
      {!hint && <button className="chip cuebtn" onClick={feel}><Icon name="sparkles" />{t('Cosa sentire?')}</button>}
    </div>
    <div className="body">
      {prev && <button className="chip backto" onClick={() => upd(a => openEntry(a, prev))}><Icon name="chevronLeft" />{t('Torna a {0}', displayName(S, prev))}</button>}
      <Name S={S} id={e.id} className="name" />
      {offer ? <div className="offer">
        <div className="q">{t("L'ultima volta {0} kg × {1}. Sali?", num(offer.last[0].w), offer.last.map(s => s.r).join(', '))}</div>
        <div className="chips">
          {[1, 2.5, 5].map(inc => <button key={inc} className={inc === offer.preferred ? 'pref' : ''} onClick={() => answer(inc)}>+{num(inc)}</button>)}
          <button onClick={() => answer(0)}>{t('No')}</button>
        </div>
      </div> : last && <div className="goal">{t("L'ultima volta {0}", last.sets.map(s => measure === 'kg' ? `${num(s.w)} × ${s.r}` : s.r).join(' · '))}</div>}
      {hint && <div className="cue">{hint}</div>}
      <div className="sets">
        {e.sets.map((s, i) => {
          const p = last?.sets[i]
          return <div key={i} className={'set' + (showW ? '' : ' reps') + (s.done ? ' done' : '')}>
            <span className="i">{i + 1}</span>
            {showW && <button className="v" onClick={() => edit(i, 'w')}>{num(s.w)}<small>kg</small>{delta(s.w, p?.w)}</button>}
            <button className="v" onClick={() => edit(i, 'r')}>{s.r ?? '—'}<small>{t('rip')}</small>{delta(s.r, p?.r)}</button>
            <button className={'chk' + (s.done ? ' on' : '')} aria-label={t(s.done ? 'Annulla serie' : 'Fatta')} onClick={() => tick(i)}><Icon name="check" /></button>
          </div>
        })}
      </div>
      <RestStrip />
      <div className="acts">
        <button onClick={() => upd(a => addSet(a, e.id))}>+ {t('Serie')}</button>
        {e.sets.length > 1 && e.sets.some(s => !s.done) && <button onClick={() => upd(a => removeSet(a, e.id))}>− {t('Serie')}</button>}
        {!showW && <button onClick={() => edit(Math.max(0, e.sets.findIndex(s => !s.done)), 'w')}>+ {t('Peso')}</button>}
        {e.sets.some(s => s.done)
          ? <button onClick={() => upd(a => skipEntry(a, e.id))}>{t('Salta esercizio')}</button>
          : <button onClick={() => upd(a => removeEntry(a, e.id))}>{t("Togli dall'allenamento")}</button>}
      </div>
    </div>
  </div>
}

function summary(S, e) {
  const d = e.sets.filter(s => s.done)
  if (d.length && d.length === e.sets.length) return (measureOf(S, e.id) === 'kg' ? num(d[0].w) + ' × ' : '') + d.map(s => s.r).join(' ')
  const f = e.sets[0]
  return `${e.sets.length} × ${f?.r ?? '—'}` + (f?.w ? ` · ${num(f.w)} kg` : '')
}

export default function Session() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const stopRest = useUI(s => s.stopRest)
  const A = S.active
  if (!A) return <Navigate to="/allenati" replace />
  const upd = fn => update(s => { s.active = settle(fn(s.active)) })
  const total = A.entries.reduce((n, e) => n + e.sets.length, 0)
  const done = A.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)
  const allDone = A.entries.every(e => 'check' in e || e.skipped || e.sets.every(s => s.done))

  const finish = () => {
    const w = finishSession(A)
    stopRest()
    // Nothing ticked: a stray tap must not leave an empty day in the calendar.
    if (!w.entries.length) { nav('/allenati', { replace: true }); update(s => { s.active = null }); return }
    nav('/storico/' + w.id, { replace: true })
    update(s => { s.workouts.push(w); s.active = null })
    // The coach comment is a bonus: a slow or failed coach never holds up the finish.
    useStore.getState().pushState().then(() => afterWorkout(w.id)).catch(() => {})
  }
  const add = () => openPicker({
    S,
    onPick: id => upd(a => addEntry(S, a, id)),
    onCreate: name => {
      const id = newExercise(name, (from, to) => update(s => { if (s.active) s.active = renameEntry(s.active, from, to) }))
      update(s => { s.active = addEntry(s, s.active, id) })
    }
  })

  return <div className="narrow">
    <div className="s-hd">
      <button className="iconbtn" aria-label={t("Indietro, l'allenamento resta aperto")} onClick={() => nav('/allenati')}><Icon name="chevronLeft" /></button>
      <div className="t"><b>{A.name}</b><small>{t('{0} di {1} serie', done, total)}</small></div>
      <span className="clk"><Clock start={A.start} /></span>
      <button className="iconbtn" aria-label={t('Annulla allenamento')} onClick={() => confirmAsk(t('Annullare l’allenamento? Le serie segnate si perdono.'), t('Annulla allenamento'), () => { stopRest(); update(s => { s.active = null }); nav('/allenati') })}><Icon name="xmark" /></button>
    </div>
    <div className="s-prog"><i style={{ width: (total ? done / total * 100 : 0) + '%' }} /></div>
    {A.entries.map(e => {
      if ('check' in e && e.id === A.openId) return <div key={e.id} className="ex-open warm">
        <div className="body">
          <div className="row"><span className="thumb none" style={{ width: 44, height: 44 }}><Icon name="flame" size={22} /></span><div className="name grow">{displayName(S, e.id)}</div></div>
          <div className="goal">{t('Si parte da qui. Quando hai finito, segnalo.')}</div>
          <button className="btn primary" style={{ marginTop: 14 }} onClick={() => upd(a => toggleSet(a, e.id))}><Icon name="check" />{t('Fatto')}</button>
        </div>
      </div>
      if ('check' in e) return <button key={e.id} className={'mini' + (e.check ? ' done' : '')} onClick={() => upd(a => toggleSet(a, e.id))}>
        <Thumb id={e.id} size={32} icon="flame" /><span className="grow">{displayName(S, e.id)}</span><span className={'chk' + (e.check ? ' on' : '')}><Icon name="check" size={14} /></span>
      </button>
      if (e.skipped) return <button key={e.id} className="mini done" onClick={() => upd(a => skipEntry(a, e.id))}>
        <Thumb id={e.id} size={32} /><span className="grow skipd">{displayName(S, e.id)}</span><small>{t('ripristina')}</small>
      </button>
      if (e.id === A.openId) return <OpenEntry key={e.id} S={S} e={e} upd={upd} prev={A.prevId && A.prevId !== e.id && A.entries.some(x => x.id === A.prevId && !x.skipped && !('check' in x) && x.sets.some(t => !t.done)) ? A.prevId : null} />
      const exDone = e.sets.length && e.sets.every(s => s.done)
      return <button key={e.id} className={'mini' + (exDone ? ' done' : '')} onClick={() => upd(a => openEntry(a, e.id))}>
        <Thumb id={e.id} size={32} /><span className="grow">{displayName(S, e.id)}</span><small>{summary(S, e)}</small>
      </button>
    })}
    <div className="endacts">
      <button className="btn" onClick={add}><Icon name="plus" />{t('Aggiungi esercizio')}</button>
      <button className={'btn' + (allDone ? ' primary' : ' ghost')} onClick={finish}>{t('Fine allenamento')}</button>
    </div>
  </div>
}
