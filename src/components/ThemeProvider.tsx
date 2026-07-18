import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'auto'
const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
}>({ theme: 'auto', setTheme: () => {} })

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = localStorage.getItem('toolkit-theme') as Theme | null
    return t || 'auto'
  })

  useEffect(() => {
    localStorage.setItem('toolkit-theme', theme)
    const root = document.documentElement
    if (theme === 'auto') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)