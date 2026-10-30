import { useEffect, useLayoutEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { bindUI } from './components/ui.jsx'
import { setNav } from './lib/nav.js'
import { setLang } from './lib/i18n.js'
import { useWakeLock } from './lib/wakelock.js'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Modals from './components/Modals.jsx'
import Toast from './components/Toast.jsx'
import Login from './views/Login.jsx'
import Train from './views/Train.jsx'
import Session from './views/Session.jsx'
import Progress from './views/Progress.jsx'
import ExerciseDetail from './views/ExerciseDetail.jsx'
import Calendar from './views/Calendar.jsx'
import Choose from './views/Choose.jsx'
import WorkoutDetail from './views/WorkoutDetail.jsx'
import Coach from './views/Coach.jsx'
import Settings from './views/Settings.jsx'

bindUI(useUI)   // lets the shared controls open sheets without importing the store at module scope

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  setLang(S.lang)
  useEffect(() => { setNav(navigate) }, [navigate])
  const inWorkout = loc.pathname === '/allenamento'
  const inCoach = loc.pathname === '/coach' || loc.pathname === '/impostazioni'   // Settings wears the coach colours
  const inProgress = loc.pathname.startsWith('/progressi')
  // Layout effect, not a plain effect: the installed iOS app samples the status strip colour at the first paint
  // after a navigation, so the new screen's colours must already be on <html> by then (it lagged one screen behind).
  useLayoutEffect(() => {
    const c = document.documentElement.classList
    c.toggle('workout', inWorkout)
    c.toggle('rosa', inCoach)
    c.toggle('ocean', inProgress)
    // the installed iOS app tints its status bar strip with these: keep them equal to the gradient's first colour
    const top = getComputedStyle(document.documentElement).getPropertyValue('--top').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', top)
  }, [inWorkout, inCoach, inProgress])
  useWakeLock(!!S.active && S.keepAwake !== false)

  const authed = user || isGuest
  if (!ready && !authed) return <div id="app" />

  return (
    <>
      <div id="app" key={loc.pathname + S.lang} className={!authed || inWorkout ? 'full' : ''}>
        <ErrorBoundary>
          {!authed ? <Login /> : (
            <Routes>
              <Route path="/allenati" element={<Train />} />
              <Route path="/allenamento" element={<Session />} />
              <Route path="/progressi" element={<Progress />} />
              <Route path="/progressi/:exId" element={<ExerciseDetail />} />
              <Route path="/storico" element={<Calendar />} />
              <Route path="/inizia" element={<Choose />} />
              <Route path="/andamento" element={<Navigate to="/progressi" replace />} />
              <Route path="/storico/:workoutId" element={<WorkoutDetail />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="/impostazioni" element={<Settings />} />
              <Route path="*" element={<Navigate to="/allenati" replace />} />
            </Routes>
          )}
        </ErrorBoundary>
      </div>
      {authed && !inWorkout && <TabBar />}
      <Modals />
      <Toast />
    </>
  )
}

export default function App() {
  const boot = useStore(s => s.boot)
  useEffect(() => { boot() }, [boot])
  return <HashRouter><Shell /></HashRouter>
}
