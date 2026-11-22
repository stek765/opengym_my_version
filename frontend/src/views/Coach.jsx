import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { getChat, askCoach, uploadPdf, clearChat, fileUrl, deleteFile } from '../lib/coach-api.js'
import { applyCoachChanges } from '../lib/training.js'
import { startSession } from '../lib/session.js'
import { useUI } from '../store/useUI.js'
import { ddmm } from '../lib/format.js'
import Icon from '../components/Icon.jsx'
import Bar from '../components/Bar.jsx'
import { confirmAsk } from '../components/ask.jsx'
import { t } from '../lib/i18n.js'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const LABEL = { 'after-workout': 'Dopo l’allenamento', weekly: 'La tua settimana' }
// What the coach writes by itself: two fixed entries at the top of the chat list, read-only.
const FEEDS = { 'after-workout': 'Dopo l’allenamento', weekly: 'La tua settimana' }
const day = at => ddmm(new Date(at).toISOString().slice(0, 10))
// The coach writes **bold** now and then; everything else is plain text.
const rich = t => String(t).split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p))

const IDEE = ['Segna l\'allenamento di ieri', 'Com\'è andata questa settimana?', 'Fammi una scheda per le spalle', 'Su cosa sto migliorando?']
// What a chip under the coach's message says and opens, per kind of change.
const CHIP = {
  create: ['plus', 'Creata «{0}»', c => '/progressi/scheda/' + c.id], edit: ['pencil', 'Modificata «{0}»', c => '/progressi/scheda/' + c.id], delete: ['trash', 'Eliminata «{0}»'],
  'workout-add': ['plus', 'Allenamento aggiunto: {0}', c => '/storico/' + c.id], 'workout-edit': ['pencil', 'Allenamento corretto: {0}', c => '/storico/' + c.id], 'workout-delete': ['trash', 'Allenamento tolto: {0}'],
  weight: ['scale', 'Peso segnato: {0}', () => '/allenati'], 'weight-delete': ['trash', 'Peso tolto: {0}'],
  settings: ['gear', 'Impostazioni cambiate', () => '/impostazioni'], rename: ['pencil', 'Esercizio rinominato: {0}', c => '/progressi/' + c.id], start: ['play', 'Avviato «{0}»', () => '/allenamento']
}

// Chat sessions, like a browser chat. Coming back after a while (AWAY) he picks one or starts a new one;
// within that time he lands straight back in the one he was in.
const AWAY = 30 * 60e3
const newSid = () => Date.now().toString(36)
const mem = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v) } catch { return null } }
function sessionsOf(messages) {
  const by = new Map()
  for (const m of messages) if ((m.kind || 'chat') === 'chat') {
    const k = m.sid || 'old', x = by.get(k) || { sid: k, title: '', at: 0, n: 0 }
    if (!x.title && m.role === 'user') x.title = m.text
    x.at = Math.max(x.at, m.at || 0); x.n++; by.set(k, x)
  }
  return [...by.values()].sort((a, b) => b.at - a.at)
}

