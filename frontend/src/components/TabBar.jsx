import { useLocation, useNavigate } from 'react-router-dom'
import { Dumbbell, ClipboardList, Sparkles } from 'lucide-react'
import { t } from '../lib/i18n.js'

const TABS = [['allenati', 'Allenati', Dumbbell], ['progressi', 'Exercises', ClipboardList], ['coach', 'Coach', Sparkles]]
// Storico, Inizia and Impostazioni hang off a tab, which stays lit there.
// A tap always lands on the tab's home: the fresh state remounts the view (see #app key in App.jsx).
const OWNER = { storico: 'allenati', inizia: 'allenati', andamento: 'progressi', impostazioni: 'coach' }

export default function TabBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const cur = loc.pathname.split('/')[1]
  const on = cur === 'impostazioni' && loc.state?.back === '/allenati' ? 'allenati' : OWNER[cur] || cur
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-[var(--top)] pb-[var(--bot)]">
      {TABS.map(([k, label, I]) => <button key={k} onClick={() => nav('/' + k, { state: { tab: Date.now() } })}
        className={'flex h-[var(--tab)] flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors ' + (on === k ? 'text-tinta' : 'text-muted-foreground')}>
        <I size={25} strokeWidth={on === k ? 2.1 : 1.8} />{t(label)}
      </button>)}
    </nav>
  )
}
