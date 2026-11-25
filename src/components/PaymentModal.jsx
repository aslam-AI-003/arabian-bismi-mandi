import { useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Loader2, Banknote, CreditCard, Smartphone } from 'lucide-react'
import Modal from './Modal'
import { useLanguage } from '../context/LanguageContext'
import { useConnection } from '../context/ConnectionContext'
import { PAYMENT_METHODS, validatePayments, sumAmounts, cashChange, round2, newId, dbErrorMessage } from '../lib/billing'

const ICONS = { CASH: Banknote, CARD: CreditCard, UPI: Smartphone }

/**
 * Split / part payment entry.
 * onConfirm(rows) receives [{ id, method, amount, reference }] and must
 * return a promise. Row ids stay the same across retries, so a retried
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

  const entered = useMemo(() => sumAmounts(rows.map((r) => ({ amount: Number(r.amount) || 0 }))), [rows])
  const remaining = round2(Math.max(due - entered, 0))
  const cashRow = rows.find((r) => r.method === 'CASH')
  const change = cashRow ? cashChange(tendered, Number(cashRow.amount) || 0) : 0

  const update = (id, key, value) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)))

  const addRow = () => {
    const used = new Set(rows.map((r) => r.method))
    const method = PAYMENT_METHODS.find((m) => !used.has(m)) || 'CASH'
    setRows((prev) => [...prev, { id: newId(), method, amount: remaining > 0 ? String(remaining) : '', reference: '' }])
  }

  const confirm = async () => {
    if (submitting.current) return
    const clean = rows
      .filter((r) => Number(r.amount) > 0)
      .map((r) => ({ id: r.id, method: r.method, amount: round2(Number(r.amount)), reference: r.reference.trim() }))
    const err = validatePayments(due, clean)
    if (err) { setError(err); return }
    if (!allowPartial && remaining > 0) { setError(`${t('remaining')}: ₹${remaining.toFixed(2)}`); return }
    setError('')
    submitting.current = true
    setBusy(true)
    try {
      await onConfirm(clean)
    } catch (e) {
      setError(dbErrorMessage(e, language))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title || t('payment')}
      onClose={busy ? undefined : onClose}
      footer={(
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !online}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy && <Loader2 className="animate-spin" size={18} />}
          {t('confirmPayment')} · ₹{entered.toFixed(2)}
        </button>
      )}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 rounded-lg bg-dark-primary/60 border border-brand-gold/20">
          <span className="text-muted">{t('amountDue')}</span>
          <span className="text-2xl font-bold font-mono text-brand-gold">₹{Number(due).toFixed(2)}</span>
        </div>

        {rows.map((r) => (
          <div key={r.id} className="space-y-2 p-3 rounded-lg bg-dark-primary/40 border border-brand-gold/10">
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = ICONS[m]
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => update(r.id, 'method', m)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium ${
                      r.method === m ? 'bg-brand-gold text-dark-primary' : 'bg-dark-secondary text-cream hover:bg-brand-gold/20'
                    }`}
                  >
                    <Icon size={14} /> {m}
                  </button>
                )
              })}
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
                  className="px-2 rounded-lg text-red-400 hover:bg-red-500/20"
                  aria-label="Remove"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={r.amount}
                onChange={(e) => update(r.id, 'amount', e.target.value)}
                className="input py-2 font-mono"
                placeholder={t('amount')}
                aria-label={t('amount')}
              />
              {r.method !== 'CASH' && (
                <input
                  type="text"
                  value={r.reference}
                  onChange={(e) => update(r.id, 'reference', e.target.value)}
                  className="input py-2 text-sm"
                  placeholder={t('reference')}
                  maxLength={60}
                />
              )}
            </div>
          </div>
        ))}

        {rows.length < PAYMENT_METHODS.length && (
          <button type="button" onClick={addRow} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-brand-gold/40 text-brand-gold text-sm hover:bg-brand-gold/10">
            <Plus size={16} /> {t('addPaymentRow')}
          </button>
        )}

        {cashRow && (
          <div className="grid grid-cols-2 gap-2 items-end">
            <div>
              <label className="text-muted text-xs mb-1 block">{t('tendered')}</label>
              <input type="number" inputMode="decimal" min="0" value={tendered} onChange={(e) => setTendered(e.target.value)} className="input py-2 font-mono" />
            </div>
            <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-muted text-xs">{t('change')}</p>
              <p className="text-green-400 font-mono font-bold">₹{change.toFixed(2)}</p>
            </div>
          </div>
        )}

        {remaining > 0 && (
          <p className="text-yellow-400 text-sm">
            {t('remaining')}: ₹{remaining.toFixed(2)} {allowPartial && `(${t('pendingPayment')})`}
          </p>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    </Modal>
  )
}
