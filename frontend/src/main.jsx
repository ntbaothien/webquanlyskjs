import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'       // must be before App
import './index.css'
import App from './App.jsx'
import useThemeStore from './store/themeStore.js'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Apply persisted theme before first render
useThemeStore.getState().initTheme();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
