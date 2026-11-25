// The installed iOS app remembers the status bar style it was added with, so both can be running:
// - "black" (an icon added 25/11 13:30): the page starts under the clock and is drawn to the bottom edge. No band.
// - "black-translucent" (index.html): if the 100lvh rule in index.css does not take, the page is drawn from the very top but innerHeight is the
//   screen minus the status bar, so iOS leaves that many px undrawn at the bottom (--gap): the tab bar can
//   only sit on that edge (index.css --bot, TabBar.jsx). Told apart by the top safe area: only the
//   translucent page runs under the clock. The probe can read 0 at start-up, so it is measured again later.
export function screenGap({ standalone, screenH, innerH, sat }) {
  const gap = screenH - innerH
  return standalone && sat > 0 && gap > 0 && gap < 100 ? gap : 0
}

const probe = () => {
  const d = document.createElement('div')
  d.style.cssText = 'position:fixed;top:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none'
  document.body.appendChild(d)
  const h = d.offsetHeight
  d.remove()
  return h
}

export function fitScreen() {
  const set = () => document.documentElement.style.setProperty('--gap', screenGap({ standalone: navigator.standalone === true, screenH: screen.height, innerH: innerHeight, sat: probe() }) + 'px')
  set(); setTimeout(set, 500)
  addEventListener('load', set); addEventListener('resize', set); addEventListener('pageshow', set)
  addEventListener('orientationchange', () => setTimeout(set, 300))
  // iOS draws the keyboard over the page instead of shrinking it: --kb is the covered height, so the
  // sheets and the coach's message bar can sit on top of it instead of behind it.
  const vv = window.visualViewport
  if (!vv) return
  const kb = () => document.documentElement.style.setProperty('--kb', Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) + 'px')
  vv.addEventListener('resize', kb); vv.addEventListener('scroll', kb)
}
