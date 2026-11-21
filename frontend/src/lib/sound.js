// WebAudio beeps + haptics (ported from the vanilla app). `enabled` gates sound.
let audioCtx = null
const ctx = () => audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)())
// iOS keeps an AudioContext suspended unless it is created/resumed inside a tap, and the rest
// beep fires from a timer: so every set tick calls this first.
export function unlockAudio() { try { if (ctx().state !== 'running') audioCtx.resume() } catch (e) { /* */ } }
export function beep(enabled, freq, dur, when) {
  if (!enabled) return
  try {
    ctx()
    const o = audioCtx.createOscillator(), g = audioCtx.createGain()
    o.connect(g); g.connect(audioCtx.destination)
    o.frequency.value = freq || 880; o.type = 'sine'
    const t0 = audioCtx.currentTime + (when || 0)
    g.gain.setValueAtTime(0.001, t0)
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.18))
    o.start(t0); o.stop(t0 + (dur || 0.18) + 0.05)
  } catch (e) { /* */ }
}
export function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p) } catch (e) { /* */ } }
