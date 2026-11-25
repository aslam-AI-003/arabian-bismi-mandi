import { useEffect, useState } from 'react'
import { Receipt, ShieldCheck, Save, Loader2, Tags } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAppSettings } from '../context/SettingsContext'
import { saveSettings } from '../lib/supabase'
import { billConfigFromSettings, dbErrorMessage } from '../lib/billing'

const TYPES = [
  { v: 'TAKEAWAY', k: 'takeaway' },
  { v: 'DELIVERY', k: 'delivery' },
  { v: 'DINE_IN', k: 'dineIn' },
]

function Toggle({ checked, onChange, label, desc }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl bg-dark-primary/50 border border-brand-gold/10 cursor-pointer">
      <div>
        <p className="text-cream text-sm">{label}</p>
        {desc && <p className="text-muted text-xs">{desc}</p>}
      </div>
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-dark-tertiary rounded-full peer-checked:bg-brand-gold transition-all" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full peer-checked:translate-x-5 transition-all" />
      </div>
    </label>
  )
}

// Billing rules, cashier permissions and expense categories (stored in the
// settings table; the database reads the same keys when it builds a bill).
export default function BillingSettings() {
  const { t, language } = useLanguage()
  const { settings, refresh, cashierCanDiscount, cashierCanCancel, expenseCategories } = useAppSettings()
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const cfg = billConfigFromSettings(settings)
    setForm({
      parcelCharge: String(cfg.parcelCharge),
      parcelMode: cfg.parcelMode,
      parcelTypes: cfg.parcelOrderTypes,
      roundOff: cfg.roundOff,
      canDiscount: cashierCanDiscount,
      canCancel: cashierCanCancel,
      categories: expenseCategories.join(', '),
    })
  }, [settings, cashierCanDiscount, cashierCanCancel, expenseCategories])

  if (!form) return null
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    const charge = Number(form.parcelCharge)
    if (!Number.isFinite(charge) || charge < 0) { toast.error(t('parcelCharge')); return }
    const cats = [...new Set(form.categories.split(',').map((c) => c.trim()).filter(Boolean))].slice(0, 50)
    setSaving(true)
    const { error } = await saveSettings({
      parcel_charge: String(Math.round(charge * 100) / 100),
      parcel_mode: form.parcelMode,
      parcel_order_types: form.parcelTypes.join(','),
      round_off: form.roundOff ? 'true' : 'false',
      cashier_can_discount: form.canDiscount ? 'true' : 'false',
      cashier_can_cancel: form.canCancel ? 'true' : 'false',
      expense_categories: JSON.stringify(cats.length ? cats : ['Other']),
    })
    setSaving(false)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    toast.success(language === 'ta' ? 'அமைப்புகள் சேமிக்கப்பட்டன!' : 'Settings saved!')
    refresh()
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <Receipt className="text-brand-gold" size={22} /> {t('billingSettings')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-muted text-sm mb-1 block">{t('parcelCharge')} (₹)</label>
            <input type="number" min="0" step="0.5" className="input" value={form.parcelCharge} onChange={(e) => set('parcelCharge', e.target.value)} />
            <p className="text-muted text-xs mt-1">{language === 'ta' ? '0 = பார்சல் கட்டணம் இல்லை' : '0 = no parcel charge'}</p>
          </div>
          <div>
            <label className="text-muted text-sm mb-1 block">&nbsp;</label>
            <div className="flex gap-2">
              {[{ v: 'per_item', k: 'parcelPerItem' }, { v: 'per_order', k: 'parcelPerOrder' }].map(({ v, k }) => (
                <button key={v} type="button" onClick={() => set('parcelMode', v)} className={`flex-1 py-3 rounded-lg text-sm border-2 ${form.parcelMode === v ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-gold/20 text-muted'}`}>
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-muted text-sm mb-2">{t('parcelAppliesTo')}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {TYPES.map(({ v, k }) => {
            const on = form.parcelTypes.includes(v)
            return (
              <button key={v} type="button" onClick={() => set('parcelTypes', on ? form.parcelTypes.filter((x) => x !== v) : [...form.parcelTypes, v])} className={`px-4 py-2 rounded-full text-sm ${on ? 'bg-brand-gold text-dark-primary' : 'bg-dark-secondary text-cream'}`}>
                {on ? '✓ ' : ''}{t(k)}
              </button>
            )
          })}
        </div>
        <Toggle checked={form.roundOff} onChange={(v) => set('roundOff', v)} label={t('roundOff')} desc={t('roundOffDesc')} />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <ShieldCheck className="text-brand-gold" size={22} /> {t('permissions')}
        </h2>
        <div className="space-y-3">
          <Toggle checked={form.canDiscount} onChange={(v) => set('canDiscount', v)} label={t('cashierCanDiscount')} />
          <Toggle checked={form.canCancel} onChange={(v) => set('canCancel', v)} label={t('cashierCanCancel')} />
          <p className="text-muted text-xs">{language === 'ta' ? 'திருப்பி கொடுத்தல் எப்போதும் அட்மின் மட்டுமே.' : 'Refunds are always admin-only.'}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-cream mb-2 flex items-center gap-2">
          <Tags className="text-brand-gold" size={22} /> {t('expenseCategories')}
        </h2>
        <textarea className="input" rows={2} value={form.categories} onChange={(e) => set('categories', e.target.value)} />
        <p className="text-muted text-xs mt-1">{language === 'ta' ? 'கமாவால் பிரிக்கவும்' : 'Separate with commas'}</p>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {t('save')}
      </button>
    </div>
  )
}
