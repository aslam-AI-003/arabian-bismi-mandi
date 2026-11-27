import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Loader2, Banknote, CreditCard, Smartphone, Info, CheckCircle2, Clock } from 'lucide-react'
import Modal from './Modal'
import { useLanguage } from '../context/LanguageContext'
import { useConnection } from '../context/ConnectionContext'
import { PAYMENT_METHODS, validatePayments, sumAmounts, cashChange, round2, newId, dbErrorMessage } from '../lib/billing'

const ICONS = { CASH: Banknote, CARD: CreditCard, UPI: Smartphone }
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const clean = (v) => String(v).replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')

/**
 * Split / part payment.
 * - Split: two or three methods. With two rows, typing one amount fills the
 *   other row with the rest.
 * - Part payment: enter less than the amount due; the rest stays as balance.
 * onConfirm(rows) receives [{ id, method, amount, reference, tendered? }] and
 * must return a promise. Row ids stay the same across retries, so a retried
 * confirm never records the same payment twice.
 */
export default function PaymentModal({ title, due, defaultMethod = 'CASH', onConfirm, onClose, allowPartial = true }) {
  const { t, language } = useLanguage()
  const { online } = useConnection()
  const [rows, setRows] = useState(() => [{ id: newId(), method: defaultMethod, amount: String(round2(due)), reference: '' }])
  const [tendered, setTendered] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const ta = language === 'ta'

  const entered = useMemo(() => sumAmounts(rows.map((r) => ({ amount: Number(r.amount) || 0 }))), [rows])
  const remaining = round2(due - entered)
  const cashRow = rows.find((r) => r.method === 'CASH')
  const change = cashRow ? cashChange(tendered, Number(cashRow.amount) || 0) : 0

  const setAmount = (id, value) => setRows((prev) => {
    const next = prev.map((r) => (r.id === id ? { ...r, amount: value } : r))
    // Two methods: the other row takes whatever is left.
    if (next.length === 2) {
      const other = next.find((r) => r.id !== id)
      other.amount = String(Math.max(round2(due - (Number(value) || 0)), 0))
    }
    return next
  })
  const setField = (id, key, value) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  const fillRest = (id) => setRows((prev) => {
    const others = sumAmounts(prev.filter((r) => r.id !== id).map((r) => ({ amount: Number(r.amount) || 0 })))
    return prev.map((r) => (r.id === id ? { ...r, amount: String(Math.max(round2(due - others), 0)) } : r))
  })

  const addRow = () => {
    const used = new Set(rows.map((r) => r.method))
    const method = PAYMENT_METHODS.find((m) => !used.has(m)) || 'CASH'
    setRows((prev) => {
      // Adding the 2nd method: split the bill in half so both rows are filled.
      if (prev.length === 1 && remaining <= 0) {
        const half = round2(Math.floor((due / 2) * 100) / 100)
        return [{ ...prev[0], amount: String(round2(due - half)) }, { id: newId(), method, amount: String(half), reference: '' }]
      }
      return [...prev, { id: newId(), method, amount: remaining > 0 ? String(remaining) : '', reference: '' }]
    })
  }

  const confirm = async () => {
    if (submitting.current) return
    const out = rows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({ id: r.id, method: r.method, amount: round2(Number(r.amount)), reference: r.reference.trim() }))
    // Cash handed over -> printed as "Cash received / Change" on the receipt
    const cash = out.find((r) => r.method === 'CASH')
    if (cash && Number(tendered) >= cash.amount) cash.tendered = round2(Number(tendered))
    const err = validatePayments(due, out)
    if (err) { setError(err); return }
    if (!allowPartial && remaining > 0) { setError(`${t('remaining')}: ${money(remaining)}`); return }
    setError('')
    submitting.current = true
    setBusy(true)
    try {
      await onConfirm(out)
    } catch (e) {
      setError(dbErrorMessage(e, language))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const over = remaining < 0
  const partial = remaining > 0
  const parts = rows.filter((r) => Number(r.amount) > 0).map((r) => `${r.method} ${money(r.amount)}`).join(' + ')
  const buttonText = partial
    ? (ta ? `இப்போது ${money(entered)} · ${money(remaining)} பாக்கி` : `Take ${money(entered)} now · ${money(remaining)} balance`)
    : (ta ? `${money(entered)} பெறு` : `Pay ${money(entered)}`) + (rows.length > 1 && parts ? ` · ${parts}` : '')

  return (
    <Modal
      title={title || t('splitPayment')}
      onClose={busy ? undefined : onClose}
      footer={(
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !online || over || entered <= 0}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="animate-spin" size={18} />}
          <span className="truncate">{buttonText}</span>
        </button>
      )}
    >
      <div className="space-y-4">
        <div className="flex gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs leading-relaxed">
          <Info size={16} className="shrink-0 mt-0.5" />
          <div>
            <p><b>{ta ? 'பிரித்து செலுத்த:' : 'Split:'}</b> {ta ? '"முறை சேர்" அழுத்தி, ஒரு தொகையை மாற்றவும் — மீதி தானாக மற்றதில் வரும் (எ.கா. Cash ₹500 + UPI மீதி).' : 'press "Add method", then change one amount — the rest fills in the other (e.g. Cash ₹500 + UPI for the rest).'}</p>
            <p className="mt-1"><b>{ta ? 'பகுதி பணம்:' : 'Part payment:'}</b> {ta ? 'இப்போது பெறும் தொகையை மட்டும் உள்ளிடவும் — மீதி பாக்கியாக இருக்கும், பின்னர் ஆர்டர்கள் பக்கத்தில் வசூலிக்கலாம்.' : 'enter only what the customer pays now — the rest stays as balance to collect later from Orders.'}</p>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 rounded-lg bg-dark-primary/60 border border-brand-gold/20">
          <span className="text-muted">{t('amountDue')}</span>
          <span className="text-2xl font-bold font-mono text-brand-gold">{money(due)}</span>
        </div>

        {rows.map((r, i) => (
          <div key={r.id} className="space-y-2 p-3 rounded-lg bg-dark-primary/40 border border-brand-gold/10">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs">{ta ? `முறை ${i + 1}` : `Method ${i + 1}`}</span>
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))} className="p-1 rounded text-red-400 hover:bg-red-500/20" aria-label="Remove">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m]
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setField(r.id, 'method', m)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium ${
                      r.method === m ? 'bg-brand-gold text-dark-primary' : 'bg-dark-secondary text-cream hover:bg-brand-gold/20'
                    }`}
                  >
                    <Icon size={14} /> {m}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={r.amount}
                  onChange={(e) => setAmount(r.id, clean(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="input py-2 font-mono"
                  style={{ paddingLeft: '1.75rem' }}
                  placeholder="0"
                  aria-label={t('amount')}
                />
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => fillRest(r.id)} className="px-3 rounded-lg bg-dark-secondary text-brand-gold text-xs hover:bg-brand-gold/20">
                  {ta ? 'மீதி' : 'Rest'}
                </button>
              )}
              {r.method !== 'CASH' && (
                <input
                  type="text"
                  value={r.reference}
                  onChange={(e) => setField(r.id, 'reference', e.target.value)}
                  className="input py-2 text-sm flex-1"
                  placeholder={t('reference')}
                  maxLength={60}
                />
              )}
            </div>
          </div>
        ))}

        {rows.length < PAYMENT_METHODS.length && (
          <button type="button" onClick={addRow} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-brand-gold/40 text-brand-gold text-sm hover:bg-brand-gold/10">
            <Plus size={16} /> {t('addPaymentRow')} {ta ? '(பிரித்து செலுத்த)' : '(split)'}
          </button>
        )}

        {cashRow && (
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-muted text-xs mb-1 block">{t('tendered')}</label>
              <input type="text" inputMode="decimal" value={tendered} onChange={(e) => setTendered(clean(e.target.value))} className="input py-2 font-mono" placeholder="0" />
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-muted text-xs">{t('change')}</p>
              <p className="text-green-400 font-mono font-bold">{money(change)}</p>
            </div>
          </div>
        )}

        {/* What will happen */}
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${over ? 'bg-red-500/10 border border-red-500/40 text-red-300' : partial ? 'bg-yellow-500/10 border border-yellow-500/40 text-yellow-300' : 'bg-green-500/10 border border-green-500/40 text-green-300'}`}>
          {over ? <Info size={16} /> : partial ? <Clock size={16} /> : <CheckCircle2 size={16} />}
          <span>
            {over
              ? (ta ? `தொகை ${money(-remaining)} அதிகம். குறைக்கவும்.` : `${money(-remaining)} more than the amount due. Reduce an amount.`)
              : partial
                ? (ta ? `பெறுவது ${money(entered)} · ${money(remaining)} பாக்கியாக இருக்கும்` : `Paying ${money(entered)} · ${money(remaining)} will stay as balance`)
                : (ta ? 'முழு தொகை செலுத்தப்படும் ✓' : 'Fully paid ✓')}
          </span>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </Modal>
  )
}
