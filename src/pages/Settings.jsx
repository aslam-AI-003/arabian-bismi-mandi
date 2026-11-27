import { useState, useEffect } from 'react'
import {
  Settings2, Loader2, Save, CheckCircle2, Languages,
  Store, Phone, MapPin
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getSettings, supabase } from '../lib/supabase'
import { isBluetoothSupported, getConnectedPrinterName, getSavedPrinterName } from '../lib/thermalPrinter'
import BluetoothPrinterSettings from '../components/BluetoothPrinterSettings'
import toast from 'react-hot-toast'
import BillingSettings from '../components/BillingSettings'
import OwnerWhatsAppSettings from '../components/OwnerWhatsAppSettings'
import { useAppSettings } from '../context/SettingsContext'

export default function Settings() {
  const { t, language, toggleLanguage } = useLanguage()
  const { refresh: refreshAppSettings } = useAppSettings()
  
  // Restaurant settings state
  const [restaurantSettings, setRestaurantSettings] = useState({
    restaurant_name: 'Arabian Bismi Mandi Restaurant',
    restaurant_address: 'Near Kovilady Bus Stand, Main Road, Chakkarapalli',
    restaurant_phone: '9894092449 | 9025499668 | 9600827837',
    currency_symbol: '₹',
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetchRestaurantSettings()

  }, [])

  const fetchRestaurantSettings = async () => {
    setSettingsLoading(true)
    try {
      const { data, error } = await getSettings()
      if (!error && data) {
        const settingsMap = {}
        data.forEach(item => {
          settingsMap[item.key] = item.value
        })
        setRestaurantSettings(prev => ({ ...prev, ...settingsMap }))
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setSettingsLoading(false)
  }

  const handleSaveRestaurantSettings = async () => {
    setSavingSettings(true)
    try {
      // Only this card's fields; billing/permission keys are saved by BillingSettings.
      const ownKeys = ['restaurant_name', 'restaurant_address', 'restaurant_phone', 'currency_symbol']
      for (const [key, value] of Object.entries(restaurantSettings).filter(([k]) => ownKeys.includes(k))) {
        await supabase
          .from('settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }
      toast.success(language === 'ta' ? 'அமைப்புகள் சேமிக்கப்பட்டன!' : 'Settings saved!')
      refreshAppSettings()
    } catch (error) {
      toast.error(language === 'ta' ? 'சேமிப்பு தோல்வி' : 'Failed to save settings')
    }
    setSavingSettings(false)
  }

  // Labels
  const labels = {
    settings: language === 'ta' ? 'அமைப்புகள்' : 'Settings',
    restaurantSettings: language === 'ta' ? 'உணவகம் அமைப்புகள்' : 'Restaurant Settings',
    restaurantName: language === 'ta' ? 'உணவகம் பெயர்' : 'Restaurant Name',
    restaurantAddress: language === 'ta' ? 'முகவரி' : 'Address',
    restaurantPhone: language === 'ta' ? 'தொலைபேசி' : 'Phone Numbers',
    languageSettings: language === 'ta' ? 'மொழி அமைப்புகள்' : 'Language Settings',
    saveSettings: language === 'ta' ? 'சேமி' : 'Save Settings',
    saving: language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...',
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-cream">{labels.settings}</h1>

      {/* ============================================ */}
      {/* LANGUAGE SETTINGS */}
      {/* ============================================ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <Languages className="text-brand-gold" size={22} />
          {labels.languageSettings}
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all ${
              language === 'en'
                ? 'border-brand-gold bg-brand-gold/10'
                : 'border-brand-gold/20 hover:border-brand-gold/40'
            }`}
          >
            <span className="text-2xl">🇬🇧</span>
            <div className="text-left">
              <p className="text-cream font-medium">English</p>
              <p className="text-muted text-xs">Default language</p>
            </div>
            {language === 'en' && <CheckCircle2 className="text-brand-gold ml-2" size={18} />}
          </button>
          
          <button
            onClick={toggleLanguage}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all ${
              language === 'ta'
                ? 'border-brand-gold bg-brand-gold/10'
                : 'border-brand-gold/20 hover:border-brand-gold/40'
            }`}
          >
            <span className="text-2xl">🇮🇳</span>
            <div className="text-left">
              <p className="text-cream font-medium">தமிழ்</p>
              <p className="text-muted text-xs">Tamil language</p>
            </div>
            {language === 'ta' && <CheckCircle2 className="text-brand-gold ml-2" size={18} />}
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* RESTAURANT SETTINGS */}
      {/* ============================================ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <Store className="text-brand-gold" size={22} />
          {labels.restaurantSettings}
        </h2>
        
        {settingsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-muted text-sm mb-1 block flex items-center gap-1">
                <Store size={14} /> {labels.restaurantName}
              </label>
              <input
                type="text"
                value={restaurantSettings.restaurant_name}
                onChange={(e) => setRestaurantSettings(prev => ({ ...prev, restaurant_name: e.target.value }))}
                className="input"
              />
            </div>
            
            <div>
              <label className="text-muted text-sm mb-1 block flex items-center gap-1">
                <MapPin size={14} /> {labels.restaurantAddress}
              </label>
              <textarea
                value={restaurantSettings.restaurant_address}
                onChange={(e) => setRestaurantSettings(prev => ({ ...prev, restaurant_address: e.target.value }))}
                className="input"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-muted text-sm mb-1 block flex items-center gap-1">
                  <Phone size={14} /> {labels.restaurantPhone}
                </label>
                <input
                  type="text"
                  value={restaurantSettings.restaurant_phone}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, restaurant_phone: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="text-muted text-sm mb-1 block">
                  💱 Currency Symbol
                </label>
                <input
                  type="text"
                  value={restaurantSettings.currency_symbol}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, currency_symbol: e.target.value }))}
                  className="input"
                />
              </div>
            </div>
            
            <button
              onClick={handleSaveRestaurantSettings}
              disabled={savingSettings}
              className="btn-primary flex items-center gap-2"
            >
              {savingSettings ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {savingSettings ? labels.saving : labels.saveSettings}
            </button>
          </div>
        )}
      </div>

      {/* BILLING, PERMISSIONS, EXPENSE CATEGORIES */}
      <BillingSettings />

      {/* OWNER WHATSAPP REPORT NUMBERS */}
      <OwnerWhatsAppSettings />

      {/* BLUETOOTH PRINTER (the shop has a Bluetooth printer only) */}
      <BluetoothPrinterSettings />

      {/* ============================================ */}
      {/* SYSTEM INFO */}
      {/* ============================================ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <Settings2 className="text-brand-gold" size={22} />
          {language === 'ta' ? 'கணினி தகவல்' : 'System Info'}
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">Version</span>
            <span className="text-cream font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">Browser</span>
            <span className="text-cream font-mono text-xs">{navigator.userAgent.split(' ').pop()}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">Web Bluetooth</span>
            <span className={`font-mono ${isBluetoothSupported() ? 'text-green-400' : 'text-red-400'}`}>
              {isBluetoothSupported() ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">{language === 'ta' ? 'மொழி' : 'Language'}</span>
            <span className="text-cream font-mono">{language === 'ta' ? 'தமிழ்' : 'English'}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">{language === 'ta' ? 'பிரிண்டர்' : 'Printer'}</span>
            <span className="text-cream font-mono">{getConnectedPrinterName() || getSavedPrinterName() || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
