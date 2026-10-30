// The installed iOS app stays in memory instead of closing, so it kept running an old version after a
// deploy. On every return to the foreground, ask the server which bundle it serves now and reload if it
// is a new one. State lives in localStorage, so a reload loses nothing; during a workout it waits.
export const bundleOf = html => (String(html).match(/assets\/(index-[\w-]+\.js)/) || [])[1] || null
export const shouldReload = ({ running, served, inWorkout }) => !!running && !!served && running !== served && !inWorkout

export function watchUpdates() {
  const running = bundleOf(document.documentElement.innerHTML + [...document.scripts].map(s => s.src).join(' '))
  if (!running) return   // dev server
  const inWorkout = () => location.hash.startsWith('#/allenamento')
  let pending = false
  const check = async () => {
    try {
      const served = bundleOf(await (await fetch('./?v=' + Date.now(), { cache: 'no-store' })).text())
      if (shouldReload({ running, served, inWorkout: false })) {
        if (inWorkout()) pending = true; else location.reload()
      }
    } catch { /* offline: keep what we have */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  addEventListener('hashchange', () => { if (pending && !inWorkout()) location.reload() })
  check()
}
