import { useState, useEffect } from 'react'
import { Clock, CheckCircle2, ChefHat, Bell, Loader2 } from 'lucide-react'
import { getActiveOrders, updateOrderStatus, subscribeToOrders, supabase } from '../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'

export default function Kitchen() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending') // For mobile view
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
    <div className="card bg-dark-secondary/80 border-2 border-brand-gold/30 mb-4">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-brand-gold font-mono font-bold text-base sm:text-lg">{order.order_number}</p>
          <p className="text-muted text-xs sm:text-sm">
            {order.order_type === 'DINE_IN' 
              ? `🍽️ ${t('table')} ${order.table_number}` 
              : order.order_type === 'TAKEAWAY' 
                ? `📦 ${typeLabels.TAKEAWAY}` 
                : `🛵 ${typeLabels.DELIVERY}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-sm text-muted flex items-center gap-1">
            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
            <span className="sm:hidden">{formatDistanceToNow(new Date(order.created_at))}</span>
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-4 max-h-40 sm:max-h-48 overflow-y-auto">
        {order.order_items?.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 sm:gap-3 p-2 rounded bg-dark-primary/50">
            <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold text-sm">
              {item.quantity}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-cream font-medium text-sm truncate">{item.item_name}</p>
              {item.variant && <p className="text-muted text-xs truncate">{item.variant}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-4 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-400 text-xs sm:text-sm">📝 {order.notes}</p>
        </div>
      )}

      {/* Action Button */}
      {onAction && (
        <button
          onClick={() => onAction(order.id)}
          className={`w-full py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-lg transition-all ${actionColor}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )

  // Get orders based on active tab for mobile view
  const getActiveTabOrders = () => {
    switch(activeTab) {
      case 'pending': return pendingOrders
      case 'preparing': return preparingOrders
      case 'ready': return readyOrders
      default: return pendingOrders
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-cream flex items-center gap-2">
          <ChefHat className="text-brand-gold" size={24} />
          {t('kitchenDisplay')}
        </h1>
        
        {/* Stats - Hidden on mobile, visible on larger screens */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          <div className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full bg-yellow-500/20 text-yellow-400">
            <Bell size={16} />
            <span className="font-bold">{pendingOrders.length}</span>
            <span className="text-xs lg:text-sm">{language === 'ta' ? 'புதிய' : 'New'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full bg-blue-500/20 text-blue-400">
            <ChefHat size={16} />
            <span className="font-bold">{preparingOrders.length}</span>
            <span className="text-xs lg:text-sm">{t('cooking')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full bg-green-500/20 text-green-400">
            <CheckCircle2 size={16} />
            <span className="font-bold">{readyOrders.length}</span>
            <span className="text-xs lg:text-sm">{t('ready')}</span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="flex md:hidden gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm ${
            activeTab === 'pending'
              ? 'bg-yellow-500 text-dark-primary font-bold'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}
        >
          <Bell size={16} />
          {t('newOrders')} ({pendingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('preparing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm ${
            activeTab === 'preparing'
              ? 'bg-blue-500 text-white font-bold'
              : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          <ChefHat size={16} />
          {t('preparing')} ({preparingOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm ${
            activeTab === 'ready'
              ? 'bg-green-500 text-white font-bold'
              : 'bg-green-500/20 text-green-400'
          }`}
        >
          <CheckCircle2 size={16} />
          {t('ready')} ({readyOrders.length})
        </button>
      </div>

      {/* Mobile View - Single Column with Tabs */}
      <div className="md:hidden">
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <Bell size={40} className="mx-auto mb-4 opacity-30" />
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
        )}
        {activeTab === 'preparing' && (
          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <ChefHat size={40} className="mx-auto mb-4 opacity-30" />
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
        )}
        {activeTab === 'ready' && (
          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <CheckCircle2 size={40} className="mx-auto mb-4 opacity-30" />
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
        )}
      </div>

      {/* Desktop View - Three Column Layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* NEW ORDERS */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <Bell className="text-yellow-400" size={18} />
            <h2 className="text-yellow-400 font-bold text-sm lg:text-lg">{t('newOrders')}</h2>
            <span className="ml-auto bg-yellow-500 text-dark-primary w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-sm">
              {pendingOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <Bell size={40} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">{t('noNewOrders')}</p>
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
          <div className="flex items-center gap-2 mb-4 px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <ChefHat className="text-blue-400" size={18} />
            <h2 className="text-blue-400 font-bold text-sm lg:text-lg">{t('preparing')}</h2>
            <span className="ml-auto bg-blue-500 text-white w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-sm">
              {preparingOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <ChefHat size={40} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">{t('nothingCooking')}</p>
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
        <div className="flex flex-col lg:col-span-1 md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4 px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-green-500/20 border border-green-500/30">
            <CheckCircle2 className="text-green-400" size={18} />
            <h2 className="text-green-400 font-bold text-sm lg:text-lg">{t('ready')}</h2>
            <span className="ml-auto bg-green-500 text-white w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-sm">
              {readyOrders.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {readyOrders.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <CheckCircle2 size={40} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">{t('noReadyOrders')}</p>
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
