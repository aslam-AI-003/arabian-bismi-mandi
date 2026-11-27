import { useEffect, useState } from 'react'
import { Loader2, LogOut, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { useLanguage } from '../context/LanguageContext'
import {
  signOut, getBootstrapStatus, claimFirstAdmin, saveSettings,
} from '../lib/supabase'
import { dbErrorMessage } from '../lib/billing'
import bismiLogo from '../assets/Bismi_Logo.jpg'

function Shell({ children }) {
  const { language, toggleLanguage } = useLanguage()
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-primary via-dark-secondary to-dark-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src={bismiLogo} alt="Bismi Logo" className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-brand-gold shadow-glow mb-3" />
          <h1 className="text-2xl font-decorative text-brand-gold">Arabian Bismi</h1>
          <button type="button" onClick={toggleLanguage} className="text-muted text-xs mt-2 underline">
            {language === 'en' ? 'தமிழ்' : 'English'}
          </button>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  )
}

function SignOutButton() {
  const { t } = useLanguage()
  return (
    <button type="button" onClick={() => signOut()} className="btn-secondary w-full flex items-center justify-center gap-2 mt-3">
      <LogOut size={18} /> {t('logout')}
    </button>
  )
}

export function AccessMessage({ kind }) {
  const { t } = useLanguage()
  return (
    <Shell>
      <p className="text-cream text-center mb-4">{t(kind)}</p>
      <button type="button" onClick={() => window.location.reload()} className="btn-primary w-full">{t('retry')}</button>
      <SignOutButton />
    </Shell>
  )
}

// Brand-new install: the first signed-in user becomes the admin.
function ClaimAdmin() {
  const { t, language } = useLanguage()
  const { refreshProfile } = useAuth()
  const [status, setStatus] = useState(null)
  const [error, setError] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getBootstrapStatus().then(({ data, error: e }) => {
      if (e) setError(e)
      else setStatus(data)
    })
  }, [])

  if (error) return <AccessMessage kind="dbUpdateNeeded" />
  if (!status) return <Shell><Loader2 className="w-8 h-8 animate-spin text-brand-gold mx-auto" /></Shell>
  if (status.has_admin) return <AccessMessage kind="noProfile" />

  const claim = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error: err } = await claimFirstAdmin(name)
    setBusy(false)
    if (err) { toast.error(dbErrorMessage(err, language)); return }
    await refreshProfile()
  }

  return (
    <Shell>
      <h2 className="text-xl font-semibold text-cream mb-2">{t('claimAdmin')}</h2>
      <p className="text-muted text-sm mb-4">{t('claimAdminIntro')}</p>
      <form onSubmit={claim} className="space-y-3">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} required maxLength={100} />
        <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
          {busy && <Loader2 className="animate-spin" size={18} />} {t('claimAdmin')}
        </button>
      </form>
      <SignOutButton />
    </Shell>
  )
}

// First-time setup for the admin: restaurant details, tables, billing.
function FirstTimeSetup() {
  const { t, language } = useLanguage()
  const { settings, refresh } = useAppSettings()
  const [form, setForm] = useState({
    restaurant_name: settings.restaurant_name || 'Arabian Bismi Mandi Restaurant',
    restaurant_address: settings.restaurant_address || 'Near Kovilady Bus Stand, Main Road, Chakkarapalli',
    restaurant_phone: settings.restaurant_phone || '9894092449 | 9025499668 | 9600827837',
    parcel_charge: settings.parcel_charge || '0',
    round_off: settings.round_off === 'true',
  })
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const finish = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const parcel = Math.max(Number(form.parcel_charge) || 0, 0)
      const { error } = await saveSettings({
        restaurant_name: form.restaurant_name.trim(),
        restaurant_address: form.restaurant_address.trim(),
        restaurant_phone: form.restaurant_phone.trim(),
        parcel_charge: String(parcel),
        round_off: form.round_off ? 'true' : 'false',
        setup_done: 'true',
      })
      if (error) throw error
      toast.success(language === 'ta' ? 'அமைப்பு முடிந்தது!' : 'Setup complete!')
      await refresh()
    } catch (err) {
      toast.error(dbErrorMessage(err, language))
    }
    setBusy(false)
  }

  return (
    <Shell>
      <h2 className="text-xl font-semibold text-cream mb-1 flex items-center gap-2"><Store className="text-brand-gold" size={22} /> {t('firstTimeSetup')}</h2>
      <p className="text-muted text-sm mb-4">{t('setupIntro')}</p>
      <form onSubmit={finish} className="space-y-3">
        <div>
          <label className="text-muted text-sm mb-1 block">{language === 'ta' ? 'உணவகம் பெயர்' : 'Restaurant Name'}</label>
          <input className="input" value={form.restaurant_name} onChange={set('restaurant_name')} required />
        </div>
        <div>
          <label className="text-muted text-sm mb-1 block">{language === 'ta' ? 'முகவரி' : 'Address'}</label>
          <textarea className="input" rows={2} value={form.restaurant_address} onChange={set('restaurant_address')} />
        </div>
        <div>
          <label className="text-muted text-sm mb-1 block">{language === 'ta' ? 'தொலைபேசி' : 'Phone Numbers'}</label>
          <input className="input" value={form.restaurant_phone} onChange={set('restaurant_phone')} />
        </div>
        <div>
          <label className="text-muted text-sm mb-1 block">{t('parcelCharge')} (₹ / item)</label>
          <input type="number" min="0" step="0.5" className="input" value={form.parcel_charge} onChange={set('parcel_charge')} />
        </div>
        <label className="flex items-center gap-2 text-cream text-sm">
          <input type="checkbox" checked={form.round_off} onChange={set('round_off')} /> {t('roundOffDesc')}
        </label>
        <button type="submit" disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
          {busy && <Loader2 className="animate-spin" size={18} />} {t('finishSetup')}
        </button>
      </form>
    </Shell>
  )
}

export default function Setup({ mode }) {
  return mode === 'claim' ? <ClaimAdmin /> : <FirstTimeSetup />
}
