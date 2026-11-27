import { useEffect, useState } from 'react'
import { MessageCircle, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { getPrivateSettings, savePrivateSettings } from '../lib/supabase'
import { waNumber } from '../lib/ownerReport'
import { dbErrorMessage } from '../lib/billing'

// Up to 2 owner numbers for the WhatsApp report (stored admin-only).
export default function OwnerWhatsAppSettings() {
  const { t, language } = useLanguage()
  const [nums, setNums] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPrivateSettings().then(({ data, error }) => {
      if (error) { toast.error(dbErrorMessage(error, language)); setNums(['', '']); return }
      setNums([data.owner_whatsapp_1 || '', data.owner_whatsapp_2 || ''])
    })
  }, [language])

  const save = async () => {
    const bad = nums.find((n) => n.trim() && !waNumber(n))
    if (bad) { toast.error(`${t('mobile')}: ${bad}`); return }
    setBusy(true)
    const { error } = await savePrivateSettings({ owner_whatsapp_1: nums[0].trim(), owner_whatsapp_2: nums[1].trim() })
    setBusy(false)
    if (error) toast.error(dbErrorMessage(error, language))
    else toast.success(language === 'ta' ? 'சேமிக்கப்பட்டது' : 'Saved')
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-cream mb-1 flex items-center gap-2">
        <MessageCircle className="text-brand-gold" size={22} /> {t('ownerNumbers')}
      </h2>
      <p className="text-muted text-sm mb-4">{t('ownerHelp')}</p>
      {!nums ? <Loader2 className="w-6 h-6 animate-spin text-brand-gold" /> : (
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {[0, 1].map((i) => (
            <div key={i}>
              <label className="text-muted text-sm mb-1 block">{t('ownerNumber')} {i + 1}</label>
              <input type="tel" className="input" placeholder="9894092449" value={nums[i]} onChange={(e) => setNums((x) => x.map((v, j) => (j === i ? e.target.value : v)))} />
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={save} disabled={busy || !nums} className="btn-primary flex items-center gap-2">
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {t('save')}
      </button>
    </div>
  )
}
