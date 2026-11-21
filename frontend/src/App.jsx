import { useEffect, useLayoutEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from './store/useStore.js'
import { setNav } from './lib/nav.js'
import { setLang } from './lib/i18n.js'
import { useWakeLock } from './lib/wakelock.js'
import TabBar from './components/TabBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Fondo from './components/Fondo.jsx'
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
import { RoutinePage } from './views/Routines.jsx'

function Shell() {
  const navigate = useNavigate()
  const loc = useLocation()
  const { S, user, ready } = useStore()
  const isGuest = useStore(s => s.isGuest())
  setLang(S.lang)
  useEffect(() => { setNav(navigate) }, [navigate])
  const inWorkout = loc.pathname === '/allenamento'
  // which section is on screen: Fondo moves its colour behind the page, index.css picks the accent;
  // set on <html> before the first paint
  const p = loc.pathname
  const sec = inWorkout ? 'allenamento' : p.startsWith('/progressi') ? 'esercizi' : p === '/coach' || (p === '/impostazioni' && loc.state?.back !== '/allenati') ? 'coach' : 'allenati'
  useLayoutEffect(() => {
    document.documentElement.dataset.sec = sec
    document.documentElement.classList.toggle('allena', inWorkout)
  }, [sec, inWorkout])
  useWakeLock(!!S.active && S.keepAwake !== false)

  const authed = user || isGuest
  if (!ready && !authed) return <div id="app" />

  return (
    <>
      <div id="app" key={loc.pathname + S.lang + (loc.state?.tab || '')} className={!authed || inWorkout ? 'full' : ''}>
        <ErrorBoundary>
          {!authed ? <Login /> : (
            <Routes>
              <Route path="/allenati" element={<Train />} />
              <Route path="/allenamento" element={<Session />} />
              <Route path="/progressi" element={<Progress />} />
              <Route path="/progressi/scheda/:id" element={<RoutinePage />} />
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
      {authed && <Fondo sec={sec} />}
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
