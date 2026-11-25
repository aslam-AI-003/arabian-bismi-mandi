import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Pencil, CreditCard, XCircle, Undo2, Printer, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import PaymentModal from './PaymentModal'
import ReceiptModal from './ReceiptModal'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { useConnection } from '../context/ConnectionContext'
import { getOrderById, addPayments, recordRefund, cancelOrder } from '../lib/supabase'
import { balanceDue, dbErrorMessage, newId, round2, PAYMENT_METHODS } from '../lib/billing'

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const when = (d) => (d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '')
const isOpen = (o) => !['COMPLETED', 'CANCELLED'].includes(o.order_status)

/** Order state + payment state, like SIP N' GOSSIP. */
export function StatusBadges({ order }) {
  const { t } = useLanguage()
  const st = order.order_status === 'CANCELLED' ? ['statusCancelled', 'bg-red-500/15 text-red-400 border-red-500/30']
    : order.order_status === 'COMPLETED' ? ['statusCompleted', 'bg-green-500/15 text-green-400 border-green-500/30']
      : ['statusActive', 'bg-brand-gold/15 text-brand-gold border-brand-gold/30']
  const ps = {
    PAID: ['paid', 'bg-green-500/15 text-green-400 border-green-500/30'],
    PARTIAL: ['partial', 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'],
    PENDING: ['unpaid', 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'],
    REFUNDED: ['refunded', 'bg-red-500/15 text-red-300 border-red-500/30'],
  }[order.payment_status]
  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`badge border ${st[1]}`}>{t(st[0])}</span>
      {order.order_status !== 'CANCELLED' && ps && <span className={`badge border ${ps[1]}`}>{t(ps[0])}</span>}
    </span>
  )
}

