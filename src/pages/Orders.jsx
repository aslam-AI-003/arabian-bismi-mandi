import { useState, useEffect } from 'react'
import { 
  Clock, CheckCircle2, XCircle, ChefHat, Truck, 
  UtensilsCrossed, Package, Loader2, RefreshCw, Receipt, IndianRupee, Undo2, PlusCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getOrders, updateOrderStatus, subscribeToOrders, supabase, addPayments, recordRefund, cancelOrder } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { useConnection } from '../context/ConnectionContext'
import { balanceDue, dbErrorMessage, newId, round2, PAYMENT_METHODS } from '../lib/billing'
import PaymentModal from '../components/PaymentModal'
import Modal from '../components/Modal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import ReceiptModal from '../components/ReceiptModal'

const statusConfig = {
  PENDING: { label: 'Pending', icon: Clock, color: 'badge-pending', next: 'PREPARING' },
  PREPARING: { label: 'Preparing', icon: ChefHat, color: 'badge-preparing', next: 'READY' },
  READY: { label: 'Ready', icon: CheckCircle2, color: 'badge-ready', next: 'COMPLETED' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2, color: 'badge-completed', next: null },
  CANCELLED: { label: 'Cancelled', icon: XCircle, color: 'badge-cancelled', next: null },
}

const paymentBadge = {
  PAID: 'bg-green-500/15 text-green-400',
  PARTIAL: 'bg-yellow-500/15 text-yellow-400',
  PENDING: 'bg-red-500/15 text-red-400',
  REFUNDED: 'bg-gray-500/20 text-gray-300',
}

// Admin refund entry. The refund id stays the same across retries.
function RefundModal({ order, onClose, onDone }) {
  const { t, language } = useLanguage()
  const refundable = round2(Number(order.paid_amount) - Number(order.refunded_amount || 0))
  const [form, setForm] = useState({ id: newId(), amount: String(refundable), method: order.payment_method && order.payment_method !== 'SPLIT' ? order.payment_method : 'CASH', reason: '' })
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    setBusy(true)
    const { data, error } = await recordRefund(order.id, { ...form, amount: round2(Number(form.amount)) })
    setBusy(false)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    toast.success(`${t('refunded')} ₹${round2(Number(form.amount)).toFixed(2)}`)
    onDone(data)
  }
  return (
    <Modal
      title={`${t('refund')} · ${order.order_number}`}
      onClose={onClose}
      footer={<button onClick={submit} disabled={busy} className="w-full p-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50">{t('refund')} ₹{(Number(form.amount) || 0).toFixed(2)}</button>}
    >
      <div className="space-y-3">
        <p className="text-muted text-sm">{t('paidAmount')}: ₹{Number(order.paid_amount).toFixed(2)} · {t('refunded')}: ₹{Number(order.refunded_amount || 0).toFixed(2)}</p>
        <input type="number" min="0" step="0.01" max={refundable} className="input font-mono" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} aria-label={t('refundAmount')} />
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button key={m} type="button" onClick={() => setForm({ ...form, method: m })} className={`flex-1 py-2 rounded-lg text-sm ${form.method === m ? 'bg-brand-gold text-dark-primary' : 'bg-dark-primary text-cream'}`}>{m}</button>
          ))}
        </div>
        <input className="input" placeholder={t('reason')} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={200} />
      </div>
    </Modal>
  )
}

