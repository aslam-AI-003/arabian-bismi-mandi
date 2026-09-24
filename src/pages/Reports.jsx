import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Download, Loader2, IndianRupee, ShoppingBag, CreditCard, Wallet } from 'lucide-react'
import { getOrdersByDateRange } from '../lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrder: 0,
    cashSales: 0,
    cardSales: 0,
    upiSales: 0,
    topItems: [],
    ordersByType: {},
    salesByHour: {}
  })
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchReports()
  }, [startDate, endDate])

  const dateRangeLabels = {
    today: language === 'ta' ? 'இன்று' : 'Today',
    yesterday: language === 'ta' ? 'நேற்று' : 'Yesterday',
    week: language === 'ta' ? 'வாரம்' : 'Week',
    month: language === 'ta' ? 'மாதம்' : 'Month',
  }

  const handleDateRangeChange = (range) => {
    setDateRange(range)
    const today = new Date()
    
    switch(range) {
      case 'today':
        setStartDate(format(today, 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'yesterday':
        const yesterday = subDays(today, 1)
        setStartDate(format(yesterday, 'yyyy-MM-dd'))
        setEndDate(format(yesterday, 'yyyy-MM-dd'))
        break
      case 'week':
        setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      case 'month':
        setStartDate(format(subDays(today, 30), 'yyyy-MM-dd'))
        setEndDate(format(today, 'yyyy-MM-dd'))
        break
      default:
        break
    }
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      const start = startOfDay(new Date(startDate)).toISOString()
      const end = endOfDay(new Date(endDate)).toISOString()
      
      const { data, error } = await getOrdersByDateRange(start, end)
      
      if (error) {
        toast.error(t('failedToLoad'))
        return
      }

      const completedOrders = (data || []).filter(o => o.order_status !== 'CANCELLED')
      setOrders(completedOrders)
      
      // Calculate stats
      const totalSales = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const cashSales = completedOrders.filter(o => o.payment_method === 'CASH').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const cardSales = completedOrders.filter(o => o.payment_method === 'CARD').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const upiSales = completedOrders.filter(o => o.payment_method === 'UPI').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      
      // Top items
      const itemCounts = {}
      completedOrders.forEach(order => {
        order.order_items?.forEach(item => {
          const key = item.item_name
          if (!itemCounts[key]) itemCounts[key] = { name: key, qty: 0, revenue: 0 }
          itemCounts[key].qty += item.quantity
          itemCounts[key].revenue += parseFloat(item.total_price)
        })
      })
      const topItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10)

      // Orders by type
      const ordersByType = {
        DINE_IN: completedOrders.filter(o => o.order_type === 'DINE_IN').length,
        TAKEAWAY: completedOrders.filter(o => o.order_type === 'TAKEAWAY').length,
        DELIVERY: completedOrders.filter(o => o.order_type === 'DELIVERY').length,
      }

      // Sales by hour
      const salesByHour = {}
      completedOrders.forEach(order => {
        const hour = new Date(order.created_at).getHours()
        if (!salesByHour[hour]) salesByHour[hour] = 0
        salesByHour[hour] += parseFloat(order.total_amount || 0)
      })

      setStats({
        totalSales,
        totalOrders: completedOrders.length,
        avgOrder: completedOrders.length > 0 ? totalSales / completedOrders.length : 0,
        cashSales,
        cardSales,
        upiSales,
        topItems,
        ordersByType,
        salesByHour
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('failedToLoad'))
    }
    setLoading(false)
  }

  // Simple bar chart component
  const BarChart = ({ data, maxValue }) => (
    <div className="flex items-end gap-1 h-32">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex-1 flex flex-col items-center">
          <div 
            className="w-full bg-brand-gold/80 rounded-t"
            style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '4px' : '0' }}
          />
          <span className="text-xs text-muted mt-1">{key}:00</span>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-semibold text-cream">{t('salesReports')}</h1>
        
        <div className="flex gap-2 flex-wrap">
          {['today', 'yesterday', 'week', 'month'].map(range => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className={`px-4 py-2 rounded-full text-sm capitalize transition-all ${
                dateRange === range
                  ? 'bg-brand-gold text-dark-primary font-semibold'
                  : 'bg-dark-secondary text-cream hover:bg-dark-tertiary'
              }`}
            >
              {dateRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range */}
      <div className="card flex flex-wrap gap-4 items-center">
        <Calendar className="text-brand-gold" size={20} />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDateRange('custom') }}
            className="input max-w-[150px]"
          />
          <span className="text-muted">{language === 'ta' ? 'முதல்' : 'to'}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDateRange('custom') }}
            className="input max-w-[150px]"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stats-card">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="text-brand-gold" size={20} />
            <span className="text-muted">{t('todaysSales')}</span>
          </div>
          <p className="text-3xl font-bold text-brand-gold">₹{stats.totalSales.toLocaleString('en-IN')}</p>
        </div>
        <div className="stats-card">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="text-brand-gold" size={20} />
            <span className="text-muted">{t('totalOrders')}</span>
          </div>
          <p className="text-3xl font-bold text-cream">{stats.totalOrders}</p>
        </div>
        <div className="stats-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-brand-gold" size={20} />
            <span className="text-muted">{t('avgOrder')}</span>
          </div>
          <p className="text-3xl font-bold text-cream">₹{stats.avgOrder.toFixed(0)}</p>
        </div>
        <div className="stats-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="text-brand-gold" size={20} />
            <span className="text-muted">{t('cashSales')}</span>
          </div>
          <p className="text-3xl font-bold text-green-400">₹{stats.cashSales.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="card">
          <h3 className="text-lg font-semibold text-cream mb-4">💳 {t('paymentMethods')}</h3>
          <div className="space-y-4">
            {[
              { label: language === 'ta' ? 'பணம்' : 'Cash', value: stats.cashSales, color: 'bg-green-500' },
              { label: language === 'ta' ? 'கார்டு' : 'Card', value: stats.cardSales, color: 'bg-blue-500' },
              { label: 'UPI', value: stats.upiSales, color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-cream">{item.label}</span>
                  <span className="text-brand-gold font-mono">₹{item.value.toLocaleString('en-IN')}</span>
                </div>
                <div className="h-3 bg-dark-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${stats.totalSales > 0 ? (item.value / stats.totalSales) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Types */}
        <div className="card">
          <h3 className="text-lg font-semibold text-cream mb-4">📦 {t('orderTypes')}</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: t('dineIn'), value: stats.ordersByType.DINE_IN || 0, icon: '🍽️' },
              { label: t('takeaway'), value: stats.ordersByType.TAKEAWAY || 0, icon: '📦' },
              { label: t('delivery'), value: stats.ordersByType.DELIVERY || 0, icon: '🛵' },
            ].map(item => (
              <div key={item.label} className="text-center p-4 rounded-lg bg-dark-primary/50 border border-brand-gold/10">
                <span className="text-3xl">{item.icon}</span>
                <p className="text-2xl font-bold text-cream mt-2">{item.value}</p>
                <p className="text-muted text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="card">
        <h3 className="text-lg font-semibold text-cream mb-4">🔥 {t('topSellingItems')}</h3>
        {stats.topItems.length === 0 ? (
          <p className="text-muted text-center py-8">{t('noSalesData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-muted text-sm border-b border-brand-gold/20">
                  <th className="pb-3">#</th>
                  <th className="pb-3">{language === 'ta' ? 'பொருள்' : 'Item'}</th>
                  <th className="pb-3 text-right">{t('qtySold')}</th>
                  <th className="pb-3 text-right">{t('revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.topItems.map((item, idx) => (
                  <tr key={item.name} className="border-b border-brand-gold/10 last:border-0">
                    <td className="py-3">
                      <span className="w-6 h-6 rounded-full bg-brand-gold/20 text-brand-gold text-sm flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 text-cream">{item.name}</td>
                    <td className="py-3 text-right text-muted">{item.qty}</td>
                    <td className="py-3 text-right font-mono text-brand-gold">₹{item.revenue.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
