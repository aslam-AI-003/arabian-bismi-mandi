import { useState, useEffect, useRef } from 'react'
import { 
  Calendar, TrendingUp, Loader2, IndianRupee, ShoppingBag, 
  CreditCard, Wallet, BarChart3, Calculator, Printer, Download,
  CheckCircle2, XCircle, Clock, FileText
} from 'lucide-react'
import { getOrdersByDateRange, supabase } from '../lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import jsPDF from 'jspdf'

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sales') // 'sales' or 'dayend'
  const [dateRange, setDateRange] = useState('today')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([]) // Include cancelled for day end
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrder: 0,
    cashSales: 0,
    cardSales: 0,
    upiSales: 0,
    topItems: [],
    ordersByType: {},
    salesByHour: {},
    // Day End specific
    completedOrders: 0,
    cancelledOrders: 0,
    activeOrders: 0,
    grossSales: 0,
    netSales: 0,
    totalTax: 0,
    totalDiscount: 0,
    cashCount: 0,
    cardCount: 0,
    upiCount: 0,
  })
  const { t, language } = useLanguage()
  const reportRef = useRef(null)
  const [generating, setGenerating] = useState(false)

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

      const allOrdersData = data || []
      setAllOrders(allOrdersData)
      
      const completedOrders = allOrdersData.filter(o => o.order_status === 'COMPLETED')
      const cancelledOrders = allOrdersData.filter(o => o.order_status === 'CANCELLED')
      const activeOrders = allOrdersData.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.order_status))
      const nonCancelledOrders = allOrdersData.filter(o => o.order_status !== 'CANCELLED')
      
      setOrders(nonCancelledOrders)
      
      // Calculate stats
      const totalSales = nonCancelledOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const netSales = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const totalTax = completedOrders.reduce((sum, o) => sum + parseFloat(o.tax_amount || 0), 0)
      const totalDiscount = completedOrders.reduce((sum, o) => sum + parseFloat(o.discount_amount || 0), 0)
      
      // Payment breakdown
      const cashOrders = completedOrders.filter(o => o.payment_method === 'CASH')
      const cardOrders = completedOrders.filter(o => o.payment_method === 'CARD')
      const upiOrders = completedOrders.filter(o => o.payment_method === 'UPI')
      
      const cashSales = cashOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const cardSales = cardOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      const upiSales = upiOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
      
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
        totalOrders: allOrdersData.length,
        avgOrder: completedOrders.length > 0 ? netSales / completedOrders.length : 0,
        cashSales,
        cardSales,
        upiSales,
        topItems,
        ordersByType,
        salesByHour,
        // Day End specific
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        activeOrders: activeOrders.length,
        grossSales: totalSales,
        netSales,
        totalTax,
        totalDiscount,
        cashCount: cashOrders.length,
        cardCount: cardOrders.length,
        upiCount: upiOrders.length,
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error(t('failedToLoad'))
    }
    setLoading(false)
  }

  // Print Day End Report
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600')
    
    const content = `
      <html>
        <head>
          <title>Day End Settlement - ${format(new Date(startDate), 'dd MMM yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { text-align: center; color: #333; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
            .date { text-align: center; font-size: 14px; margin-bottom: 20px; }
            .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
            .section h2 { margin-top: 0; color: #444; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .stat-box { text-align: center; padding: 10px; background: #f5f5f5; border-radius: 5px; }
            .stat-box .value { font-size: 24px; font-weight: bold; color: #333; }
            .stat-box .label { font-size: 12px; color: #666; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .total-row { font-weight: bold; font-size: 18px; color: #C8A13D; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Arabian Bismi Mandi Restaurant</h1>
          <p class="subtitle">Day End Settlement Report</p>
          <p class="date">${format(new Date(startDate), 'EEEE, dd MMMM yyyy')}</p>
          
          <div class="section">
            <h2>Order Summary</h2>
            <div class="grid">
              <div class="stat-box">
                <div class="value">${stats.totalOrders}</div>
                <div class="label">Total Orders</div>
              </div>
              <div class="stat-box">
                <div class="value" style="color: #28a745;">${stats.completedOrders}</div>
                <div class="label">Completed</div>
              </div>
              <div class="stat-box">
                <div class="value" style="color: #dc3545;">${stats.cancelledOrders}</div>
                <div class="label">Cancelled</div>
              </div>
              <div class="stat-box">
                <div class="value" style="color: #ffc107;">${stats.activeOrders}</div>
                <div class="label">Active</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Sales Summary</h2>
            <div class="row"><span>Gross Sales</span><span>₹${stats.grossSales.toFixed(2)}</span></div>
            <div class="row" style="color: green;"><span>Discount</span><span>-₹${stats.totalDiscount.toFixed(2)}</span></div>
            <div class="row"><span>GST/Tax</span><span>₹${stats.totalTax.toFixed(2)}</span></div>
            <div class="row total-row"><span>Net Sales</span><span>₹${stats.netSales.toFixed(2)}</span></div>
          </div>

          <div class="section">
            <h2>Payment Breakdown</h2>
            <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
              <div class="stat-box">
                <div class="value" style="color: #28a745;">₹${stats.cashSales.toFixed(0)}</div>
                <div class="label">Cash (${stats.cashCount})</div>
              </div>
              <div class="stat-box">
                <div class="value" style="color: #007bff;">₹${stats.cardSales.toFixed(0)}</div>
                <div class="label">Card (${stats.cardCount})</div>
              </div>
              <div class="stat-box">
                <div class="value" style="color: #6f42c1;">₹${stats.upiSales.toFixed(0)}</div>
                <div class="label">UPI (${stats.upiCount})</div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Order Types</h2>
            <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
              <div class="stat-box">
                <div class="value">${stats.ordersByType.DINE_IN || 0}</div>
                <div class="label">Dine In</div>
              </div>
              <div class="stat-box">
                <div class="value">${stats.ordersByType.TAKEAWAY || 0}</div>
                <div class="label">Takeaway</div>
              </div>
              <div class="stat-box">
                <div class="value">${stats.ordersByType.DELIVERY || 0}</div>
                <div class="label">Delivery</div>
              </div>
            </div>
          </div>

          ${stats.topItems.length > 0 ? `
          <div class="section">
            <h2>Top Selling Items</h2>
            <table>
              <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
              <tbody>
                ${stats.topItems.map((item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>₹${item.revenue.toFixed(0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="footer">
            <p>Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            <p>Arabian Bismi POS System</p>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Download PDF - Fixed version
  const handleDownloadPDF = async () => {
    setGenerating(true)
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pageWidth = 210
      const margin = 15
      let y = 15
      
      // Header
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Arabian Bismi Mandi Restaurant', pageWidth / 2, y, { align: 'center' })
      y += 7
      
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Day End Settlement Report', pageWidth / 2, y, { align: 'center' })
      y += 6
      
      pdf.setFontSize(10)
      pdf.text(format(new Date(startDate), 'EEEE, dd MMMM yyyy'), pageWidth / 2, y, { align: 'center' })
      y += 10
      
      // Divider
      pdf.setDrawColor(200, 161, 61)
      pdf.line(margin, y, pageWidth - margin, y)
      y += 8
      
      // Order Summary
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Order Summary', margin, y)
      y += 8
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const summaryData = [
        ['Total Orders', stats.totalOrders.toString()],
        ['Completed', stats.completedOrders.toString()],
        ['Cancelled', stats.cancelledOrders.toString()],
        ['Active', stats.activeOrders.toString()],
      ]
      summaryData.forEach(([label, value]) => {
        pdf.text(label, margin, y)
        pdf.text(value, pageWidth - margin, y, { align: 'right' })
        y += 5
      })
      y += 5
      
      // Sales Summary
      pdf.setFont('helvetica', 'bold')
      pdf.text('Sales Summary', margin, y)
      y += 8
      
      pdf.setFont('helvetica', 'normal')
      const salesData = [
        ['Gross Sales', `Rs. ${stats.grossSales.toFixed(2)}`],
        ['Discount', `-Rs. ${stats.totalDiscount.toFixed(2)}`],
        ['GST/Tax', `Rs. ${stats.totalTax.toFixed(2)}`],
      ]
      salesData.forEach(([label, value]) => {
        pdf.text(label, margin, y)
        pdf.text(value, pageWidth - margin, y, { align: 'right' })
        y += 5
      })
      
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      y += 2
      pdf.text('Net Sales', margin, y)
      pdf.text(`Rs. ${stats.netSales.toFixed(2)}`, pageWidth - margin, y, { align: 'right' })
      y += 10
      
      // Payment Breakdown
      pdf.setFontSize(12)
      pdf.text('Payment Breakdown', margin, y)
      y += 8
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      const paymentData = [
        ['Cash', `Rs. ${stats.cashSales.toFixed(0)}`, `(${stats.cashCount} orders)`],
        ['Card', `Rs. ${stats.cardSales.toFixed(0)}`, `(${stats.cardCount} orders)`],
        ['UPI', `Rs. ${stats.upiSales.toFixed(0)}`, `(${stats.upiCount} orders)`],
      ]
      paymentData.forEach(([label, value, count]) => {
        pdf.text(label, margin, y)
        pdf.text(value, 80, y)
        pdf.text(count, pageWidth - margin, y, { align: 'right' })
        y += 5
      })
      y += 5
      
      // Order Types
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.text('Order Types', margin, y)
      y += 8
      
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      const typeData = [
        ['Dine In', (stats.ordersByType.DINE_IN || 0).toString()],
        ['Takeaway', (stats.ordersByType.TAKEAWAY || 0).toString()],
        ['Delivery', (stats.ordersByType.DELIVERY || 0).toString()],
      ]
      typeData.forEach(([label, value]) => {
        pdf.text(label, margin, y)
        pdf.text(value, pageWidth - margin, y, { align: 'right' })
        y += 5
      })
      y += 5
      
      // Top Items
      if (stats.topItems.length > 0) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(12)
        pdf.text('Top Selling Items', margin, y)
        y += 8
        
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        stats.topItems.slice(0, 8).forEach((item, idx) => {
          pdf.text(`${idx + 1}. ${item.name}`, margin, y)
          pdf.text(`${item.qty} sold`, 120, y)
          pdf.text(`Rs. ${item.revenue.toFixed(0)}`, pageWidth - margin, y, { align: 'right' })
          y += 5
        })
      }
      
      // Footer
      y = 280
      pdf.setFontSize(8)
      pdf.setTextColor(128)
      pdf.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, y, { align: 'center' })
      y += 4
      pdf.text('Arabian Bismi POS System', pageWidth / 2, y, { align: 'center' })
      
      pdf.save(`DayEnd-Report-${startDate}.pdf`)
      toast.success('PDF downloaded!')
    } catch (error) {
      console.error('PDF Error:', error)
      toast.error('Failed to generate PDF')
    }
    setGenerating(false)
  }

  // Tab labels
  const tabLabels = {
    sales: language === 'ta' ? 'விற்பனை அறிக்கை' : 'Sales Report',
    dayend: language === 'ta' ? 'நாள் முடிவு கணக்கு' : 'Day End Settlement',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-cream">{t('salesReports')}</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-brand-gold/20 pb-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${
              activeTab === 'sales'
                ? 'bg-brand-gold text-dark-primary font-semibold'
                : 'bg-dark-secondary/50 text-cream hover:bg-dark-secondary'
            }`}
          >
            <BarChart3 size={18} />
            {tabLabels.sales}
          </button>
          <button
            onClick={() => setActiveTab('dayend')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all ${
              activeTab === 'dayend'
                ? 'bg-brand-gold text-dark-primary font-semibold'
                : 'bg-dark-secondary/50 text-cream hover:bg-dark-secondary'
            }`}
          >
            <Calculator size={18} />
            {tabLabels.dayend}
          </button>
        </div>
        
        {/* Date Range Filters */}
        <div className="flex flex-wrap gap-2">
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
        
        {/* Print/PDF buttons for Day End tab */}
        {activeTab === 'dayend' && (
          <div className="ml-auto flex gap-2">
            <button onClick={handlePrint} className="btn-outline flex items-center gap-2">
              <Printer size={18} />
              {language === 'ta' ? 'அச்சிடு' : 'Print'}
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={18} />
              {generating ? 'Wait...' : 'PDF'}
            </button>
          </div>
        )}
      </div>

      {/* SALES TAB CONTENT */}
      {activeTab === 'sales' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stats-card">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="text-brand-gold" size={20} />
                <span className="text-muted">{t('todaysSales')}</span>
              </div>
              <p className="text-3xl font-bold text-brand-gold">₹{stats.netSales.toLocaleString('en-IN')}</p>
            </div>
            <div className="stats-card">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="text-brand-gold" size={20} />
                <span className="text-muted">{t('totalOrders')}</span>
              </div>
              <p className="text-3xl font-bold text-cream">{stats.completedOrders}</p>
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
                        style={{ width: `${stats.netSales > 0 ? (item.value / stats.netSales) * 100 : 0}%` }}
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
        </>
      )}

      {/* DAY END TAB CONTENT */}
      {activeTab === 'dayend' && (
        <div ref={reportRef} className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card bg-dark-primary/50 p-4 text-center">
              <ShoppingBag className="mx-auto mb-2 text-brand-gold" size={24} />
              <p className="text-3xl font-bold text-cream">{stats.totalOrders}</p>
              <p className="text-muted text-sm">{t('totalOrders')}</p>
            </div>
            <div className="card bg-dark-primary/50 p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-green-400" size={24} />
              <p className="text-3xl font-bold text-green-400">{stats.completedOrders}</p>
              <p className="text-muted text-sm">{t('completed')}</p>
            </div>
            <div className="card bg-dark-primary/50 p-4 text-center">
              <XCircle className="mx-auto mb-2 text-red-400" size={24} />
              <p className="text-3xl font-bold text-red-400">{stats.cancelledOrders}</p>
              <p className="text-muted text-sm">{t('cancelled')}</p>
            </div>
            <div className="card bg-dark-primary/50 p-4 text-center">
              <Clock className="mx-auto mb-2 text-yellow-400" size={24} />
              <p className="text-3xl font-bold text-yellow-400">{stats.activeOrders}</p>
              <p className="text-muted text-sm">{language === 'ta' ? 'நடப்பில்' : 'Active'}</p>
            </div>
          </div>

          {/* Sales Summary */}
          <div className="card">
            <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
              <IndianRupee className="text-brand-gold" size={20} />
              {language === 'ta' ? 'விற்பனை சுருக்கம்' : 'Sales Summary'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-cream">
                <span>{language === 'ta' ? 'மொத்த விற்பனை' : 'Gross Sales'}</span>
                <span className="font-mono">₹{stats.grossSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>{t('discount')}</span>
                <span className="font-mono">-₹{stats.totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>{t('gst')} (Tax)</span>
                <span className="font-mono">₹{stats.totalTax.toFixed(2)}</span>
              </div>
              <div className="border-t border-brand-gold/20 pt-3 flex justify-between text-brand-gold">
                <span className="font-bold text-lg">{language === 'ta' ? 'நிகர விற்பனை' : 'Net Sales'}</span>
                <span className="font-mono font-bold text-xl">₹{stats.netSales.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="card">
            <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
              <CreditCard className="text-brand-gold" size={20} />
              {t('paymentMethods')}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <IndianRupee className="mx-auto mb-2 text-green-400" size={20} />
                <p className="text-2xl font-bold text-green-400">₹{stats.cashSales.toFixed(0)}</p>
                <p className="text-muted text-sm">{language === 'ta' ? 'பணம்' : 'Cash'} ({stats.cashCount})</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <CreditCard className="mx-auto mb-2 text-blue-400" size={20} />
                <p className="text-2xl font-bold text-blue-400">₹{stats.cardSales.toFixed(0)}</p>
                <p className="text-muted text-sm">{language === 'ta' ? 'கார்டு' : 'Card'} ({stats.cardCount})</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <Wallet className="mx-auto mb-2 text-purple-400" size={20} />
                <p className="text-2xl font-bold text-purple-400">₹{stats.upiSales.toFixed(0)}</p>
                <p className="text-muted text-sm">UPI ({stats.upiCount})</p>
              </div>
            </div>
          </div>

          {/* Order Types */}
          <div className="card">
            <h3 className="text-lg font-semibold text-cream mb-4">{t('orderTypes')}</h3>
            <div className="flex justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{stats.ordersByType.DINE_IN || 0}</p>
                <p className="text-muted text-sm">{t('dineIn')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.ordersByType.TAKEAWAY || 0}</p>
                <p className="text-muted text-sm">{t('takeaway')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">{stats.ordersByType.DELIVERY || 0}</p>
                <p className="text-muted text-sm">{t('delivery')}</p>
              </div>
            </div>
          </div>

          {/* Top Items for Day End */}
          {stats.topItems.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                <FileText className="text-brand-gold" size={20} />
                {t('topSellingItems')}
              </h3>
              <table className="w-full">
                <thead>
                  <tr className="text-muted text-sm border-b border-brand-gold/20">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">{language === 'ta' ? 'பொருள்' : 'Item'}</th>
                    <th className="text-center py-2">{t('qtySold')}</th>
                    <th className="text-right py-2">{t('revenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topItems.map((item, idx) => (
                    <tr key={idx} className="text-cream border-b border-brand-gold/10">
                      <td className="py-2 text-muted">{idx + 1}</td>
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-center font-mono">{item.qty}</td>
                      <td className="py-2 text-right font-mono text-brand-gold">₹{item.revenue.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
