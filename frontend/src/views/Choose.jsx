import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { suggestedRoutine } from '../lib/training.js'
import { startSession } from '../lib/session.js'
import Bar from '../components/Bar.jsx'
import Icon from '../components/Icon.jsx'
import Thumb from '../components/Thumb.jsx'
import { lastDone, pics, lastLine } from './Train.jsx'
import { t } from '../lib/i18n.js'

const H = 'px-1 pb-2 pt-6 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground'

// "Cosa fai oggi?": the suggested routine big with its pictures, then the others, a free workout last.
export default function Choose() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const sug = suggestedRoutine(S)
  const start = r => { update(s => { s.active = startSession(s, r) }); nav('/allenamento', { replace: true }) }

  return <div className="narrow">
    <Bar title={t('Cosa fai oggi?')} back={{ label: t('Allenati'), onClick: () => nav('/allenati') }} />
    {sug && <>
      <div className={H + ' !pt-1'}>{t('consigliata')}</div>
      <button className="w-full overflow-hidden rounded-2xl bg-card text-left active:bg-raised" onClick={() => start(sug)}>
        <span className="grid grid-cols-4 gap-px bg-border">{pics(S, sug).slice(0, 4).map(id => <Thumb key={id} id={id} className="!aspect-square !h-auto !w-full !rounded-none" />)}</span>
        <span className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[20px] font-semibold">{sug.name}</b>
            <span className="block truncate text-[13px] text-muted-foreground">{lastLine(sug.ex.length, lastDone(S, sug.id))}</span>
          </span>
          <span className="flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-[15px] font-medium text-primary-foreground"><Icon name="play" size={18} />{t('Inizia')}</span>
        </span>
      </button>
    </>}

    {/* the other days, each with its pictures small */}
    {S.routines.length > (sug ? 1 : 0) && <>
      <div className={H}>{t('Altre schede')}</div>
      <section className="overflow-hidden rounded-2xl bg-card">{S.routines.filter(r => r !== sug).map(r => <button key={r.id} className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left first:border-t-0 active:bg-raised" onClick={() => start(r)}>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[16px] font-medium">{r.name}</b>
          <span className="block truncate text-[12px] text-muted-foreground">{lastLine(r.ex.length, lastDone(S, r.id))}</span>
        </span>
        <span className="flex shrink-0 gap-1">{pics(S, r).slice(0, 3).map(id => <Thumb key={id} id={id} size={30} />)}</span>
      </button>)}</section>
    </>}

    <div className={H} />
    <section className="overflow-hidden rounded-2xl bg-card"><button className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-raised" onClick={() => start(null)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/15 text-tinta"><Icon name="plus" size={22} /></span>
      <span className="min-w-0 flex-1">
        <b className="block text-[17px] font-semibold">{t('Allenamento libero')}</b>
        <span className="block truncate text-[13px] text-muted-foreground">{t('scegli gli esercizi mentre vai')}</span>
      </span>
      <Icon name="chevronRight" size={18} className="text-muted-foreground/60" />
    </button></section>
  </div>
}
