import { useState, useEffect, useRef } from 'react'
import { 
  Calculator, Printer, Download, CheckCircle2, 
  Clock, XCircle, IndianRupee, CreditCard, Wallet,
  ShoppingBag, Loader2, Calendar, FileText, AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export default function DayEndSettlement() {
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [settlementData, setSettlementData] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [cashCount, setCashCount] = useState('')
  const [notes, setNotes] = useState('')
  const reportRef = useRef(null)
  const { language, t } = useLanguage()

  useEffect(() => {
    fetchDayData()
  }, [selectedDate])

  const fetchDayData = async () => {
    setLoading(true)
    try {
      const startDate = startOfDay(new Date(selectedDate)).toISOString()
      const endDate = endOfDay(new Date(selectedDate)).toISOString()

      // Fetch all orders for the selected date
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate statistics
      const completedOrders = orders.filter(o => o.order_status === 'COMPLETED')
      const cancelledOrders = orders.filter(o => o.order_status === 'CANCELLED')
      const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.order_status))

      // Payment breakdown
      const cashOrders = completedOrders.filter(o => o.payment_method === 'CASH')
      const cardOrders = completedOrders.filter(o => o.payment_method === 'CARD')
      const upiOrders = completedOrders.filter(o => o.payment_method === 'UPI')

      const cashTotal = cashOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
      const cardTotal = cardOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
      const upiTotal = upiOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)

      // Order type breakdown
      const dineInOrders = completedOrders.filter(o => o.order_type === 'DINE_IN')
      const takeawayOrders = completedOrders.filter(o => o.order_type === 'TAKEAWAY')
      const deliveryOrders = completedOrders.filter(o => o.order_type === 'DELIVERY')

      // Calculate totals
      const grossSales = orders.reduce((sum, o) => {
        if (o.order_status !== 'CANCELLED') {
          return sum + parseFloat(o.total_amount || 0)
        }
        return sum
      }, 0)

      const totalTax = completedOrders.reduce((sum, o) => sum + parseFloat(o.tax_amount || 0), 0)
      const totalDiscount = completedOrders.reduce((sum, o) => sum + parseFloat(o.discount_amount || 0), 0)
      const netSales = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)

      // Top selling items
      const itemsMap = new Map()
      completedOrders.forEach(order => {
        order.order_items?.forEach(item => {
          const key = item.item_name
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key)
            existing.quantity += item.quantity
            existing.total += parseFloat(item.total_price || 0)
          } else {
            itemsMap.set(key, {
              name: item.item_name,
              quantity: item.quantity,
              total: parseFloat(item.total_price || 0)
            })
          }
        })
      })
      const topItems = Array.from(itemsMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      setSettlementData({
        date: selectedDate,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        activeOrders: activeOrders.length,
        grossSales,
        netSales,
        totalTax,
        totalDiscount,
        cashTotal,
        cashCount: cashOrders.length,
        cardTotal,
        cardCount: cardOrders.length,
        upiTotal,
        upiCount: upiOrders.length,
        dineInCount: dineInOrders.length,
        takeawayCount: takeawayOrders.length,
        deliveryCount: deliveryOrders.length,
        topItems,
        orders: completedOrders,
      })
    } catch (error) {
      console.error('Error fetching day data:', error)
      toast.error('Failed to load settlement data')
    }
    setLoading(false)
  }

  const handlePrint = () => {
    const printContent = reportRef.current
    const printWindow = window.open('', '', 'width=800,height=600')
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Day End Settlement - ${format(new Date(selectedDate), 'dd MMM yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            h2 { color: #666; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; }
            .total-row { font-weight: bold; font-size: 18px; }
            .section { margin-bottom: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleDownloadPDF = async () => {
    setGenerating(true)
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const imgWidth = 190
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, 270))
      pdf.save(`DayEnd-Settlement-${selectedDate}.pdf`)
      
      toast.success('PDF downloaded!')
    } catch (error) {
      toast.error('Failed to generate PDF')
      console.error(error)
    }
    setGenerating(false)
  }

  // Translations
  const labels = {
    title: language === 'ta' ? 'நாள் முடிவு கணக்கு' : 'Day End Settlement',
    selectDate: language === 'ta' ? 'தேதி தேர்வு' : 'Select Date',
    orderSummary: language === 'ta' ? 'ஆர்டர் சுருக்கம்' : 'Order Summary',
    totalOrders: language === 'ta' ? 'மொத்த ஆர்டர்கள்' : 'Total Orders',
    completed: language === 'ta' ? 'முடிந்தது' : 'Completed',
    cancelled: language === 'ta' ? 'ரத்து' : 'Cancelled',
    active: language === 'ta' ? 'நடப்பில்' : 'Active',
    salesSummary: language === 'ta' ? 'விற்பனை சுருக்கம்' : 'Sales Summary',
    grossSales: language === 'ta' ? 'மொத்த விற்பனை' : 'Gross Sales',
    discount: language === 'ta' ? 'தள்ளுபடி' : 'Discount',
    tax: language === 'ta' ? 'வரி' : 'Tax/GST',
    netSales: language === 'ta' ? 'நிகர விற்பனை' : 'Net Sales',
    paymentBreakdown: language === 'ta' ? 'கட்டண முறை' : 'Payment Breakdown',
    cash: language === 'ta' ? 'பணம்' : 'Cash',
    card: language === 'ta' ? 'கார்டு' : 'Card',
    upi: language === 'ta' ? 'UPI' : 'UPI',
    orderTypes: language === 'ta' ? 'ஆர்டர் வகைகள்' : 'Order Types',
    dineIn: language === 'ta' ? 'இங்கே சாப்பிட' : 'Dine In',
    takeaway: language === 'ta' ? 'பார்சல்' : 'Takeaway',
    delivery: language === 'ta' ? 'டெலிவரி' : 'Delivery',
    topItems: language === 'ta' ? 'டாப் விற்பனை பொருட்கள்' : 'Top Selling Items',
    print: language === 'ta' ? 'அச்சிடு' : 'Print',
    downloadPDF: language === 'ta' ? 'PDF பதிவிறக்கம்' : 'Download PDF',
    noData: language === 'ta' ? 'இந்த தேதியில் ஆர்டர் இல்லை' : 'No orders on this date',
    item: language === 'ta' ? 'பொருள்' : 'Item',
    qty: language === 'ta' ? 'எண்ணிக்கை' : 'Qty',
    amount: language === 'ta' ? 'தொகை' : 'Amount',
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-cream flex items-center gap-2">
          <Calculator className="text-brand-gold" />
          {labels.title}
        </h1>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-muted" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-dark-secondary border border-brand-gold/30 rounded-lg px-3 py-2 text-cream"
            />
          </div>
        </div>
      </div>

      {!settlementData || settlementData.totalOrders === 0 ? (
        <div className="card p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-muted" />
          <p className="text-cream text-lg">{labels.noData}</p>
        </div>
      ) : (
        <>
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="btn-outline flex items-center gap-2"
            >
              <Printer size={18} />
              {labels.print}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={18} />
              {generating ? 'Wait...' : labels.downloadPDF}
            </button>
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="space-y-6 bg-dark-secondary p-6 rounded-xl">
            {/* Report Header */}
            <div className="text-center border-b border-brand-gold/20 pb-4">
              <h2 className="text-xl font-bold text-brand-gold">Arabian Bismi Mandi Restaurant</h2>
              <p className="text-muted text-sm">Day End Settlement Report</p>
              <p className="text-cream font-mono mt-2">
                {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}
              </p>
            </div>

            {/* Order Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-dark-primary/50 p-4 text-center">
                <ShoppingBag className="mx-auto mb-2 text-brand-gold" size={24} />
                <p className="text-3xl font-bold text-cream">{settlementData.totalOrders}</p>
                <p className="text-muted text-sm">{labels.totalOrders}</p>
              </div>
              <div className="card bg-dark-primary/50 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-green-400" size={24} />
                <p className="text-3xl font-bold text-green-400">{settlementData.completedOrders}</p>
                <p className="text-muted text-sm">{labels.completed}</p>
              </div>
              <div className="card bg-dark-primary/50 p-4 text-center">
                <XCircle className="mx-auto mb-2 text-red-400" size={24} />
                <p className="text-3xl font-bold text-red-400">{settlementData.cancelledOrders}</p>
                <p className="text-muted text-sm">{labels.cancelled}</p>
              </div>
              <div className="card bg-dark-primary/50 p-4 text-center">
                <Clock className="mx-auto mb-2 text-yellow-400" size={24} />
                <p className="text-3xl font-bold text-yellow-400">{settlementData.activeOrders}</p>
                <p className="text-muted text-sm">{labels.active}</p>
              </div>
            </div>

            {/* Sales Summary */}
            <div className="card bg-dark-primary/50">
              <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                <IndianRupee className="text-brand-gold" size={20} />
                {labels.salesSummary}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-cream">
                  <span>{labels.grossSales}</span>
                  <span className="font-mono">₹{settlementData.grossSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-400">
                  <span>{labels.discount}</span>
                  <span className="font-mono">-₹{settlementData.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>{labels.tax} (GST)</span>
                  <span className="font-mono">₹{settlementData.totalTax.toFixed(2)}</span>
                </div>
                <div className="border-t border-brand-gold/20 pt-3 flex justify-between text-brand-gold">
                  <span className="font-bold text-lg">{labels.netSales}</span>
                  <span className="font-mono font-bold text-xl">₹{settlementData.netSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="card bg-dark-primary/50">
              <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                <CreditCard className="text-brand-gold" size={20} />
                {labels.paymentBreakdown}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <IndianRupee className="mx-auto mb-2 text-green-400" size={20} />
                  <p className="text-2xl font-bold text-green-400">₹{settlementData.cashTotal.toFixed(0)}</p>
                  <p className="text-muted text-sm">{labels.cash} ({settlementData.cashCount})</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <CreditCard className="mx-auto mb-2 text-blue-400" size={20} />
                  <p className="text-2xl font-bold text-blue-400">₹{settlementData.cardTotal.toFixed(0)}</p>
                  <p className="text-muted text-sm">{labels.card} ({settlementData.cardCount})</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <Wallet className="mx-auto mb-2 text-purple-400" size={20} />
                  <p className="text-2xl font-bold text-purple-400">₹{settlementData.upiTotal.toFixed(0)}</p>
                  <p className="text-muted text-sm">{labels.upi} ({settlementData.upiCount})</p>
                </div>
              </div>
            </div>

            {/* Order Types */}
            <div className="card bg-dark-primary/50">
              <h3 className="text-lg font-semibold text-cream mb-4">{labels.orderTypes}</h3>
              <div className="flex justify-around">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{settlementData.dineInCount}</p>
                  <p className="text-muted text-sm">{labels.dineIn}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-400">{settlementData.takeawayCount}</p>
                  <p className="text-muted text-sm">{labels.takeaway}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">{settlementData.deliveryCount}</p>
                  <p className="text-muted text-sm">{labels.delivery}</p>
                </div>
              </div>
            </div>

            {/* Top Selling Items */}
            {settlementData.topItems.length > 0 && (
              <div className="card bg-dark-primary/50">
                <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
                  <FileText className="text-brand-gold" size={20} />
                  {labels.topItems}
                </h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-muted text-sm border-b border-brand-gold/20">
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">{labels.item}</th>
                      <th className="text-center py-2">{labels.qty}</th>
                      <th className="text-right py-2">{labels.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementData.topItems.map((item, idx) => (
                      <tr key={idx} className="text-cream border-b border-brand-gold/10">
                        <td className="py-2 text-muted">{idx + 1}</td>
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 text-right font-mono text-brand-gold">₹{item.total.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-muted text-sm pt-4 border-t border-brand-gold/20">
              <p>Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
              <p className="mt-1">Arabian Bismi POS System</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
