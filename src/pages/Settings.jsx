import { useLanguage } from '../context/LanguageContext'

export default function Settings() {
  const { t, language } = useLanguage()
  
  return (
    <div className="space-y-6">
      <h1 className="section-header">{t('settings')}</h1>
      <div className="card p-8 text-center">
        <p className="text-cream text-lg">
          {language === 'ta' ? 'அமைப்புகள் பக்கம் - விரைவில் வரும்!' : 'Settings page - Coming soon!'}
        </p>
        <p className="text-muted mt-2">
          {language === 'ta' 
            ? 'உணவகம், வரி மற்றும் சிஸ்டம் அமைப்புகளை கட்டமைக்கவும்' 
            : 'Configure restaurant, tax, and system settings'}
        </p>
      </div>
    </div>
  )
}
