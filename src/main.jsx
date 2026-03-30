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
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
