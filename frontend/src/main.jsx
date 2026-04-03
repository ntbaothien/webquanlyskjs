import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'       // must be before App
import './index.css'
import App from './App.jsx'
import useThemeStore from './store/themeStore.js'

// Apply persisted theme before first render
useThemeStore.getState().initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
