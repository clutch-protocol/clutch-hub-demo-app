import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'
import '@fontsource/manrope/index.css'
import '@fontsource/inter/index.css'
import '@fontsource/plus-jakarta-sans/index.css'
import 'material-symbols/outlined.css'

// Explicitly register the service worker so installability is reliable on Android Chrome.
//
// registerType is 'autoUpdate', so a new build takes over as soon as the browser notices a new
// sw.js — but the browser only looks on navigation. A tab left open all day never navigates and
// would sit on an old build indefinitely, so ask for the check on a timer as well. The request is
// conditional and answers 304 when nothing has shipped.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    setInterval(() => { registration.update() }, 60 * 1000)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