function RefundModal({ order, onClose, onDone }) {
  const { t, language } = useLanguage()
  const { online } = useConnection()
  const max = round2(Number(order.paid_amount) - Number(order.refunded_amount || 0))
  const firstMethod = (order.payments || []).find((p) => p.kind === 'PAYMENT')?.method
  const [form, setForm] = useState({ id: newId(), amount: String(max), method: PAYMENT_METHODS.includes(firstMethod) ? firstMethod : 'CASH', reason: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async () => {
    if (!form.reason.trim()) { setErr(t('reasonRequired')); return }
    setBusy(true)
    const { data, error } = await recordRefund(order.id, { ...form, amount: round2(Number(form.amount)) })
    setBusy(false)
    if (error) { setErr(dbErrorMessage(error, language)); return }
    toast.success(`${t('refunded')} ${money(form.amount)}`)
    onDone(data)
  }
  return (
    <Modal
      title={`${t('refund')} · ${order.order_number}`}
      onClose={busy ? undefined : onClose}
      footer={(
        <button type="button" onClick={submit} disabled={busy || !online} className="w-full p-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="animate-spin" size={18} />} {t('recordRefund')}
        </button>
      )}
    >
      <div className="space-y-3">
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <p className="text-muted text-sm">{t('refundable')}: {money(max)}. {t('refundNote')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-muted text-xs mb-1 block">{t('amount')}</label>
            <input type="number" inputMode="decimal" min="0" step="0.01" className="input font-mono" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <label className="text-muted text-xs mb-1 block">{t('paymentMode')}</label>
            <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-muted text-xs mb-1 block">{t('reason')}</label>
          <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={200} />
        </div>
      </div>
    </Modal>
  )
}

function CancelModal({ order, onClose, onDone }) {
  const { t, language } = useLanguage()
  const { online } = useConnection()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async () => {
    if (!reason.trim()) { setErr(t('reasonRequired')); return }
    setBusy(true)
    const { data, error } = await cancelOrder(order.id, reason)
    setBusy(false)
    if (error) { setErr(dbErrorMessage(error, language)); return }
    toast.success(`${order.order_number} · ${t('statusCancelled')}`)
    onDone(data)
  }
  return (
    <Modal
      title={`${t('cancelOrder')} · ${order.order_number}`}
      onClose={busy ? undefined : onClose}
      footer={(
        <button type="button" onClick={submit} disabled={busy || !online} className="w-full p-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 className="animate-spin" size={18} />} {t('cancelOrder')}
        </button>
      )}
    >
      <div className="space-y-3">
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <p className="text-muted text-sm">{t('cancelNote')}{order.table_id ? ` ${order.table_number} ${t('tableFreed')}.` : ''}</p>
        <div>
          <label className="text-muted text-xs mb-1 block">{t('reason')}</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus />
        </div>
      </div>
    </Modal>
  )
}

export default function OrderDetail({ initial, onClose, onChanged }) {
  const { t, language } = useLanguage()
  const { isAdmin } = useAuth()
  const { settings, cashierCanCancel } = useAppSettings()
  const { online } = useConnection()
  const navigate = useNavigate()
  const [order, setOrder] = useState(initial)
  const [mode, setMode] = useState(null) // 'pay' | 'refund' | 'cancel' | 'receipt'

  useEffect(() => {
    getOrderById(initial.id).then(({ data }) => { if (data) setOrder(data) })
  }, [initial.id])

  const changed = (data) => {
    if (data) setOrder((o) => ({ ...o, ...data }))
    setMode(null)
    onChanged?.()
  }

  const due = balanceDue(order)
  const paidNet = round2(Number(order.paid_amount) - Number(order.refunded_amount || 0))
  const open = isOpen(order)
  const canCancel = open && (isAdmin || cashierCanCancel)
  const canEdit = open && Number(order.paid_amount) === 0
  const payments = (order.payments || []).filter((p) => p.kind === 'PAYMENT')
  const refunds = (order.payments || []).filter((p) => p.kind === 'REFUND')

  if (mode === 'receipt') return <ReceiptModal order={order} settings={settings} onClose={() => setMode(null)} />
  if (mode === 'pay') {
    return (
      <PaymentModal
        title={`${t('collectBalance')} · ${order.order_number}`}
        due={due}
        onClose={() => setMode(null)}
        onConfirm={async (rows) => {
          const { data, error } = await addPayments(order.id, rows)
          if (error) throw error
          toast.success(`${t('paidAmount')} ${money(rows.reduce((s, r) => s + r.amount, 0))}`)
          changed(data)
        }}
      />
    )
  }
  if (mode === 'refund') return <RefundModal order={order} onClose={() => setMode(null)} onDone={changed} />
  if (mode === 'cancel') return <CancelModal order={order} onClose={() => setMode(null)} onDone={changed} />

  const btn = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50'

  return (
    <Modal
      wide
      title={order.order_number}
      onClose={onClose}
      footer={(
        <div className="flex flex-wrap gap-2 justify-end">
          {canCancel && (
            <button
              type="button"
              disabled={!online}
              onClick={() => (paidNet > 0 ? toast.error(t('refundFirst')) : setMode('cancel'))}
              className={`${btn} bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25`}
            >
              <XCircle size={16} /> {t('cancelOrder')}
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={() => navigate(`/pos?order=${order.id}`)} className={`${btn} bg-dark-primary text-cream border border-brand-gold/30 hover:border-brand-gold`}>
              <Pencil size={16} /> {t('addEditItems')}
            </button>
          )}
          {due > 0 && (
            <button type="button" disabled={!online} onClick={() => setMode('pay')} className={`${btn} bg-green-600 text-white hover:bg-green-500`}>
              <CreditCard size={16} /> {t('payBalance')} {money(due)}
            </button>
          )}
          {isAdmin && paidNet > 0 && (
            <button type="button" disabled={!online} onClick={() => setMode('refund')} className={`${btn} bg-red-600/80 text-white hover:bg-red-500`}>
              <Undo2 size={16} /> {t('refund')}
            </button>
          )}
          <button type="button" onClick={() => setMode('receipt')} className={`${btn} bg-brand-gold text-dark-primary hover:bg-brand-gold-light`}>
            <Printer size={16} /> {t('receipt')}
          </button>
        </div>
      )}
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <StatusBadges order={order} />
          <span className="text-muted text-xs">
            {t(order.order_type === 'DINE_IN' ? 'dineIn' : order.order_type === 'TAKEAWAY' ? 'takeaway' : 'delivery')}
            {order.table_number ? ` · ${t('table')} ${order.table_number}` : ''}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <p className="text-muted text-xs">{t('created')}</p>
            <p className="text-cream">{when(order.created_at)}{order.created_by_name ? ` ${t('by')} ${order.created_by_name}` : ''}</p>
            {order.cancelled_at && (
              <>
                <p className="text-muted text-xs mt-2">{t('cancelled')}</p>
                <p className="text-red-300">{when(order.cancelled_at)}{order.cancel_reason ? ` – ${order.cancel_reason}` : ''}</p>
              </>
            )}
          </div>
          <div>
            {(order.customer_name || order.customer_phone) && (
              <>
                <p className="text-muted text-xs">{t('customer')}</p>
                <p className="text-cream">{order.customer_name} {order.customer_phone}</p>
              </>
            )}
            {order.customer_address && <p className="text-muted text-xs mt-1">📍 {order.customer_address}</p>}
            {order.notes && (
              <>
                <p className="text-muted text-xs mt-2">{t('instructions')}</p>
                <p className="text-cream">{order.notes}</p>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-brand-gold/15">
          <table className="w-full">
            <thead>
              <tr className="text-muted text-xs border-b border-brand-gold/15 bg-dark-primary/40">
                <th className="text-left p-2">{language === 'ta' ? 'பொருள்' : 'Item'}</th>
                <th className="text-right p-2">{language === 'ta' ? 'அளவு' : 'Qty'}</th>
                <th className="text-right p-2">{t('price')}</th>
                <th className="text-right p-2">{t('amount')}</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items?.map((i) => (
                <tr key={i.id} className="border-b border-brand-gold/10 last:border-0">
                  <td className="p-2 text-cream">{i.item_name}{i.variant ? <span className="text-muted"> ({i.variant})</span> : null}{i.notes ? <span className="block text-muted text-xs">* {i.notes}</span> : null}</td>
                  <td className="p-2 text-right text-cream">{i.quantity}</td>
                  <td className="p-2 text-right font-mono text-muted">{money(i.unit_price)}</td>
                  <td className="p-2 text-right font-mono text-cream">{money(i.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-brand-gold/15 p-3 bg-dark-primary/30">
            <p className="text-cream font-semibold mb-2">{t('payments')}</p>
            {payments.length === 0 && <p className="text-muted text-xs">{t('noPaymentsYet')}</p>}
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between py-1">
                <span className="text-cream">
                  {p.method}{p.reference ? <span className="text-muted text-xs"> · {p.reference}</span> : null}
                  <span className="block text-muted text-xs">{when(p.created_at)}{p.created_by_name ? ` · ${p.created_by_name}` : ''}</span>
                </span>
                <span className="font-mono text-green-400">{money(p.amount)}</span>
              </div>
            ))}
            {refunds.length > 0 && <hr className="border-brand-gold/15 my-2" />}
            {refunds.map((r) => (
              <div key={r.id} className="flex justify-between py-1 text-red-300">
                <span>
                  {t('refund')} · {r.method}
                  <span className="block text-xs opacity-80">{when(r.created_at)}{r.reason ? ` · ${r.reason}` : ''}</span>
                </span>
                <span className="font-mono">-{money(r.amount)}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-brand-gold/15 p-3 bg-dark-primary/30 space-y-1">
            <div className="flex justify-between text-muted"><span>{t('subtotal')}</span><span className="font-mono">{money(order.subtotal)}</span></div>
            {Number(order.discount_amount) > 0 && <div className="flex justify-between text-green-400"><span>{t('discount')}</span><span className="font-mono">-{money(order.discount_amount)}</span></div>}
            {Number(order.parcel_charge) > 0 && <div className="flex justify-between text-muted"><span>{t('parcelCharge')}</span><span className="font-mono">{money(order.parcel_charge)}</span></div>}
            {Number(order.round_off) !== 0 && <div className="flex justify-between text-muted"><span>{t('roundOff')}</span><span className="font-mono">{money(order.round_off)}</span></div>}
            <div className="flex justify-between text-brand-gold font-bold text-lg pt-1 border-t border-brand-gold/15"><span>{t('grandTotal')}</span><span className="font-mono">{money(order.total_amount)}</span></div>
            <div className="flex justify-between text-cream"><span>{t('paidAmount')}</span><span className="font-mono">{money(order.paid_amount)}</span></div>
            {Number(order.refunded_amount) > 0 && <div className="flex justify-between text-red-300"><span>{t('refunded')}</span><span className="font-mono">-{money(order.refunded_amount)}</span></div>}
            {due > 0 && <div className="flex justify-between text-yellow-400 font-semibold"><span>{t('balanceDue')}</span><span className="font-mono">{money(due)}</span></div>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
