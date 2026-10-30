import { create } from 'zustand'
import { api } from '../lib/api.js'
import { registerCustom } from '../lib/exercises.js'
import { migrateState } from '../lib/migrate.js'

const KEY = 'gym_state_v1'
export const DEF = {
  unit: 'kg', restSec: 90, sound: true, keepAwake: true, theme: 'auto', targetW: null,
  bodyweight: [], routines: [], exWeights: {}, workouts: [], active: null, customEx: [],
  coach: null, exNames: {}, incr: {}, muscles: {}, threshold: 10
}
const clone = o => JSON.parse(JSON.stringify(o))

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrateState(Object.assign(clone(DEF), JSON.parse(raw)))
  } catch (e) { /* ignore */ }
  return clone(DEF)
}

const hasData = st => !!((st.workouts || []).length || (st.routines || []).length || (st.bodyweight || []).length)

export const useStore = create((set, get) => {
  let pushTm = null

  const persist = (S, push = true) => {
    S._ts = Date.now()
    registerCustom(S.customEx)
    localStorage.setItem(KEY, JSON.stringify(S))
    set({ S })
    if (push && get().user) {
      clearTimeout(pushTm)
      pushTm = setTimeout(() => get().pushState(), 1500)
    }
  }

  // A change made right before the app goes to background must not be lost mid-debounce.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden' || !pushTm) return
    clearTimeout(pushTm)
    pushTm = null
    get().pushState()
  })

  const clearLocalSession = () => {
    get().setUser(null)
    localStorage.removeItem('gym_guest')
    localStorage.removeItem('gym_dirty')
    localStorage.removeItem(KEY)
    persist(clone(DEF), false)
  }

  return {
    S: (() => { const s = loadState(); registerCustom(s.customEx); return s })(),
    user: (() => { try { return JSON.parse(localStorage.getItem('gym_user')) || null } catch { return null } })(),
    ready: false,
    config: null,

    // Mutate a draft of S via producer fn, then persist + schedule sync.
    update(mut, push = true) {
      const S = clone(get().S)
      mut(S)
      persist(S, push)
    },
    replaceState(S, push = false) { persist(clone(S), push) },

    // Guest = local-only, no server. Dev builds only: previews and screenshot scripts use it.
    isGuest: () => import.meta.env.DEV && localStorage.getItem('gym_guest') === '1',

    setUser(u) {
      if (u) { localStorage.setItem('gym_user', JSON.stringify(u)); localStorage.removeItem('gym_guest') }
      else localStorage.removeItem('gym_user')
      set({ user: u })
    },

    async pushState() {
      if (!get().user) return
      clearTimeout(pushTm)
      try { await api('/api/data', { method: 'PUT', body: JSON.stringify({ state: get().S }) }); localStorage.removeItem('gym_dirty') }
      catch (e) { localStorage.setItem('gym_dirty', '1') }
    },
    async pullState() {
      try {
        const { state } = await api('/api/data')
        // Local data left by another account on this phone is never pushed into this one.
        const owner = localStorage.getItem('gym_owner'), me = get().user?.id
        if (owner && me && owner !== me) { localStorage.removeItem('gym_dirty'); persist(clone(DEF), false) }
        if (me) localStorage.setItem('gym_owner', me)
        const S = get().S
        const dirty = localStorage.getItem('gym_dirty') === '1'
        if (state && (!hasData(S) || ((state._ts || 0) >= (S._ts || 0) && !dirty))) {
          const active = S.active
          const next = migrateState(Object.assign(clone(DEF), state))
          if (active) next.active = active
          persist(next, false)
        } else if (hasData(S)) { await get().pushState() }
      } catch (e) { /* offline — keep local */ }
    },

    async signOut() {
      try { await get().pushState(); await api('/api/logout', { method: 'POST', body: '{}' }) } catch (e) { /* */ }
      clearLocalSession()
    },

    async boot() {
      if (get().isGuest()) { set({ ready: true }); return }
      try { set({ config: await api('/api/config') }) } catch (e) { /* offline */ }
      try {
        const me = await api('/api/me')
        get().setUser(me.user)
        await get().pullState()
      } catch (e) {
        if (e.status === 401) get().setUser(null)
      }
      set({ ready: true })
    }
  }
})

export { hasData }
