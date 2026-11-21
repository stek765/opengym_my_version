import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, passkeyRegister, api, BIO } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const FIELD = 'h-12 rounded-xl border-0 bg-raised px-4 text-[17px] dark:bg-raised md:text-[17px]'

function RegisterSheet({ close }) {
  const { setUser, pushState, pullState } = useStore()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [inviteOnly, setInviteOnly] = useState(false)
  const ref = useRef(null)
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  useEffect(() => { api('/api/config').then(c => setInviteOnly(!!c.invite_only)).catch(() => {}) }, [])
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (inviteOnly && !code.trim()) { useUI.getState().toast(t('An invite code is required')); return }
    try {
      const u = await passkeyRegister(n, code.trim())
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Registration failed')) }
  }
  return <>
    <h3 className="mb-1 text-lg font-semibold">{t('Create your profile')}</h3>
    <p className="mb-4 text-[15px] leading-snug text-muted-foreground">{t('Pick a name, then confirm with {0}. The passkey is saved in your device — no password needed.', BIO)}</p>
    <Input ref={ref} className={FIELD} placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} />
    {inviteOnly && <>
      <Input className={FIELD + ' mt-2.5 text-center font-semibold tracking-[.14em]'} placeholder={t('Invite code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} />
      <p className="mt-1.5 px-1 text-[13px] text-muted-foreground">{t('This app is invite-only — enter the code you were given.')}</p>
    </>}
    <Button size="lg" className="mt-4 w-full" onClick={go}>{t('Create passkey')}</Button>
  </>
}

export default function Login() {
  const { setUser, pullState } = useStore()
  const signIn = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed')) }
  }
  return (
    <div className="narrow flex min-h-[78vh] flex-col items-center justify-center text-center">
      <span className="flex size-20 items-center justify-center rounded-[22px] bg-primary text-primary-foreground"><Icon name="dumbbell" size={42} /></span>
      <h1 className="mt-4 text-[34px] font-bold tracking-tight">openGym</h1>
      <p className="mb-9 mt-1 text-[17px] text-muted-foreground">{t('Your workouts. Your weights. Your profile.')}</p>
      {webauthnOK() ? <div className="flex w-full flex-col gap-2.5">
        <Button size="lg" className="w-full" onClick={signIn}><Icon name="person" />{t('Sign in with passkey')}</Button>
        <Button size="lg" variant="secondary" className="w-full" onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}><Icon name="sparkles" />{t('Create new profile')}</Button>
      </div> : <p className="text-muted-foreground">{t('Questo browser non supporta le passkey.')}</p>}
      <p className="mt-7 text-[13px] leading-normal text-muted-foreground">{t('Passkeys use {0} — no passwords.', BIO)}<br />{t('Each profile keeps its own plan, workouts & body weight.')}</p>
    </div>
  )
}
