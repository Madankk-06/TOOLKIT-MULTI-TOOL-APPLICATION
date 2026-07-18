import { useTheme } from './ThemeProvider'
import { useTranslation } from 'react-i18next'

const options: Array<'dark' | 'light' | 'auto'> = ['dark', 'light', 'auto']

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  return (
    <select
      value={theme}
      onChange={e => setTheme(e.target.value as typeof theme)}
      className="bg-surface text-text border border-text2/30 rounded px-2 py-1"
      aria-label={t('theme.auto')}
    >
      {options.map(o => (
        <option key={o} value={o}>{t(`theme.${o}`)}</option>
      ))}
    </select>
  )
}