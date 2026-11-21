// Installed iOS app with the page under the clock (black-translucent): innerHeight is the screen height
// minus the status bar while the page is drawn from the very top, so iOS stops drawing that many px above the
// bottom edge. That missing height, as a number (index.css: the tab bar drops its home-indicator padding by it).
// No safe-area probe: on 21/11 it read 0 at start-up on his phone and the bar got the padding twice.
export function screenGap({ standalone, screenH, innerH }) {
  const gap = screenH - innerH
  return standalone && gap > 0 && gap < 100 ? gap : 0
}

// Measured at start-up and again once the page is laid out / comes back (iOS can report early values);
// iOS keeps innerHeight when the keyboard opens, so re-measuring on resize is safe there.
export function fitScreen() {
  const set = () => document.documentElement.style.setProperty('--gap', screenGap({ standalone: navigator.standalone === true, screenH: screen.height, innerH: innerHeight }) + 'px')
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
