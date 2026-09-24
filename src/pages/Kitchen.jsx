import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, ChefHat, Bell, Loader2 } from 'lucide-react'
import { getActiveOrders, updateOrderStatus, subscribeToOrders, supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'

export default function Kitchen() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchOrders()
    
    // Subscribe to real-time updates
    const channel = subscribeToOrders((payload) => {
      console.log('Kitchen order update:', payload)
      // Play notification sound for new orders
      if (payload.eventType === 'INSERT' && payload.new.order_status === 'PENDING') {
        playNotificationSound()
      }
      fetchOrders()
    })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchOrders = async () => {
    const { data, error } = await getActiveOrders()
    if (error) {
      toast.error(t('failedToLoad'))
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  const playNotificationSound = () => {
    // Create a simple beep sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (e) {
      console.log('Audio not supported')
    }
  }

  const statusTranslations = {
    PENDING: language === 'ta' ? 'நிலுவையில்' : 'Pending',
    PREPARING: language === 'ta' ? 'தயாரிக்கிறது' : 'Preparing',
    READY: language === 'ta' ? 'தயார்' : 'Ready',
    COMPLETED: language === 'ta' ? 'முடிந்தது' : 'Completed',
  }

  const handleStatusUpdate = async (orderId, newStatus) => {
    const { error } = await updateOrderStatus(orderId, newStatus)
    if (error) {
      toast.error(t('failedToLoad'))
    } else {
      toast.success(`${statusTranslations[newStatus]}`)
      fetchOrders()
    }
  }

  const pendingOrders = orders.filter(o => o.order_status === 'PENDING')
  const preparingOrders = orders.filter(o => o.order_status === 'PREPARING')
  const readyOrders = orders.filter(o => o.order_status === 'READY')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-gold" />
      </div>
    )
  }

  const typeLabels = {
    DINE_IN: language === 'ta' ? 'இங்கே சாப்பிட' : 'Dine In',
    TAKEAWAY: language === 'ta' ? 'பார்சல்' : 'Takeaway',
    DELIVERY: language === 'ta' ? 'டெலிவரி' : 'Delivery',
  }

  const OrderCard = ({ order, onAction, actionLabel, actionColor = 'btn-primary' }) => (
    <div className="card bg-dark-secondary/80 border-2 border-brand-gold/30">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-brand-gold font-mono font-bold text-lg">{order.order_number}</p>
          <p className="text-muted text-sm">
            {order.order_type === 'DINE_IN' 
              ? `🍽️ ${t('table')} ${order.table_number}` 
              : order.order_type === 'TAKEAWAY' 
                ? `📦 ${typeLabels.TAKEAWAY}` 
                : `🛵 ${typeLabels.DELIVERY}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted flex items-center gap-1">
            <Clock size={14} />
            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {order.order_items?.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 rounded bg-dark-primary/50">
            <span className="w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold">
              {item.quantity}
            </span>
            <div className="flex-1">
              <p className="text-cream font-medium">{item.item_name}</p>
              {item.variant && <p className="text-muted text-sm">{item.variant}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-4 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-400 text-sm">📝 {order.notes}</p>
        </div>
      )}

      {/* Action Button */}
      {onAction && (
        <button
          onClick={() => onAction(order.id)}
          className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${actionColor}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )

  return (
    <div className="h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-cream flex items-center gap-2">
          <ChefHat className="text-brand-gold" />
          {t('kitchenDisplay')}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400">
            <Bell size={18} />
            <span className="font-bold">{pendingOrders.length}</span>
            <span className="text-sm">{language === 'ta' ? 'புதிய' : 'New'}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 text-blue-400">
            <ChefHat size={18} />
            <span className="font-bold">{preparingOrders.length}</span>
            <span className="text-sm">{t('cooking')}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle2 size={18} />
            <span className="font-bold">{readyOrders.length}</span>
            <span className="text-sm">{t('ready')}</span>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-3 gap-4 h-[calc(100%-80px)]">
        {/* NEW ORDERS */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <Bell className="text-yellow-400" />
            <h2 className="text-yellow-400 font-bold text-lg">{t('newOrders')}</h2>
            <span className="ml-auto bg-yellow-500 text-dark-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">
              {pendingOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <Bell size={48} className="mx-auto mb-4 opacity-30" />
                <p>{t('noNewOrders')}</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={(id) => handleStatusUpdate(id, 'PREPARING')}
                  actionLabel={`🍳 ${t('startPreparing')}`}
                  actionColor="bg-yellow-500 text-dark-primary hover:bg-yellow-400"
                />
              ))
            )}
          </div>
        </div>

        {/* PREPARING */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <ChefHat className="text-blue-400" />
            <h2 className="text-blue-400 font-bold text-lg">{t('preparing')}</h2>
            <span className="ml-auto bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
              {preparingOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <ChefHat size={48} className="mx-auto mb-4 opacity-30" />
                <p>{t('nothingCooking')}</p>
              </div>
            ) : (
              preparingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={(id) => handleStatusUpdate(id, 'READY')}
                  actionLabel={`✅ ${t('readyToServe')}`}
                  actionColor="bg-blue-500 text-white hover:bg-blue-400"
                />
              ))
            )}
          </div>
        </div>

        {/* READY */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="text-green-400" />
            <h2 className="text-green-400 font-bold text-lg">{t('ready')}</h2>
            <span className="ml-auto bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
              {readyOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-30" />
                <p>{t('noReadyOrders')}</p>
              </div>
            ) : (
              readyOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={(id) => handleStatusUpdate(id, 'COMPLETED')}
                  actionLabel={`🎉 ${t('completeClose')}`}
                  actionColor="bg-green-500 text-white hover:bg-green-400"
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
