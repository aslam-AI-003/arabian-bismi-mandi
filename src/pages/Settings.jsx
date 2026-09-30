import { useState, useEffect } from 'react'
import { 
  Printer, Usb, Wifi, WifiOff, Settings2, TestTube, 
  Loader2, Save, CheckCircle2, AlertCircle, Languages,
  Store, Phone, MapPin, Receipt, IndianRupee
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getSettings, supabase } from '../lib/supabase'
import {
  isSerialSupported,
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  loadPrinterConfig,
  savePrinterConfig,
  printTestPage,
} from '../lib/thermalPrinter'
import toast from 'react-hot-toast'

export default function Settings() {
  const { t, language, toggleLanguage } = useLanguage()
  
  // Printer state
  const [printerConnected, setPrinterConnected] = useState(false)
  const [serialSupported, setSerialSupported] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [printerConfig, setPrinterConfig] = useState({
    mode: 'silent',
    paperWidth: 80,
    autoPrint: false,
    openDrawer: false,
    printCopy: 1,
  })
  
  // Restaurant settings state
  const [restaurantSettings, setRestaurantSettings] = useState({
    restaurant_name: 'Arabian Bismi Mandi Restaurant',
    restaurant_address: 'Near Kovilady Bus Stand, Main Road, Chakkarapalli',
    restaurant_phone: '9894092449 | 9025499668 | 9600827837',
    tax_percentage: '5',
    currency_symbol: '₹',
    gst_number: '',
  })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    setSerialSupported(isSerialSupported())
    setPrinterConnected(isPrinterConnected())
    const config = loadPrinterConfig()
    setPrinterConfig(config)
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
      for (const [key, value] of Object.entries(restaurantSettings)) {
        await supabase
          .from('settings')
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }
      toast.success(language === 'ta' ? 'அமைப்புகள் சேமிக்கப்பட்டன!' : 'Settings saved!')
    } catch (error) {
      toast.error(language === 'ta' ? 'சேமிப்பு தோல்வி' : 'Failed to save settings')
    }
    setSavingSettings(false)
  }

  // Printer handlers
  const handleConnectPrinter = async () => {
    setConnecting(true)
    try {
      const result = await connectPrinter()
      if (result.success) {
        setPrinterConnected(true)
        setPrinterConfig(prev => ({ ...prev, mode: 'serial' }))
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
    setConnecting(false)
  }

  const handleDisconnectPrinter = async () => {
    const result = await disconnectPrinter()
    setPrinterConnected(false)
    setPrinterConfig(prev => ({ ...prev, mode: 'silent' }))
    savePrinterConfig({ mode: 'silent' })
    toast.success(language === 'ta' ? 'பிரிண்டர் துண்டிக்கப்பட்டது' : 'Printer disconnected')
  }

  const handleTestPrint = async () => {
    try {
      const result = await printTestPage()
      if (result.success) {
        toast.success(language === 'ta' ? 'டெஸ்ட் பிரிண்ட் வெற்றி!' : 'Test print sent!')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleConfigChange = (key, value) => {
    const updated = { ...printerConfig, [key]: value }
    setPrinterConfig(updated)
    savePrinterConfig(updated)
  }

  // Labels
  const labels = {
    settings: language === 'ta' ? 'அமைப்புகள்' : 'Settings',
    printerSettings: language === 'ta' ? 'பிரிண்டர் அமைப்புகள்' : 'Printer Settings',
    printerStatus: language === 'ta' ? 'பிரிண்டர் நிலை' : 'Printer Status',
    connected: language === 'ta' ? 'இணைக்கப்பட்டது' : 'Connected',
    disconnected: language === 'ta' ? 'இணைக்கப்படவில்லை' : 'Not Connected',
    connectPrinter: language === 'ta' ? 'USB பிரிண்டர் இணை' : 'Connect USB Printer',
    disconnectPrinter: language === 'ta' ? 'பிரிண்டர் துண்டி' : 'Disconnect Printer',
    connecting: language === 'ta' ? 'இணைக்கிறது...' : 'Connecting...',
    testPrint: language === 'ta' ? 'டெஸ்ட் பிரிண்ட்' : 'Test Print',
    printMode: language === 'ta' ? 'பிரிண்ட் முறை' : 'Print Mode',
    silentPrint: language === 'ta' ? 'பிரவுசர் பிரிண்ட்' : 'Browser Print',
    serialPrint: language === 'ta' ? 'USB நேரடி பிரிண்ட்' : 'USB Direct Print',
    paperWidth: language === 'ta' ? 'தாள் அகலம்' : 'Paper Width',
    autoPrint: language === 'ta' ? 'ஆர்டர் பின் தானியங்கி பிரிண்ட்' : 'Auto-print after order',
    openDrawer: language === 'ta' ? 'பணப்பெட்டி திற' : 'Open cash drawer after print',
    notSupported: language === 'ta' ? 'இந்த பிரவுசரில் USB பிரிண்ட் ஆதரிக்கப்படவில்லை. Chrome அல்லது Edge பயன்படுத்தவும்.' : 'USB Direct Print is not supported in this browser. Use Chrome or Edge.',
    browserPrintDesc: language === 'ta' ? 'இயல்பு பிரிண்டருக்கு அனுப்பும்' : 'Sends to default system printer',
    serialPrintDesc: language === 'ta' ? 'USB வழியாக நேரடியாக பிரிண்ட்' : 'Print directly via USB connection',
    restaurantSettings: language === 'ta' ? 'உணவகம் அமைப்புகள்' : 'Restaurant Settings',
    restaurantName: language === 'ta' ? 'உணவகம் பெயர்' : 'Restaurant Name',
    restaurantAddress: language === 'ta' ? 'முகவரி' : 'Address',
    restaurantPhone: language === 'ta' ? 'தொலைபேசி' : 'Phone Numbers',
    taxPercent: language === 'ta' ? 'GST வரி %' : 'GST Tax %',
    gstNumber: language === 'ta' ? 'GSTIN எண்' : 'GSTIN Number',
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
                <label className="text-muted text-sm mb-1 block flex items-center gap-1">
                  <Receipt size={14} /> {labels.gstNumber}
                </label>
                <input
                  type="text"
                  value={restaurantSettings.gst_number || ''}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, gst_number: e.target.value }))}
                  className="input"
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-muted text-sm mb-1 block flex items-center gap-1">
                  <IndianRupee size={14} /> {labels.taxPercent}
                </label>
                <input
                  type="number"
                  value={restaurantSettings.tax_percentage}
                  onChange={(e) => setRestaurantSettings(prev => ({ ...prev, tax_percentage: e.target.value }))}
                  className="input"
                  min="0"
                  max="28"
                  step="0.5"
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

      {/* ============================================ */}
      {/* PRINTER SETTINGS */}
      {/* ============================================ */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <Printer className="text-brand-gold" size={22} />
          {labels.printerSettings}
        </h2>

        {/* Printer Status */}
        <div className={`flex items-center justify-between p-4 rounded-xl mb-6 border-2 ${
          printerConnected 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-dark-primary/50 border-brand-gold/20'
        }`}>
          <div className="flex items-center gap-3">
            {printerConnected ? (
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Wifi className="text-green-400" size={22} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center">
                <WifiOff className="text-muted" size={22} />
              </div>
            )}
            <div>
              <p className="text-cream font-medium">{labels.printerStatus}</p>
              <p className={`text-sm ${printerConnected ? 'text-green-400' : 'text-muted'}`}>
                {printerConnected ? `✅ ${labels.connected} (USB ESC/POS)` : `⚪ ${labels.disconnected}`}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {printerConnected ? (
              <button
                onClick={handleDisconnectPrinter}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm"
              >
                {labels.disconnectPrinter}
              </button>
            ) : (
              <button
                onClick={handleConnectPrinter}
                disabled={connecting || !serialSupported}
                className="px-4 py-2 rounded-lg bg-brand-gold text-dark-primary font-semibold hover:bg-brand-gold-light transition-all text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    {labels.connecting}
                  </>
                ) : (
                  <>
                    <Usb size={16} />
                    {labels.connectPrinter}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Web Serial Not Supported Warning */}
        {!serialSupported && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-6">
            <AlertCircle className="text-yellow-400 mt-0.5 shrink-0" size={20} />
            <div>
              <p className="text-yellow-400 font-medium text-sm">USB Direct Print Not Available</p>
              <p className="text-muted text-xs mt-1">{labels.notSupported}</p>
              <p className="text-muted text-xs mt-1">
                {language === 'ta' 
                  ? 'பிரவுசர் பிரிண்ட் முறை இன்னும் வேலை செய்யும்!' 
                  : 'Browser Print mode will still work fine!'}
              </p>
            </div>
          </div>
        )}

        {/* Print Mode Selection */}
        <div className="mb-6">
          <label className="text-muted text-sm mb-3 block">{labels.printMode}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleConfigChange('mode', 'silent')}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                printerConfig.mode === 'silent'
                  ? 'border-brand-gold bg-brand-gold/10'
                  : 'border-brand-gold/20 hover:border-brand-gold/40'
              }`}
            >
              <Printer className={`mt-0.5 ${printerConfig.mode === 'silent' ? 'text-brand-gold' : 'text-muted'}`} size={22} />
              <div>
                <p className="text-cream font-medium">{labels.silentPrint}</p>
                <p className="text-muted text-xs mt-1">{labels.browserPrintDesc}</p>
              </div>
              {printerConfig.mode === 'silent' && <CheckCircle2 className="text-brand-gold ml-auto mt-0.5" size={18} />}
            </button>
            
            <button
              onClick={() => {
                if (printerConnected) {
                  handleConfigChange('mode', 'serial')
                } else {
                  toast.error(language === 'ta' ? 'முதலில் பிரிண்டர் இணைக்கவும்' : 'Connect a USB printer first')
                }
              }}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                printerConfig.mode === 'serial'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-brand-gold/20 hover:border-brand-gold/40'
              } ${!serialSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!serialSupported}
            >
              <Usb className={`mt-0.5 ${printerConfig.mode === 'serial' ? 'text-green-400' : 'text-muted'}`} size={22} />
              <div>
                <p className="text-cream font-medium">{labels.serialPrint}</p>
                <p className="text-muted text-xs mt-1">{labels.serialPrintDesc}</p>
              </div>
              {printerConfig.mode === 'serial' && <CheckCircle2 className="text-green-400 ml-auto mt-0.5" size={18} />}
            </button>
          </div>
        </div>

        {/* Paper Width */}
        <div className="mb-6">
          <label className="text-muted text-sm mb-3 block">{labels.paperWidth}</label>
          <div className="flex gap-3">
            {[
              { value: 80, label: '80mm', desc: language === 'ta' ? 'பெரிய பிரிண்டர்' : 'Standard' },
              { value: 58, label: '58mm', desc: language === 'ta' ? 'சிறிய பிரிண்டர்' : 'Compact' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => handleConfigChange('paperWidth', option.value)}
                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                  printerConfig.paperWidth === option.value
                    ? 'border-brand-gold bg-brand-gold/10'
                    : 'border-brand-gold/20 hover:border-brand-gold/40'
                }`}
              >
                <p className="text-cream font-bold text-lg">{option.label}</p>
                <p className="text-muted text-xs">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4 mb-6">
          <label className="flex items-center justify-between p-3 rounded-xl bg-dark-primary/50 border border-brand-gold/10 cursor-pointer">
            <div>
              <p className="text-cream text-sm">{labels.autoPrint}</p>
              <p className="text-muted text-xs">
                {language === 'ta' 
                  ? 'ஆர்டர் வைத்தவுடன் தானாக பிரிண்ட் ஆகும்' 
                  : 'Automatically print receipt when order is placed'}
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={printerConfig.autoPrint}
                onChange={(e) => handleConfigChange('autoPrint', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-tertiary rounded-full peer-checked:bg-brand-gold transition-all" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-all" />
            </div>
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-dark-primary/50 border border-brand-gold/10 cursor-pointer">
            <div>
              <p className="text-cream text-sm">{labels.openDrawer}</p>
              <p className="text-muted text-xs">
                {language === 'ta' 
                  ? 'பிரிண்ட் பின் பணப்பெட்டி தானாக திறக்கும்' 
                  : 'Cash drawer opens after each print (USB only)'}
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={printerConfig.openDrawer}
                onChange={(e) => handleConfigChange('openDrawer', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-tertiary rounded-full peer-checked:bg-brand-gold transition-all" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-all" />
            </div>
          </label>
        </div>

        {/* Test Print Button */}
        <button
          onClick={handleTestPrint}
          className="btn-secondary flex items-center gap-2"
        >
          <TestTube size={18} />
          {labels.testPrint}
        </button>
      </div>

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
            <span className="text-muted">Web Serial API</span>
            <span className={`font-mono ${serialSupported ? 'text-green-400' : 'text-red-400'}`}>
              {serialSupported ? '✅ Supported' : '❌ Not Supported'}
            </span>
          </div>
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">{language === 'ta' ? 'மொழி' : 'Language'}</span>
            <span className="text-cream font-mono">{language === 'ta' ? 'தமிழ்' : 'English'}</span>
          </div>
          <div className="flex justify-between p-2 rounded bg-dark-primary/50">
            <span className="text-muted">{language === 'ta' ? 'பிரிண்ட் முறை' : 'Print Mode'}</span>
            <span className="text-cream font-mono">
              {printerConfig.mode === 'serial' ? 'USB Direct (ESC/POS)' : 'Browser Print'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