function Avatar() { return <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-tinta"><Icon name="sparkles" size={17} /></span> }
const Intro = ({ children }) => <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-4"><Avatar />{children}</div>

function Consent() {
  const update = useStore(s => s.update)
  const on = async () => {
    update(s => { s.coach = { ...(s.coach || {}), consent: { agreedAt: new Date().toISOString(), version: 1 } } })
    await useStore.getState().pushState()
  }
  return <Intro>
    <p className="m-0 text-[15px] leading-snug">{t('Il coach legge i tuoi allenamenti, il peso, la dieta e i documenti che carichi, e li manda a Claude (Anthropic) per risponderti.')}</p>
    <p className="m-0 text-[15px] leading-snug">{t('Quando glielo chiedi usa l’app al posto tuo: schede, storico, peso, impostazioni. Ogni modifica si annulla con un tocco.')}</p>
    <Button className="rounded-full" onClick={on}>{t('Attiva il coach')}</Button>
  </Intro>
}

export default function Coach() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const [chat, setChat] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [showFiles, setShowFiles] = useState(false)
  const [sid, setSid] = useState(null)   // null = the list; a chat's sid, or 'after-workout' / 'weekly'
  const tab = FEEDS[sid] ? sid : 'chat'
  const fileIn = useRef(null)

  const load = () => getChat().then(c => { setChat(c); return c }).catch(e => { setErr(e.status === 401 ? '' : 'Coach non raggiungibile'); setChat({ messages: [] }) })
  const [prev] = useState(() => +mem('coach_seen') || 0)   // when he was last here, read before "seen now" overwrites it
  useEffect(() => {
    load().then(c => {
      const list = sessionsOf(c?.messages || []), last = mem('coach_sid')
      const back = Date.now() - prev < AWAY && (list.some(x => x.sid === last) || !!FEEDS[last])
      setSid(!list.length ? newSid() : back ? last : null)
    })
    const seen = () => mem('coach_seen', String(Date.now()))
    seen(); const iv = setInterval(seen, 60e3)
    return () => { seen(); clearInterval(iv) }
  }, [])
  useEffect(() => { if (sid) mem('coach_sid', sid) }, [sid])
  // straight to the last message before the first paint, no visible scroll down from the top
  // (the scroller itself to the end: its bottom padding keeps the last message above the typing bar)
  useLayoutEffect(() => { const app = document.getElementById('app'); if (app) app.scrollTop = app.scrollHeight }, [chat?.messages?.length, busy, sid])

  const send = async (said = text) => {
    const q = said.trim()
    if (!q || busy) return
    setBusy(true); setErr('')
    setChat(c => ({ ...c, messages: [...(c?.messages || []), { role: 'user', kind: 'chat', sid, text: q, at: Date.now() }] }))
    setText('')
    try {
      const r = await askCoach(q, sid)
      if (r.changes?.length) {   // the coach did something in the app: applied now, one tap to undo
        const before = structuredClone(useStore.getState().S)
        update(s => applyCoachChanges(s, r.changes))
        const go = r.changes.find(c => c.op === 'start')
        const routine = go && useStore.getState().S.routines.find(x => x.id === go.id)
        if (routine && !useStore.getState().S.active) { update(s => { s.active = startSession(s, routine) }); nav('/allenamento') }
        // undo puts back everything but a workout started meanwhile
        useUI.getState().toast(t('Fatto dal coach'), { label: t('Annulla'), run: () => update(s => { const { active } = s; Object.assign(s, before); s.active = go ? null : active }) })
      }
      await load()
    }
    catch (e) { setErr(e.message || 'Il coach non ha risposto'); setText(q) }
    setBusy(false)
  }
  const [sending, setSending] = useState(false)
  const upload = async list => {
    setErr(''); setSending(true)
    for (const f of list) {
      if (f.size > 15e6) { setErr(`${f.name}: ${t('troppo grande (max 15 MB)')}`); continue }   // the API takes 20 MB of base64
      try { const r = await uploadPdf(f); setChat(c => ({ ...c, files: r.files })) }
      catch (e) { setErr(`${f.name}: ${e.message || t('Caricamento non riuscito')}`) }
    }
    setSending(false); fileIn.current.value = ''
  }
  const dropFile = f => confirmAsk(t('Eliminare «{0}»? Il coach non lo leggerà più.', f.replace(/\.pdf$/i, '')), t('Elimina'), async () => {
    try { const r = await deleteFile(f); setChat(c => ({ ...c, files: r.files })) } catch (e) { setErr(e.message || 'Non riuscito') }
  })
  const clear = () => confirmAsk(t('Svuotare «{0}»? Quello che il coach sa di te resta.', t(FEEDS[tab])), t('Svuota'), async () => {
    setErr('')
    try { await clearChat(tab); await load() } catch (e) { setErr(e.message || 'Non riuscito') }
  })
  const drop = x => confirmAsk(t('Eliminare questa chat? Quello che il coach sa di te resta.'), t('Elimina'), async () => {
    try { await clearChat('chat', x.sid); await load() } catch (e) { setErr(e.message || 'Non riuscito') }
  })
  const msgs = (chat?.messages || []).filter(m => (m.kind || 'chat') === tab && (tab !== 'chat' || (m.sid || 'old') === sid))
  const sessions = sessionsOf(chat?.messages || [])
  const picking = !sid
  const feed = k => { const l = (chat?.messages || []).filter(m => m.kind === k); return { n: l.length, at: l.at(-1)?.at } }
  const files = chat?.files || []

  // His PDFs (diet, lab results) on their own page: tap one to open it, upload more, delete.
  if (showFiles) return <div className="narrow">
    <Bar title={t('I tuoi file')} back={{ label: 'Coach', onClick: () => setShowFiles(false) }} />
    <p className="mb-4 mt-0 text-[15px] text-muted-foreground">{t('Il coach legge questi PDF quando gli scrivi.')}</p>
    <input ref={fileIn} type="file" accept="application/pdf" multiple hidden onChange={e => upload([...e.target.files])} />
    <button className="mb-3 flex h-14 w-full items-center gap-3 rounded-2xl bg-primary px-4 text-left text-[17px] font-semibold text-primary-foreground active:opacity-80 disabled:opacity-50" disabled={sending} onClick={() => fileIn.current.click()}><Icon name="upload" size={22} />{sending ? t('Carico…') : t('Carica PDF')}</button>
    {err && <div className="mb-3 text-[13px] text-destructive">{t(err)}</div>}
    {!files.length ? <div className="py-10 text-center text-[15px] text-muted-foreground">{t('Ancora nessun file.')}</div>
      : <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{files.map(f => <div key={f} className="flex items-center">
        <a href={fileUrl(f)} target="_blank" rel="noopener" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-foreground no-underline active:bg-raised">
          <Icon name="file" size={22} className="shrink-0 text-tinta" />
          <span className="min-w-0 flex-1 truncate text-[16px] font-medium">{f.replace(/\.pdf$/i, '')}</span>
          <Icon name="chevronRight" size={18} className="shrink-0 text-muted-foreground/60" />
        </a>
        <button className="flex size-11 shrink-0 items-center justify-center text-muted-foreground active:opacity-60" aria-label={t('Elimina')} onClick={() => dropFile(f)}><Icon name="trash" size={18} /></button>
      </div>)}</section>}
  </div>

  const bubble = 'max-w-[82%] whitespace-pre-wrap rounded-[20px] px-3.5 py-2 text-[16px] leading-snug'
  return <div className="narrow">
    <Bar title={FEEDS[sid] ? t(FEEDS[sid]) : 'Coach'} back={sid && S.coach?.consent?.agreedAt ? { label: t('Chat'), onClick: () => setSid(null) } : null} right={<>
      {S.coach?.consent?.agreedAt && <Button variant="ghost" size="icon-sm" className="text-tinta" aria-label={t('Nuova chat')} onClick={() => setSid(newSid())}><Icon name="plus" /></Button>}
      {tab !== 'chat' && msgs.length > 0 && <Button variant="ghost" size="icon-sm" className="text-tinta" aria-label={t('Svuota')} onClick={clear}><Icon name="trash" /></Button>}
      {S.coach?.consent?.agreedAt && <Button variant="ghost" size="icon-sm" className="text-tinta" aria-label={t('I tuoi file')} onClick={() => setShowFiles(true)}><Icon name="folder" /></Button>}
      <Button variant="ghost" size="icon-sm" className="text-tinta" aria-label={t('Impostazioni')} onClick={() => nav('/impostazioni')}><Icon name="gear" /></Button>
    </>} />
    {!S.coach?.consent?.agreedAt ? <Consent /> : <>
      {!chat ? null : picking ? <div className="flex flex-col gap-3">
        <button className="flex h-14 w-full items-center gap-3 rounded-2xl bg-primary px-4 text-left text-[17px] font-semibold text-primary-foreground active:opacity-80" onClick={() => setSid(newSid())}><Icon name="plus" size={22} />{t('Nuova chat')}</button>
        <h2 className="mt-3 mb-0 px-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{t('Dal coach')}</h2>
        <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{Object.entries(FEEDS).map(([k, l]) => { const f = feed(k); return <button key={k} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-raised" onClick={() => setSid(k)}>
          <Icon name={k === 'weekly' ? 'calendar' : 'dumbbell'} size={20} className="shrink-0 text-tinta" />
          <span className="min-w-0 flex-1"><span className="block text-[16px] font-medium">{t(l)}</span>
            <span className="block text-[13px] text-muted-foreground">{f.n ? `${day(f.at)} · ${t('{0} messaggi', f.n)}` : t('Ancora niente qui.')}</span></span>
          <Icon name="chevronRight" size={18} className="shrink-0 text-muted-foreground/60" />
        </button> })}</section>
        {sessions.length > 0 && <h2 className="mt-3 mb-0 px-1 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{t('Le tue chat')}</h2>}
        {sessions.length > 0 && <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card">{sessions.map(x => <div key={x.sid} className="flex items-center">
          <button className="flex min-w-0 flex-1 flex-col px-4 py-3 text-left active:bg-raised" onClick={() => setSid(x.sid)}>
            <span className="truncate text-[16px] font-medium">{x.title || t('Chat')}</span>
            <span className="text-[13px] text-muted-foreground">{day(x.at)} · {t('{0} messaggi', x.n)}</span>
          </button>
          <button className="flex size-11 shrink-0 items-center justify-center text-muted-foreground active:opacity-60" aria-label={t('Elimina')} onClick={() => drop(x)}><Icon name="trash" size={18} /></button>
        </div>)}</section>}
      </div> : <div className="flex flex-col gap-2">
        {!msgs.length && tab !== 'chat' && <div className="py-12 text-center text-[15px] text-muted-foreground">{t('Ancora niente qui.')}</div>}
        {!msgs.length && tab === 'chat' && <Intro><p className="m-0 text-[15px] leading-snug">{t('Conosco i tuoi allenamenti, il peso, la dieta e le analisi. Chiedimi quello che vuoi.')}</p>
          <p className="m-0 text-[15px] leading-snug">{t('E posso fare le cose al posto tuo: creare e cambiare schede, aggiungere o togliere allenamenti dallo storico, segnare il peso, cambiare le impostazioni, far partire un allenamento. Dimmelo e lo faccio, e se non ti piace lo annulli con un tocco.')}</p></Intro>}
        {msgs.map((m, i) => m.role === 'user'
          ? <div key={i} className={bubble + ' self-end rounded-br-md bg-primary text-primary-foreground'}>{rich(m.text)}</div>
          : <div key={i} className="flex flex-col items-start gap-1">
            <span className="px-1 text-[12px] text-muted-foreground">{t(LABEL[m.kind] || 'Coach')} · {day(m.at)}</span>
            <div className={bubble + ' rounded-bl-md bg-card'}>{rich(m.text)}</div>
            {m.changes?.map((c, j) => { const [icon, label, to] = CHIP[c.op] || CHIP.edit
              const live = to && (c.op.startsWith('workout') ? S.workouts.some(w => w.id === c.id) : ['create', 'edit'].includes(c.op) ? S.routines.some(r => r.id === c.id) : true)
              const what = c.op.startsWith('workout') ? `${c.name} ${ddmm(c.d)}` : c.op.startsWith('weight') ? (c.name ? `${c.name} kg ` : '') + ddmm(c.d) : c.name
              return <button key={j} disabled={!live} className="flex max-w-[82%] items-center gap-2 rounded-xl bg-card px-3 py-2 text-left text-[14px] active:bg-raised disabled:opacity-60" onClick={() => nav(to(c))}>
                <Icon name={icon} size={16} className="shrink-0 text-tinta" />
                <span className="truncate">{t(label, what)}</span>
                {live && <Icon name="chevronRight" size={16} className="shrink-0 text-muted-foreground/60" />}
              </button> })}
          </div>)}
        {busy && tab === 'chat' && <div className={bubble + ' self-start rounded-bl-md bg-card text-muted-foreground'}>{t('sto pensando…')}</div>}
      </div>}
      {err && <div className="my-2 text-[13px] text-destructive">{t(err)}</div>}
      {tab === 'chat' && sid && !msgs.length && !text && !busy && <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{IDEE.map(q => t(q)).map(q => <button key={q} className="h-9 shrink-0 rounded-full bg-card px-3.5 text-[15px] text-tinta active:bg-raised" onClick={() => send(q)}>{q}</button>)}</div>}
      {/* room for the typing bar (a spacer: .narrow's own padding wins over a pb- class) */}
      {tab === 'chat' && sid && <div className="h-20" />}
      {/* Send fires on finger-down: with the iOS keyboard open, a normal tap first closed the keyboard, the bar
          jumped down and the click landed on nothing. preventDefault keeps the textarea (and keyboard) in place.
          The bar sits on the tab bar, or on the keyboard when that is higher. */}
      {tab === 'chat' && sid && <div className="fixed inset-x-0 bottom-[max(calc(var(--tab)+var(--bot)),var(--kb))] z-30 bg-background/85 px-4 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[520px] items-end gap-2">
          <Textarea className="max-h-36 min-h-11 resize-none rounded-[22px] border-0 bg-card px-4 py-[10px] text-[16px] leading-snug focus-visible:ring-0 md:text-[16px] dark:bg-card" rows={1} placeholder={t('Scrivi al coach…')} value={text} onChange={e => setText(e.target.value)} />
          <button className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40" aria-label={t('Invia')} disabled={busy || !text.trim()} onPointerDown={e => { e.preventDefault(); send() }} onClick={e => { if (!e.detail) send() }}><Icon name="arrowUp" size={22} strokeWidth={2.4} /></button>
        </div>
      </div>}
    </>}
  </div>
}
