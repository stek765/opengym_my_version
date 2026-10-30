import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { fitScreen } from './lib/viewport.js'
import { watchUpdates } from './lib/update.js'

fitScreen()
watchUpdates()

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}
