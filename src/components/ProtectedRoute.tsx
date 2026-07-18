import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isTermsAccepted } from '../lib/termsHelper'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Enforce T&C acceptance
  if (!isTermsAccepted(user.uid)) {
    return <Navigate to="/terms" replace />
  }

  return <>{children}</>
}