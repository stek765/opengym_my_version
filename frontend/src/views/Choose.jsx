import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { suggestedRoutine, routineColor } from '../lib/training.js'
import { startSession } from '../lib/session.js'
import Back from '../components/Back.jsx'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import { lastDone, ago, pics } from './Train.jsx'
import { t } from '../lib/i18n.js'

// "Inizia": every routine as a big card with its pictures, the suggested one first.
export default function Choose() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const sug = suggestedRoutine(S)
  const list = [sug, ...S.routines.filter(r => r !== sug)].filter(Boolean)
  const start = r => { update(s => { s.active = startSession(s, r) }); nav('/allenamento', { replace: true }) }

  return <div className="narrow">
    <Back label={t('Allenati')} onClick={() => nav('/allenati')} />
    <h1>{t('Cosa fai oggi?')}</h1>
    {list.map(r => <button key={r.id} className={'pick' + (r === sug ? ' sug' : '')} onClick={() => start(r)}>
      <div className="pics">{pics(S, r).slice(0, 4).map(id => <Thumb key={id} id={id} />)}</div>
      <div className="row" style={{ marginTop: 12 }}>
        <i className="rdot" style={{ background: routineColor(S, r.id), width: 12, height: 12 }} />
        <b className="grow">{r.name}</b>
        {r === sug && <span className="chip">{t('consigliata')}</span>}
      </div>
      <div className="eb" style={{ marginTop: 4 }}>{t("{0} esercizi · l'ultima volta {1}", r.ex.length, ago(lastDone(S, r.id)))}</div>
    </button>)}
    <button className="pick free" onClick={() => start(null)}>
      <Icon name="plus" size={26} /><b>{t('Allenamento libero')}</b><span className="eb">{t('scegli gli esercizi mentre vai')}</span>
    </button>
  </div>
}
