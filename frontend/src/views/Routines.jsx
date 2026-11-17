import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { displayName, routineColor, PALETTE } from '../lib/training.js'
import { startSession } from '../lib/session.js'
import { uid } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import Back from '../components/Back.jsx'
import { openNumber } from '../components/NumberSheet.jsx'
import { openPicker } from '../components/ExercisePicker.jsx'
import { confirmAsk, promptAsk } from '../components/ask.jsx'
import { newExercise } from '../components/newExercise.jsx'
import { t } from '../lib/i18n.js'
import { lastDone, lastLine } from './Train.jsx'

export function RoutineEditor({ id, back }) {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const r = S.routines.find(x => x.id === id)
  if (!r) { back(); return null }
  const mut = fn => update(s => { const r = s.routines.find(x => x.id === id); if (r) fn(r) })
  const move = (i, d) => mut(x => { const j = i + d; if (j < 0 || j >= x.ex.length) return; [x.ex[i], x.ex[j]] = [x.ex[j], x.ex[i]] })
  const num = (i, field) => openNumber({
    title: `${displayName(S, r.ex[i].id)} · ${t(field === 'sets' ? 'serie' : EXIDX[r.ex[i].id]?.kind === 'time' ? 'secondi' : 'ripetizioni')}`, value: r.ex[i][field], field: 'r',
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
  const start = () => { update(s => { s.active = startSession(s, r) }); nav('/allenamento') }
  const color = routineColor(S, id)
  return <div className="narrow">
    <Back label={t('Schede')} onClick={back} />
    <button className="h1" style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }} onClick={() => promptAsk(t('Nome scheda'), r.name, v => mut(x => { x.name = v }))}>{r.name}<Icon name="pencil" size={20} className="mu" /></button>
    <section className="panel">
      <div className="tabs" style={{ margin: '0 0 14px', padding: 0 }}>
        <button className={r.rec ? '' : 'on'} onClick={() => mut(x => { delete x.rec })}><Icon name="dumbbell" size={15} />{t('Palestra')}</button>
        <button className={r.rec ? 'on' : ''} onClick={() => mut(x => { x.rec = true })}><Icon name="stretch" size={15} />{t('Recovery')}</button>
      </div>
      <div className="swatches">{PALETTE.map(c => <button key={c} aria-label={c} className={c === color ? 'on' : ''} style={{ background: c }} onClick={() => mut(x => { x.color = c })} />)}</div>
    </section>
    <section className="panel">
      <div className="sec"><h2><Icon name="list" />{t('{0} esercizi', r.ex.length)}</h2></div>
      {r.ex.map((e, i) => <div key={e.id} className="erow">
        <Thumb id={e.id} size={48} />
        <div className="grow">
          <div className="nm">{displayName(S, e.id)}</div>
          {(S.customEx || []).find(c => c.id === e.id)?.kind !== 'check' && <div className="meta">
            <button className="pill" onClick={() => num(i, 'sets')}>{e.sets}</button><span className="mu">×</span>
            <button className="pill" onClick={() => num(i, 'reps')}>{e.reps}{EXIDX[e.id]?.kind === 'time' ? ' s' : ''}</button>
          </div>}
        </div>
        <div className="ctl">
          <button className="iconbtn sm" aria-label={t('Su')} onClick={() => move(i, -1)}><Icon name="chevronUp" /></button>
          <button className="iconbtn sm" aria-label={t('Giù')} onClick={() => move(i, 1)}><Icon name="chevronDown" /></button>
          <button className="iconbtn sm" aria-label={t('Togli')} onClick={() => mut(x => { x.ex.splice(i, 1) })}><Icon name="xmark" /></button>
        </div>
      </div>)}
      <button className="btn" style={{ marginTop: 14 }} onClick={add}><Icon name="plus" />{t('Aggiungi esercizio')}</button>
    </section>
    {r.ex.length > 0 && <button className="btn primary" style={{ marginTop: 10 }} onClick={start}><Icon name="play" />{t('Inizia questa scheda')}</button>}
    <div style={{ height: 30 }} />
    <button className="btn ghost" onClick={() => confirmAsk(t('Eliminare la scheda «{0}»? Gli allenamenti fatti restano.', r.name), t('Elimina'), () => { update(s => { s.routines = s.routines.filter(x => x.id !== id) }); back() })}>{t('Elimina scheda')}</button>
  </div>
}

// All routines in one list, gym first, then recovery. A new one takes the first colour nobody uses.
export function RoutineList({ open }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const create = () => promptAsk(t('Nome della nuova scheda'), '', name => {
    const id = uid()
    const used = new Set(S.routines.map(r => routineColor(S, r.id)))
    update(s => { s.routines.push({ id, name, ex: [], color: PALETTE.find(c => !used.has(c)) || PALETTE[0] }) })
    open(id)
  })
  // Name cards with the routine's colour as a stripe: no pictures, he recognises them by name.
  const group = (label, icon, list) => list.length > 0 && <>
    <div className="sec"><h2 className="gh"><Icon name={icon} />{label}</h2></div>
    {list.map(r => <button key={r.id} className="pick rc" style={{ '--rc': routineColor(S, r.id) }} onClick={() => open(r.id)}>
      <div className="row">
        <b className="grow">{r.name}</b>
        <Icon name="pencil" size={18} className="mu" />
      </div>
      <div className="eb" style={{ marginTop: 4 }}>{lastLine(r.ex.length, lastDone(S, r.id))}</div>
    </button>)}
  </>
  return <>
    {group(t('Palestra'), 'dumbbell', S.routines.filter(r => !r.rec))}
    {group(t('Recovery'), 'stretch', S.routines.filter(r => r.rec))}
    <button className="pick free" onClick={create}><Icon name="plus" size={26} /><b>{t('Nuova scheda')}</b></button>
  </>
}
