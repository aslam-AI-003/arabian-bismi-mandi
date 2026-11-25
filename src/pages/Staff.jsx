import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, KeyRound, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { getStaffList, createStaff, updateStaff, setStaffPassword } from '../lib/supabase'
import { dbErrorMessage } from '../lib/billing'
import Modal from '../components/Modal'

export default function Staff() {
  const { t, language } = useLanguage()
  const { user, refreshProfile } = useAuth()
  const { cashierCanDiscount, cashierCanCancel } = useAppSettings()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)
  const [pwFor, setPwFor] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await getStaffList()
    if (error) toast.error(dbErrorMessage(error, language))
    else setList(data || [])
    setLoading(false)
  }, [language])

  useEffect(() => { load() }, [load])

  const add = async () => {
    setBusy(true)
    const { error } = await createStaff(adding.phone, adding.password, adding.name, adding.role)
    setBusy(false)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    toast.success(language === 'ta' ? 'லாகின் தயார்' : 'Login ready. They can sign in with this mobile number.')
    setAdding(null)
    load()
  }

  const change = async (s, patch) => {
    const next = { ...s, ...patch }
    const { error } = await updateStaff(s.user_id, next.name, next.role, next.is_active)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    if (s.user_id === user?.id) refreshProfile()
    load()
  }

  const savePassword = async () => {
    setBusy(true)
    const { error } = await setStaffPassword(pwFor.user_id, pwFor.password)
    setBusy(false)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    toast.success('✓')
    setPwFor(null)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-cream">{t('staff')}</h1>
        <button onClick={() => setAdding({ name: '', phone: '', password: '', role: 'cashier' })} className="btn-primary py-2 px-4 flex items-center gap-2">
          <Plus size={18} /> {t('addStaff')}
        </button>
      </div>

      <div className="card text-sm text-muted space-y-1">
        <p><b className="text-cream">{t('admin')}</b>: {language === 'ta' ? 'எல்லா பக்கங்களும், திருப்பி கொடுத்தல், அமைப்புகள்' : 'every page, refunds, settings, staff'}</p>
        <p>
          <b className="text-cream">{t('cashier')}</b>: {language === 'ta' ? 'பில்லிங், டேபிள்கள், ஆர்டர்கள், பாக்கி வசூல்' : 'billing, tables, orders, collecting balances'}
          {' · '}{t('discountLabel')}: {cashierCanDiscount ? '✓' : '✗'} · {t('cancelOrder')}: {cashierCanCancel ? '✓' : '✗'}
          {' '}({language === 'ta' ? 'அமைப்புகளில் மாற்றலாம்' : 'change in Settings'})
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-brand-gold/20">
                <th className="py-2">{t('name')}</th>
                <th className="py-2">{t('mobile')}</th>
                <th className="py-2">{t('role')}</th>
                <th className="py-2">{t('active')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.user_id} className="border-b border-brand-gold/10 last:border-0">
                  <td className="py-2">
                    <input
                      defaultValue={s.name}
                      onBlur={(e) => e.target.value.trim() !== s.name && change(s, { name: e.target.value.trim() })}
                      className="bg-transparent text-cream border-b border-transparent focus:border-brand-gold outline-none w-36"
                      placeholder={t('name')}
                    />
                    {s.user_id === user?.id && <span className="text-brand-gold text-xs ml-1">({t('you')})</span>}
                  </td>
                  <td className="py-2 text-cream font-mono">{s.phone}</td>
                  <td className="py-2">
                    <select value={s.role} onChange={(e) => change(s, { role: e.target.value })} className="input py-1 px-2 w-auto text-sm">
                      <option value="admin">{t('admin')}</option>
                      <option value="cashier">{t('cashier')}</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => change(s, { is_active: !s.is_active })}
                      className={`badge ${s.is_active ? 'badge-ready' : 'bg-red-500/20 text-red-400'}`}
                    >
                      {s.is_active ? t('active') : t('disabled')}
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => setPwFor({ ...s, password: '' })} className="p-1 text-muted hover:text-brand-gold" title={t('resetPassword')} aria-label={t('resetPassword')}>
                      <KeyRound size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <Modal
          title={t('addStaff')}
          onClose={() => setAdding(null)}
          footer={(
            <button onClick={add} disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
              {busy && <Loader2 className="animate-spin" size={18} />} {t('save')}
            </button>
          )}
        >
          <div className="space-y-3">
            <input className="input" placeholder={t('name')} value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} maxLength={100} />
            <input className="input" type="tel" placeholder={t('mobile')} value={adding.phone} onChange={(e) => setAdding({ ...adding, phone: e.target.value })} />
            <input className="input" type="password" autoComplete="new-password" placeholder={`${t('password')} (min 6)`} value={adding.password} onChange={(e) => setAdding({ ...adding, password: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 'cashier', I: User }, { v: 'admin', I: Shield }].map(({ v, I }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAdding({ ...adding, role: v })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 ${adding.role === v ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-brand-gold/20 text-muted'}`}
                >
                  <I size={18} /> {t(v)}
                </button>
              ))}
            </div>
            <p className="text-muted text-xs">
              {language === 'ta'
                ? 'இந்த மொபைல் எண்ணுக்கு ஏற்கனவே லாகின் இருந்தால், அது இணைக்கப்படும் (கடவுச்சொல் காலியாக விடலாம்).'
                : 'If this mobile number already has a login, it is linked to this staff entry (password can be left empty).'}
            </p>
          </div>
        </Modal>
      )}

      {pwFor && (
        <Modal
          title={`${t('resetPassword')} · ${pwFor.name || pwFor.phone}`}
          onClose={() => setPwFor(null)}
          footer={(
            <button onClick={savePassword} disabled={busy} className="btn-primary w-full flex items-center justify-center gap-2">
              {busy && <Loader2 className="animate-spin" size={18} />} {t('save')}
            </button>
          )}
        >
          <input className="input" type="password" autoComplete="new-password" placeholder={`${t('newPassword')} (min 6)`} value={pwFor.password} onChange={(e) => setPwFor({ ...pwFor, password: e.target.value })} />
        </Modal>
      )}
    </div>
  )
}
