import { useTranslation } from 'react-i18next'
import ThemeSwitcher from './ThemeSwitcher'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  return (
    <header className="flex items-center justify-between p-4 bg-surface border-b border-primary/20">
      <h1 className="text-xl font-bold text-primary">ToolKit Pro</h1>
      <div className="flex items-center gap-4">
        <span className="text-text2 text-sm">Welcome, {user?.username}</span>
        <button 
          onClick={logout}
          className="px-3 py-1 rounded bg-danger text-white text-sm"
        >
          Logout
        </button>
        <ThemeSwitcher />
      </div>
    </header>
  )
}