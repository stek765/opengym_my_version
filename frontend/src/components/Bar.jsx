import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'

// iOS navigation bar, sticky on every screen. The large title sits under it and scrolls away;
// once it has gone, its small copy shows in the bar with a hairline under it.
// back = { label, onClick } · right = action buttons · large=false: compact only (no big title).
export default function Bar({ title, back, right, large = true, eyebrow, children }) {
  const [sc, setSc] = useState(false)
  useEffect(() => {
    const a = document.getElementById('app')
    if (!a) return
    const f = () => setSc(a.scrollTop > 36)
    f(); a.addEventListener('scroll', f, { passive: true })
    return () => a.removeEventListener('scroll', f)
  }, [])
  // compact pages carry their own title in the page: the bar shows it only once that has scrolled away
  const small = sc
  return <>
    <header data-sc={sc} className="sticky top-0 z-20 -mx-4 flex min-h-[calc(var(--sat)+52px)] items-center justify-between gap-2 glassbar border-b border-transparent bg-background/85 px-2 pt-[var(--sat)] backdrop-blur-xl transition-colors data-[sc=true]:border-border">
      <div className="flex min-w-0 max-w-[45%]">
        {back && <button onClick={back.onClick} className="-ml-1 flex h-11 min-w-0 items-center gap-0.5 pr-2 text-[17px] text-tinta active:opacity-60">
          <ChevronLeft size={26} strokeWidth={2.2} className="shrink-0" /><span className="truncate">{back.label}</span>
        </button>}
      </div>
      <b className={'pointer-events-none absolute left-1/2 bottom-[15px] max-w-[50%] -translate-x-1/2 truncate text-center text-[17px] font-semibold transition-opacity duration-200 ' + (small ? 'opacity-100' : 'opacity-0')}>{title}</b>
      <div className="flex justify-end gap-1 pr-1">{right}</div>
    </header>
    {large && <div className="pb-3 pt-1">
      {eyebrow && <div className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>}
      <div className="flex items-center gap-3"><h1 className="m-0 flex-1 text-[32px] font-bold leading-tight tracking-tight">{title}</h1>{children}</div>
    </div>}
  </>
}
