import { Outlet } from 'react-router-dom'
import Header from './Header'
import ThemeProvider from './ThemeProvider'

export default function Layout() {
  return (
    <ThemeProvider>
      <div className="gradient-animated min-h-screen">
        <Header />
        <main className="px-4 pb-8">
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  )
}