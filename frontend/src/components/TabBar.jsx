import { useLocation, useNavigate } from 'react-router-dom'
import { Dumbbell, ClipboardList, Sparkles } from 'lucide-react'
import { t } from '../lib/i18n.js'

const TABS = [['allenati', 'Allenati', Dumbbell], ['progressi', 'Exercises', ClipboardList], ['coach', 'Coach', Sparkles]]
// Storico, Inizia and Impostazioni hang off a tab, which stays lit there.
// A tap always lands on the tab's home: the fresh state remounts the view (see #app key in App.jsx).
const OWNER = { storico: 'allenati', inizia: 'allenati', andamento: 'progressi', impostazioni: 'coach' }

// The bar reaches the screen's bottom edge; its content sits halfway between the line on top and the home
// indicator (a third of the indicator's room above it), not stuck to the top like iOS's own (25/11: «abbassa tutto»).
// Where iOS leaves a band undrawn (--gap) --bot is 0 and the content lands on the lowest edge it draws.
export default function TabBar() {
  const nav = useNavigate()
  const loc = useLocation()
  const cur = loc.pathname.split('/')[1]
  const on = cur === 'impostazioni' && loc.state?.back === '/allenati' ? 'allenati' : OWNER[cur] || cur
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-[var(--top)]">
      {TABS.map(([k, label, I]) => <button key={k} onClick={() => nav('/' + k, { state: { tab: Date.now() } })}
        className={'flex h-[calc(var(--tab)+var(--bot))] flex-1 flex-col items-center justify-start gap-0.5 pt-[max(4px,calc(var(--bot)*.35))] text-[10.5px] font-medium transition-colors ' + (on === k ? 'text-tinta' : 'text-muted-foreground')}>
        <I size={25} strokeWidth={on === k ? 2.1 : 1.8} />{t(label)}
      </button>)}
    </nav>
  )
}
