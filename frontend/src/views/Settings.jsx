import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import Icon from '../components/Icon.jsx'
import Bar from '../components/Bar.jsx'
import { openNumber } from '../components/NumberSheet.jsx'
import { pushSupported, pushPermission, enablePush, disablePush } from '../lib/push.js'
import { t, getLang } from '../lib/i18n.js'

// iOS Settings row: a small coloured tile with a white icon, the label, the value in grey.
const Row = ({ icon, bg, label, value, onClick }) => <button onClick={onClick} className="flex min-h-12 w-full items-center gap-3 py-2 pl-4 pr-3 text-left active:bg-raised">
  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-white" style={{ background: bg }}><Icon name={icon} size={18} strokeWidth={2.2} /></span>
  <span className="min-w-0 flex-1 text-[17px] leading-snug">{label}</span>
  <span className="whitespace-nowrap text-[17px] text-muted-foreground">{value}</span>
  <Icon name="chevronRight" size={18} className="text-muted-foreground/60" />
</button>

export default function Settings() {
  const nav = useNavigate()
  const back = useLocation().state?.back || '/coach'   // Allenati's gear or the coach
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
    <Bar title={t('Impostazioni')} back={{ label: back === '/allenati' ? t('Allenati') : 'Coach', onClick: () => nav(back) }} />
    <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card">
      <Row icon="globe" bg="#0a84ff" label={t('Lingua')} value={getLang() === 'it' ? 'Italiano' : 'English'} onClick={() => update(s => { s.lang = getLang() === 'it' ? 'en' : 'it' })} />
      <Row icon="timer" bg="#ff9f0a" label={t('Recupero')} value={(S.restSec || 90) + ' s'} onClick={() => ask(t('Recupero tra le serie (secondi)'), 'restSec', S.restSec || 90)} />
      <Row icon="arrowUp" bg="#30d158" label={t('Soglia per salire di peso')} value={t('{0} ripetizioni', S.threshold ?? 10)} onClick={() => ask(t('Ripetizioni per proporti di salire'), 'threshold', S.threshold ?? 10)} />
      {pushSupported() && <Row icon="bell" bg="#ff453a" label={t('Notifiche del coach')} value={t(push === 'granted' ? 'attive' : 'spente')} onClick={togglePush} />}
    </section>
    {err && <div className="px-4 pt-2 text-[13px] text-destructive">{err}</div>}
    {user && <section className="mt-8 overflow-hidden rounded-2xl bg-card">
      <button className="flex min-h-12 w-full items-center justify-center text-[17px] text-destructive active:bg-raised" onClick={() => useStore.getState().signOut()}>{t('Esci')}</button>
    </section>}
  </div>
}
