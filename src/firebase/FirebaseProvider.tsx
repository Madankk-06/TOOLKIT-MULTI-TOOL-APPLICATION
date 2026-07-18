import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { ReactNode, useEffect } from 'react'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
})

export const db = getDatabase(app)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Enable offline persistence (best-effort)
    import('firebase/database').then(m => m.enableLogging(false))
    // @ts-ignore
    m.enablePersistence?.(db, { experimentalForceOwningTab: true }).catch(() => {})
  }, [])
  return <>{children}</>
}