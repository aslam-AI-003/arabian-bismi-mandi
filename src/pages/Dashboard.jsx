import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingBag, Clock, IndianRupee, Loader2 } from 'lucide-react'
import { getTodayOrders, supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { useLanguage } from '../context/LanguageContext'

const statusColors = {
  PENDING: 'badge-pending',
  PREPARING: 'badge-preparing',
  READY: 'badge-ready',
  COMPLETED: 'badge-completed',
}

const typeIcons = {
  DINE_IN: '🍽️',
  TAKEAWAY: '📦',
  DELIVERY: '🛵',
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [todaySales, setTodaySales] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [pendingOrders, setPendingOrders] = useState(0)
  const [avgOrder, setAvgOrder] = useState(0)
  const [recentOrders, setRecentOrders] = useState([])
  const [topItems, setTopItems] = useState([])
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch today's orders
      const { data: orders, error } = await getTodayOrders()
      
      if (!error && orders) {
        // Calculate stats
        const completedOrders = orders.filter(o => o.order_status !== 'CANCELLED')
        const sales = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
        const pending = orders.filter(o => o.order_status === 'PENDING' || o.order_status === 'PREPARING').length
        const avg = completedOrders.length > 0 ? sales / completedOrders.length : 0

        setTodaySales(sales)
        setTotalOrders(completedOrders.length)
        setPendingOrders(pending)
        setAvgOrder(avg)
        setRecentOrders(orders.slice(0, 5))

        // Calculate top items from order_items
        const itemCounts = {}
        orders.forEach(order => {
          order.order_items?.forEach(item => {
            const key = item.item_name
            itemCounts[key] = (itemCounts[key] || 0) + item.quantity
          })
        })

        const sortedItems = Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }))

        setTopItems(sortedItems)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
    setLoading(false)
  }

  const statusTranslations = {
    PENDING: language === 'ta' ? 'நிலுவையில்' : 'Pending',
    PREPARING: language === 'ta' ? 'தயாரிக்கிறது' : 'Preparing',
    READY: language === 'ta' ? 'தயார்' : 'Ready',
    COMPLETED: language === 'ta' ? 'முடிந்தது' : 'Completed',
  }

  const typeTranslations = {
    DINE_IN: language === 'ta' ? 'இங்கே சாப்பிட' : 'Dine In',
    TAKEAWAY: language === 'ta' ? 'பார்சல்' : 'Takeaway',
    DELIVERY: language === 'ta' ? 'டெலிவரி' : 'Delivery',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-gold mx-auto mb-4" />
          <p className="text-muted">{t('loading')}</p>
        </div>
      </div>
    )
  }

  const statsData = [
    { label: t('todaysSales'), value: `₹${todaySales.toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-green-400" },
    { label: t('totalOrders'), value: totalOrders.toString(), icon: ShoppingBag, color: "text-green-400" },
    { label: t('activeOrders'), value: pendingOrders.toString(), icon: Clock, color: "text-yellow-400" },
    { label: t('avgOrder'), value: `₹${avgOrder.toFixed(0)}`, icon: TrendingUp, color: "text-green-400" },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <div key={stat.label} className="stats-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-cream mt-1">{stat.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <stat.icon className="text-brand-gold" size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-cream mb-4">{t('recentOrders')}</h3>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p>{t('noOrdersYet')}</p>
              <p className="text-sm">{t('ordersAppearHere')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-primary/50 border border-brand-gold/10"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeIcons[order.order_type]}</span>
                    <div>
                      <p className="text-cream font-medium">{order.order_number}</p>
                      <p className="text-muted text-sm">
                        {order.order_type === 'DINE_IN' 
                          ? `${t('table')} ${order.table_number}` 
                          : typeTranslations[order.order_type]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-brand-gold font-mono font-semibold">₹{parseFloat(order.total_amount).toFixed(0)}</p>
                    <span className={`badge ${statusColors[order.order_status]}`}>
                      {statusTranslations[order.order_status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling */}
        <div className="card">
          <h3 className="text-lg font-semibold text-cream mb-4">🔥 {t('topSelling')}</h3>
          {topItems.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p>{t('noData')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div 
                  key={item.name}
                  className="flex items-center justify-between p-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-gold/20 text-brand-gold text-sm flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="text-cream">{item.name}</span>
                  </div>
                  <span className="text-muted font-mono">{item.qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
