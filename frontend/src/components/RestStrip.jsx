import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import { t } from '../lib/i18n.js'

export default function RestStrip() {
  const timer = useUI(s => s.timer)
  const stop = useUI(s => s.stopRest)
  if (!timer) return null
  const m = Math.floor(timer.left / 60), s = String(timer.left % 60).padStart(2, '0')
  // Only "Salta" stops it: the strip itself is not a button, so a stray tap does nothing.
  return <div className="rest">
    <Icon name="timer" /><b>{m}:{s}</b><span>{t('recupero')}</span><button onClick={stop}>{t('Salta')}</button>
  </div>
}
