import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import Icon from '../components/Icon.jsx'
import Back from '../components/Back.jsx'
import { openNumber } from '../components/NumberSheet.jsx'
import { pushSupported, pushPermission, enablePush, disablePush } from '../lib/push.js'
import { t, getLang } from '../lib/i18n.js'

export default function Settings() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const user = useStore(s => s.user)
  const [push, setPush] = useState(pushPermission())
  const [err, setErr] = useState('')
  const ask = (title, key, value) => openNumber({ title, value, field: 'r', onDone: v => v && update(s => { s[key] = Math.round(v) }) })
  const togglePush = async () => {
    setErr('')
    try {
      if (push === 'granted') { await disablePush(); setPush('default') }
      else { await enablePush(); setPush(pushPermission()) }
    } catch (e) { setErr(t(e.message || 'Notifiche non disponibili')) }
  }

  return <div className="narrow">
    <Back label="Coach" onClick={() => nav('/coach')} />
    <h1>{t('Impostazioni')}</h1>
    <section className="panel setl">
    <button className="line" onClick={() => update(s => { s.lang = getLang() === 'it' ? 'en' : 'it' })}><Icon name="globe" /><span className="grow">{t('Lingua')}</span><span className="r">{getLang() === 'it' ? 'Italiano' : 'English'}</span></button>
    <button className="line" onClick={() => ask(t('Recupero tra le serie (secondi)'), 'restSec', S.restSec || 90)}><Icon name="timer" /><span className="grow">{t('Recupero')}</span><span className="r">{S.restSec || 90} s</span></button>
    <button className="line" onClick={() => ask(t('Ripetizioni per proporti di salire'), 'threshold', S.threshold ?? 10)}><Icon name="arrowUp" /><span className="grow">{t('Soglia per salire di peso')}</span><span className="r">{t('{0} ripetizioni', S.threshold ?? 10)}</span></button>
    {pushSupported() && <button className="line" onClick={togglePush}><Icon name="bell" /><span className="grow">{t('Notifiche del coach')}</span><span className="r">{t(push === 'granted' ? 'attive' : 'spente')}</span></button>}
    </section>
    {err && <div className="dn small">{err}</div>}
    <div style={{ height: 30 }} />
    <div style={{ height: 14 }} />
    {user && <button className="btn ghost" onClick={() => useStore.getState().signOut()}>{t('Esci')}</button>}
  </div>
}
