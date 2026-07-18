import { useTranslation } from 'react-i18next'

const langs = [
  { code: 'en', name: 'EN' },
  { code: 'es', name: 'ES' },
  { code: 'fr', name: 'FR' }
]

export default function LangSwitcher() {
  const { i18n } = useTranslation()
  return (
    <select
      className="bg-surface text-text border border-text2/30 rounded px-2 py-1"
      value={i18n.language}
      onChange={e => i18n.changeLanguage(e.target.value)}
      aria-label="Language"
    >
      {langs.map(l => (
        <option key={l.code} value={l.code}>{l.name}</option>
      ))}
    </select>
  )
}