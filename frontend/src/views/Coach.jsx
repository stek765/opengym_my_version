import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { getChat, askCoach, uploadPdf, clearChat } from '../lib/coach-api.js'
import { ddmm } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import Back from '../components/Back.jsx'
import { confirmAsk } from '../components/ask.jsx'
import { t } from '../lib/i18n.js'

const LABEL = { 'after-workout': 'Dopo l’allenamento', weekly: 'La tua settimana' }
const TABS = [['chat', 'Chat'], ['after-workout', 'Dopo l’allenamento'], ['weekly', 'Settimana']]
const day = at => ddmm(new Date(at).toISOString().slice(0, 10))
// The coach writes **bold** now and then; everything else is plain text.
const rich = t => String(t).split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))

const IDEE = ['Com\'è andata questa settimana?', 'Su cosa sto migliorando?', 'Cosa mangio dopo l\'allenamento?']

function Avatar() { return <span className="cavatar"><Icon name="sparkles" /></span> }

function Consent() {
  const update = useStore(s => s.update)
  const on = async () => {
    update(s => { s.coach = { ...(s.coach || {}), consent: { agreedAt: new Date().toISOString(), version: 1 } } })
    await useStore.getState().pushState()
  }
  return <div className="card cintro">
    <Avatar />
    <p>{t('Il coach legge i tuoi allenamenti, il peso, la dieta e i documenti che carichi, e li manda a Claude (Anthropic) per risponderti.')}</p>
    <button className="btn primary" onClick={on}>{t('Attiva il coach')}</button>
  </div>
}

export default function Coach() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [chat, setChat] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [showFiles, setShowFiles] = useState(false)
  const [tab, setTab] = useState('chat')
  const end = useRef(null)
  const fileIn = useRef(null)

  const load = () => getChat().then(setChat).catch(e => setErr(e.status === 401 ? '' : 'Coach non raggiungibile'))
  useEffect(() => { load() }, [])
  useEffect(() => { end.current?.scrollIntoView() }, [chat?.messages?.length, busy, tab])

  const send = async (said = text) => {
    const q = said.trim()
    if (!q || busy) return
    setBusy(true); setErr('')
    setChat(c => ({ ...c, messages: [...(c?.messages || []), { role: 'user', text: q, at: Date.now() }] }))
    setText('')
    try { await askCoach(q); await load() }
    catch (e) { setErr(e.message || 'Il coach non ha risposto'); setText(q) }
    setBusy(false)
  }
  const upload = async f => {
    if (!f) return
    setErr('')
    try { const r = await uploadPdf(f); setChat(c => ({ ...c, files: r.files })) }
    catch (e) { setErr(e.message || 'Caricamento non riuscito') }
  }
  const clear = () => confirmAsk(t('Svuotare «{0}»? Quello che il coach sa di te resta.', t(TABS.find(x => x[0] === tab)[1])), t('Svuota'), async () => {
    setErr('')
    try { await clearChat(tab); await load() } catch (e) { setErr(e.message || 'Non riuscito') }
  })
  const msgs = (chat?.messages || []).filter(m => (m.kind || 'chat') === tab)
  const files = chat?.files || []

  // Diet and lab PDFs live on their own page: the chat screen only shows the conversation.
  if (showFiles) return <div className="narrow">
    <Back label="Coach" onClick={() => setShowFiles(false)} />
    <h1>{t('Dieta e analisi')}</h1>
    <div className="eb" style={{ marginBottom: 14 }}>{t('Il coach legge questi PDF quando gli scrivi.')}</div>
    <div className="fgrid">
      {files.map(f => <div key={f} className="ftile"><Icon name="clipboard" /><span>{f.replace(/\.pdf$/i, '')}</span><small>PDF</small></div>)}
      <input ref={fileIn} type="file" accept="application/pdf" hidden onChange={e => upload(e.target.files[0])} />
      <button className="ftile add" onClick={() => fileIn.current.click()}><Icon name="plus" /><span>{t('Carica PDF')}</span></button>
    </div>
    {err && <div className="dn small" style={{ margin: '12px 0' }}>{t(err)}</div>}
  </div>

  return <div className="narrow coach-page">
    <div className="hdr">
      <h1 style={{ margin: 0 }}>Coach</h1>
      <span className="row" style={{ gap: 8 }}>
        {msgs.length > 0 && <button className="iconbtn" aria-label={t('Svuota')} onClick={clear}><Icon name="trash" /></button>}
        {S.coach?.consent?.agreedAt && <button className="iconbtn" aria-label={t('Dieta e analisi')} onClick={() => setShowFiles(true)}><Icon name="clipboard" /></button>}
        <button className="iconbtn" aria-label={t('Impostazioni')} onClick={() => nav('/impostazioni')}><Icon name="gear" /></button>
      </span>
    </div>
    {!S.coach?.consent?.agreedAt ? <Consent /> : <>
      <div className="seg">{TABS.map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t(l)}</button>)}</div>
      <div className="chat">
        {!msgs.length && tab !== 'chat' && <div className="eb">{t('Ancora niente qui.')}</div>}
        {!msgs.length && tab === 'chat' && <div className="card cintro"><Avatar /><p>{t('Conosco i tuoi allenamenti, il peso, la dieta e le analisi. Chiedimi quello che vuoi.')}</p></div>}
        {msgs.map((m, i) => <div key={i} className={'msg ' + m.role}>
          {m.role !== 'user' && <div className="who"><Avatar />{t(LABEL[m.kind] || 'Coach')}<small>{day(m.at)}</small></div>}
          <div className="txt">{rich(m.text)}</div>
        </div>)}
        {busy && tab === 'chat' && <div className="msg coach"><div className="who"><Avatar />Coach</div><div className="txt mu">{t('sto pensando…')}</div></div>}
        <div ref={end} />
      </div>
      {err && <div className="dn small" style={{ margin: '8px 0' }}>{t(err)}</div>}
      {tab === 'chat' && !msgs.length && !text && !busy && <div className="ideas">{IDEE.map(q => t(q)).map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}</div>}
      {tab === 'chat' && <div className="ask">
        <textarea className="field" rows={1} placeholder={t('Scrivi al coach…')} value={text} onChange={e => setText(e.target.value)} />
        <button className="sendbtn" aria-label={t('Invia')} disabled={busy || !text.trim()} onClick={() => send()}><Icon name="arrowUp" /></button>
      </div>}
    </>}
  </div>
}
