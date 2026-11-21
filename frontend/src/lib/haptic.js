// A light tick under the thumb when a set is marked.
let sw = null
export function haptic() {
  try {
    if (navigator.vibrate) { navigator.vibrate(8); return }
    // ponytail: iOS Safari has no vibrate API; since iOS 18 toggling an <input switch> gives a haptic
    // tap. Undocumented, so it may stop working in a later iOS: then it just does nothing.
    if (!sw) {
      sw = document.createElement('label')
      sw.ariaHidden = 'true'
      sw.style.display = 'none'
      sw.innerHTML = '<input type="checkbox" switch>'
      document.head.appendChild(sw)
    }
    sw.click()
  } catch (e) { /* */ }
}