const typeConfig = {
  DINE_IN: { label: 'Dine In', icon: UtensilsCrossed, color: 'bg-purple-500/20 text-purple-400' },
  TAKEAWAY: { label: 'Takeaway', icon: Package, color: 'bg-orange-500/20 text-orange-400' },
  DELIVERY: { label: 'Delivery', icon: Truck, color: 'bg-cyan-500/20 text-cyan-400' },
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [collecting, setCollecting] = useState(null)
  const [refunding, setRefunding] = useState(null)
  const { t, language } = useLanguage()
  const { isAdmin } = useAuth()
  const { settings, cashierCanCancel } = useAppSettings()
  const { online } = useConnection()
  const navigate = useNavigate()
  const canCancel = isAdmin || cashierCanCancel

  useEffect(() => {
    fetchOrders()
    
    // Subscribe to real-time updates
    const channel = subscribeToOrders((payload) => {
      console.log('Order update:', payload)
      fetchOrders()
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await getOrders()
    if (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    let reason = null
    if (newStatus === 'CANCELLED') {
      reason = window.prompt(`${t('confirmCancel')}\n${t('cancelReason')}:`, '')
      if (reason === null) return // dialog dismissed
    }
    const { error } = newStatus === 'CANCELLED'
      ? await cancelOrder(orderId, reason)
      : await updateOrderStatus(orderId, newStatus)
    if (error) {
      toast.error(dbErrorMessage(error, language))
    } else {
      toast.success(`Order updated to ${newStatus}`)
      fetchOrders()
    }
  }

  const handleViewReceipt = (order) => {
    setSelectedOrder(order)
    setShowReceiptModal(true)
  }

  const handleCollect = async (rows) => {
    const { error } = await addPayments(collecting.id, rows)
    if (error) throw error
    toast.success(`${t('paidAmount')} ₹${rows.reduce((sum, r) => sum + r.amount, 0).toFixed(2)}`)
    setCollecting(null)
    fetchOrders()
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    if (filter === 'UNPAID') return balanceDue(order) > 0
    return order.order_status === filter
  })

  const orderCounts = {
    all: orders.length,
    PENDING: orders.filter(o => o.order_status === 'PENDING').length,
    PREPARING: orders.filter(o => o.order_status === 'PREPARING').length,
    READY: orders.filter(o => o.order_status === 'READY').length,
    COMPLETED: orders.filter(o => o.order_status === 'COMPLETED').length,
    UNPAID: orders.filter(o => balanceDue(o) > 0).length,
  }

  // Translations
  const statusLabels = {
    PENDING: language === 'ta' ? 'நிலுவையில்' : 'Pending',
    PREPARING: language === 'ta' ? 'தயாரிக்கிறது' : 'Preparing',
    READY: language === 'ta' ? 'தயார்' : 'Ready',
    COMPLETED: language === 'ta' ? 'முடிந்தது' : 'Completed',
    CANCELLED: language === 'ta' ? 'ரத்து' : 'Cancelled',
  }

  const typeLabels = {
    DINE_IN: language === 'ta' ? 'இங்கே சாப்பிட' : 'Dine In',
    TAKEAWAY: language === 'ta' ? 'பார்சல்' : 'Takeaway',
    DELIVERY: language === 'ta' ? 'டெலிவரி' : 'Delivery',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-gold mx-auto mb-4" />
          <p className="text-muted">{language === 'ta' ? 'ஆர்டர்கள் ஏற்றுகிறது...' : 'Loading orders...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-cream">{t('orders')}</h1>
        <button 
          onClick={fetchOrders}
          className="btn-outline flex items-center gap-2"
        >
          <RefreshCw size={18} />
          {t('refresh')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', labelKey: 'allOrders' },
          { key: 'PENDING', labelKey: 'pending' },
          { key: 'PREPARING', labelKey: 'preparing' },
          { key: 'READY', labelKey: 'ready' },
          { key: 'COMPLETED', labelKey: 'completed' },
          { key: 'UNPAID', labelKey: 'pendingPayment' },
        ].map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-brand-gold text-dark-primary font-semibold'
                : 'bg-dark-secondary/50 text-cream hover:bg-dark-secondary'
            }`}
          >
            {t(labelKey)} ({orderCounts[key] || 0})
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-cream text-lg">{t('noOrdersFound')}</p>
          <p className="text-muted mt-2">{t('ordersAppearHere')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.order_status]
            const type = typeConfig[order.order_type]
            const StatusIcon = status?.icon || Clock
            const TypeIcon = type?.icon || UtensilsCrossed

            return (
              <div key={order.id} className="card">
                {/* Order Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-brand-gold font-mono font-semibold">{order.order_number}</p>
                    <p className="text-muted text-xs mt-1">
                      {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                    </p>
                  </div>
                  <span className={`badge ${status?.color}`}>
                    <StatusIcon size={14} className="mr-1" />
                    {statusLabels[order.order_status]}
                  </span>
                </div>

                {/* Order Type & Table */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`badge ${type?.color}`}>
                    <TypeIcon size={14} className="mr-1" />
                    {typeLabels[order.order_type]}
                  </span>
                  {order.table_number && (
                    <span className="text-muted text-sm">
                      {language === 'ta' ? 'டேபிள்' : 'Table'} {order.table_number}
                    </span>
                  )}
                </div>

                {/* Order Items Preview */}
                <div className="space-y-1 mb-4">
                  {order.order_items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-cream">{item.quantity}x {item.item_name}</span>
                      <span className="text-muted">₹{item.total_price}</span>
                    </div>
                  ))}
                  {order.order_items?.length > 3 && (
                    <p className="text-muted text-xs">
                      +{order.order_items.length - 3} {language === 'ta' ? 'மேலும் பொருட்கள்' : 'more items'}
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t border-brand-gold/20">
                  <span className="text-muted">{language === 'ta' ? 'மொத்தம்' : 'Total'}</span>
                  <span className="text-brand-gold font-mono font-bold text-lg">
                    ₹{parseFloat(order.total_amount).toFixed(2)}
                  </span>
                </div>
                {order.order_status !== 'CANCELLED' && (
                  <div className="flex justify-between items-center mt-1 text-xs">
                    <span className={`badge ${paymentBadge[order.payment_status] || ''}`}>
                      {order.payment_status === 'PARTIAL' ? t('partial') : order.payment_status === 'PENDING' ? t('unpaid') : order.payment_status === 'REFUNDED' ? t('refunded') : t('paid')}
                      {order.payment_method && order.payment_status !== 'PENDING' ? ` · ${order.payment_method}` : ''}
                    </span>
                    {balanceDue(order) > 0 && <span className="text-yellow-400 font-mono">{t('balance')} ₹{balanceDue(order).toFixed(2)}</span>}
                    {Number(order.refunded_amount) > 0 && order.payment_status !== 'REFUNDED' && <span className="text-gray-300 font-mono">{t('refunded')} ₹{Number(order.refunded_amount).toFixed(2)}</span>}
                  </div>
                )}
                {order.order_status === 'CANCELLED' && order.cancel_reason && (
                  <p className="text-red-300/80 text-xs mt-1">{order.cancel_reason}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {/* View Receipt Button */}
                  <button
                    onClick={() => handleViewReceipt(order)}
                    className="p-2 rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 transition-all"
                    title={language === 'ta' ? 'ரசீது பார்' : 'View Receipt'}
                  >
                    <Receipt size={18} />
                  </button>
                  
                  {status?.next && order.order_status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, status.next)}
                      className="btn-primary flex-1 text-sm py-2"
                    >
                      {language === 'ta' 
                        ? `${statusLabels[status.next]} ஆக்கு`
                        : `Mark as ${statusLabels[status.next]}`
                      }
                    </button>
                  )}
                  {balanceDue(order) > 0 && (
                    <button
                      onClick={() => setCollecting(order)}
                      disabled={!online}
                      className="p-2 rounded-lg bg-green-600/80 text-white hover:bg-green-500 transition-all disabled:opacity-50"
                      title={t('collectBalance')}
                    >
                      <IndianRupee size={18} />
                    </button>
                  )}
                  {Number(order.paid_amount) === 0 && !['COMPLETED', 'CANCELLED'].includes(order.order_status) && (
                    <button
                      onClick={() => navigate(`/pos?order=${order.id}`)}
                      className="p-2 rounded-lg bg-blue-600/80 text-white hover:bg-blue-500 transition-all"
                      title={t('add')}
                    >
                      <PlusCircle size={18} />
                    </button>
                  )}
                  {isAdmin && Number(order.paid_amount) - Number(order.refunded_amount || 0) > 0 && (
                    <button
                      onClick={() => setRefunding(order)}
                      className="p-2 rounded-lg bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 transition-all"
                      title={t('refund')}
                    >
                      <Undo2 size={18} />
                    </button>
                  )}
                  {order.order_status === 'PENDING' && canCancel && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                      className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                      title={language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

 {collecting && (
        <PaymentModal
          title={`${t('collectBalance')} · ${collecting.order_number}`}
          due={balanceDue(collecting)}
          onConfirm={handleCollect}
          onClose={() => setCollecting(null)}
        />
      )}

      {refunding && (
        <RefundModal
          order={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => { setRefunding(null); fetchOrders() }}
        />
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          settings={settings}
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedOrder(null)
          }}
        />
      )}
    </div>
  )
}
