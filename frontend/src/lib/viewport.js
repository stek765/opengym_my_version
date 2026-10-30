// Installed iOS app drawn under a translucent status bar: window.innerHeight can be the screen height
// minus the status bar while the page is drawn from the very top, so the bottom of the screen falls outside
// the layout viewport. That missing height, as a number. With an opaque status bar the page starts below
// it (safeTop 0) and fills the usable area, so there is nothing to correct.
export function screenGap({ standalone, screenH, innerH, safeTop }) {
  const gap = screenH - innerH
  return standalone && safeTop > 0 && gap > 0 && gap < 100 ? gap : 0
}

const probe = side => {
  const p = document.createElement('div')
  p.style.cssText = `position:fixed;left:0;${side}:0;height:env(safe-area-inset-${side});visibility:hidden`
  document.body.append(p)
  const h = p.offsetHeight
  p.remove()
  return h
}

// Measured once at start-up (and on rotation), never on resize: the keyboard shrinks innerHeight too.
export function fitScreen() {
  const set = () => document.documentElement.style.setProperty('--gap', screenGap({ standalone: navigator.standalone === true, screenH: screen.height, innerH: innerHeight, safeTop: probe('top') }) + 'px')
  set()
  addEventListener('orientationchange', () => setTimeout(set, 300))
}
