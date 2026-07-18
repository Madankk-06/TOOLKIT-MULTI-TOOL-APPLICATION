import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { validateEnv } from './lib/envValidator'

// Validate environment variables at boot (non-blocking, logs to console)
validateEnv()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)

// ── Service Worker registration ────────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV && !navigator.webdriver) {
    // Automatically unregister service workers in development to prevent caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then(() => {
          console.log('[Dev] Unregistered service worker:', registration.scope);
        });
      }
    });
  } else {
    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(registration => {
          // Check for updates on every page load
          registration.update();
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                // New content available — send SKIP_WAITING so it takes over immediately
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch(err => console.warn("[SW] Registration failed:", err));
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }
  }
}