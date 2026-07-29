import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { I18nProvider } from './lib/i18n'
import './index.css'

/**
 * Theme and language sit outside everything else: both write to <html>, and
 * both have to be settled before the first paint of any screen that reads them.
 */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
)
