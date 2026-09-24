import { useState, useEffect } from 'react'
import { 
  Clock, CheckCircle2, XCircle, ChefHat, Truck, 
  UtensilsCrossed, Package, Loader2, RefreshCw, Receipt
} from 'lucide-react'
import { getOrders, updateOrderStatus, subscribeToOrders, supabase } from '../lib/supabase'
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
  const { t, language } = useLanguage()

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
    const { error } = await updateOrderStatus(orderId, newStatus)
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success(`Order updated to ${newStatus}`)
      fetchOrders()
    }
  }

  const handleViewReceipt = (order) => {
    setSelectedOrder(order)
    setShowReceiptModal(true)
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true
    return order.order_status === filter
  })

  const orderCounts = {
    all: orders.length,
    PENDING: orders.filter(o => o.order_status === 'PENDING').length,
    PREPARING: orders.filter(o => o.order_status === 'PREPARING').length,
    READY: orders.filter(o => o.order_status === 'READY').length,
    COMPLETED: orders.filter(o => o.order_status === 'COMPLETED').length,
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
                  {order.order_status === 'PENDING' && (
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

      {/* Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <ReceiptModal 
          order={selectedOrder} 
          onClose={() => {
            setShowReceiptModal(false)
            setSelectedOrder(null)
          }}
        />
      )}
    </div>
  )
}
