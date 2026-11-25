import { useEffect, useRef } from 'react'
import { useUI } from '../store/useUI.js'

const BACK = 'fixed inset-0 z-50 bg-black/60 duration-200 fill-mode-forwards animate-in fade-in'

// One bottom sheet (or centered dialog) with swipe-to-dismiss.
function Sheet({ sheet }) {
  const { closeSheet } = useUI()
  const ref = useRef(null)
  const drag = useRef({ startY: null, delta: 0 })

  // Swipe down closes the sheet, the way iOS does it: whatever scrolls under the finger scrolls
  // first, and once it is at its top, the same pull carries on into closing (no second swipe).
  // Only horizontal rows and wheels (data-nodrag) and sliders keep the gesture for themselves.
  const scrollerOf = t => {
    for (let n = t; n && n !== ref.current; n = n.parentElement)
      if (n.scrollHeight > n.clientHeight && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n
    return ref.current
  }
  const onTouchStart = e => {
    const off = e.target.closest && e.target.closest('input[type=range], [data-nodrag]')
    drag.current = { startY: null, delta: 0, off, lastY: e.touches[0].clientY, sc: off ? null : scrollerOf(e.target) }
  }
  const onTouchMove = e => {
    const el = ref.current, d = drag.current
    if (d.off) return
    const y = e.touches[0].clientY
    const atTop = d.sc.scrollTop <= 0 && el.scrollTop <= 0
    if (d.startY === null && y > d.lastY && atTop) d.startY = d.lastY   // from the last point, so this move already counts
    d.lastY = y
    if (d.startY === null) return
    d.delta = y - d.startY
    if (d.delta > 0) {
      e.preventDefault()
      el.style.transition = 'none'
      el.style.transform = `translateY(${d.delta}px)`
    } else { d.startY = null; d.delta = 0; el.style.transform = '' }   // back up: it scrolls again
  }
  const onTouchEnd = () => {
    const el = ref.current, d = drag.current
    if (d.startY === null) return
    el.style.transition = 'transform .2s'
    if (d.delta > 70 && !sheet.locked) { el.style.transform = 'translateY(110%)'; setTimeout(() => closeSheet(sheet.id), 180) }
    else el.style.transform = ''
    d.startY = null
  }

  // non-passive touchmove so preventDefault works (bottom sheets only; centered dialogs have no ref)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const close = () => closeSheet(sheet.id)
  if (sheet.kind === 'center') {
    return (
      <div>
        <div className={BACK + (sheet.closing ? ' animate-out fade-out' : '')} onClick={() => { if (!sheet.locked) close() }} />
        <div className={'fixed inset-x-6 top-1/3 z-50 rounded-2xl bg-card p-5 duration-200 ' + (sheet.closing ? 'animate-out fade-out zoom-out-95 fill-mode-forwards' : 'animate-in fade-in zoom-in-95')}>{sheet.render(close)}</div>
      </div>
    )
  }
  return (
    <div>
      <div className={BACK + (sheet.closing ? ' animate-out fade-out' : '')} onClick={() => { if (!sheet.locked) close() }} />
      <div ref={ref} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        className={'fixed inset-x-0 bottom-[var(--kb)] z-50 mx-auto max-h-[calc(90vh-var(--kb))] max-w-[560px] overflow-y-auto rounded-t-[28px] bg-popover text-popover-foreground px-5 pt-2 pb-[calc(var(--bot)+20px)] shadow-2xl ease-out ' + (sheet.closing ? 'animate-out slide-out-to-bottom fill-mode-forwards duration-200' : 'animate-in slide-in-from-bottom duration-300')}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted-foreground/40" />
        {sheet.render(close)}
      </div>
    </div>
  )
}

export default function Modals() {
  const sheets = useUI(s => s.sheets)

  // lock the page behind any open sheet (iOS-safe). The band at the bottom that the installed app
  // never draws shows the html background (the section colour, Fondo.jsx): under a sheet it takes the
  // sheet's own colour, or it reads as a strip of the wrong colour under the last button.
  useEffect(() => {
    if (!sheets.length) return
    const y = window.scrollY || 0
    const b = document.body.style, h = document.documentElement.style, bg = h.background
    b.position = 'fixed'; b.top = -y + 'px'; b.left = '0'; b.right = '0'; b.width = '100%'
    h.background = 'var(--popover)'
    return () => {
      b.position = b.top = b.left = b.right = b.width = ''
      h.background = bg
      window.scrollTo(0, y)
    }
  }, [sheets.length > 0])

  if (!sheets.length) return null
  return (
    <div id="modal-root">
      {sheets.map(s => <Sheet key={s.id} sheet={s} />)}
    </div>
  )
}
