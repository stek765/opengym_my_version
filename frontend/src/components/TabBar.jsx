import { useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'

const TABS = [['allenati', 'Allenati', 'dumbbell'], ['progressi', 'Progressi', 'chartLine'], ['coach', 'Coach', 'sparkles']]
// Storico, Andamento and Impostazioni hang off a tab, which stays lit there.
const OWNER = { storico: 'allenati', inizia: 'allenati', andamento: 'progressi', impostazioni: 'coach' }

export default function TabBar() {
  const nav = useNavigate()
  const cur = useLocation().pathname.split('/')[1]
  const on = OWNER[cur] || cur
  return (
    <nav id="tabbar">
      {TABS.map(([k, label, icon]) => <button key={k} className={on === k ? 'on' : ''} onClick={() => nav('/' + k)}><Icon name={icon} />{t(label)}</button>)}
    </nav>
  )
}
