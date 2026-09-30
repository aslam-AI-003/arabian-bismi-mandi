import { useRef, useState, useEffect } from 'react'
import { X, Printer, Download, MessageCircle, Share2, Usb, Wifi, WifiOff } from 'lucide-react'
import { format } from 'date-fns'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'
import bismiLogo from '../assets/Bismi_Logo.jpg'
import { 
  printReceipt, 
  printReceiptSilent, 
  printReceiptSerial, 
  isPrinterConnected, 
  loadPrinterConfig 
} from '../lib/thermalPrinter'

export default function ReceiptModal({ order, onClose, settings = {} }) {
  const receiptRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [printerConnected, setPrinterConnected] = useState(false)
  const [printerMode, setPrinterMode] = useState('silent')

  const restaurantName = settings.restaurant_name || 'Arabian Bismi Mandi Restaurant'
  const restaurantAddress = settings.restaurant_address || 'Near Kovilady Bus Stand, Main Road, Chakkarapalli'
  const restaurantPhone = settings.restaurant_phone || '9894092449 | 9025499668'
  const gstNumber = settings.gst_number || ''

  useEffect(() => {
    const config = loadPrinterConfig()
    setPrinterMode(config.mode)
    setPrinterConnected(isPrinterConnected())
  }, [])

  if (!order) return null

  // Thermal Print (Auto-selects best method)
  const handleThermalPrint = async () => {
    try {
      const result = await printReceipt(order, settings)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error.message || 'Print failed')
    }
  }

  // Silent Print (Browser default printer)
  const handleSilentPrint = () => {
    const result = printReceiptSilent(order, settings)
    if (result.success) {
      toast.success(result.message)
    } else {
      toast.error(result.message)
    }
  }

  // Direct ESC/POS Print (USB connected)
  const handleDirectPrint = async () => {
    if (!isPrinterConnected()) {
      toast.error('USB Printer not connected. Go to Settings → Printer to connect.')
      return
    }
    try {
      const result = await printReceiptSerial(order, settings)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(error.message || 'Direct print failed')
    }
  }

  // Download as PDF
  const handleDownloadPDF = async () => {
    setGenerating(true)
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
      })
      
      const imgData = canvas.toDataURL('image/png')
      
      const canvasWidth = canvas.width
      const canvasHeight = canvas.height
      
      const pdfWidth = 80
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth + 10
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, Math.min(pdfHeight, 300)]
      })
      
      const imgWidth = 70
      const imgHeight = (canvasHeight * imgWidth) / canvasWidth
      
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, Math.min(imgHeight, 290))
      pdf.save(`Receipt-${order.order_number}.pdf`)
      
      toast.success('PDF downloaded!')
    } catch (error) {
      console.error('PDF Error:', error)
      try {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, 150]
        })
        
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text(restaurantName, 40, 10, { align: 'center' })
        
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text(restaurantAddress, 40, 16, { align: 'center' })
        pdf.text(`Ph: ${restaurantPhone}`, 40, 20, { align: 'center' })
        
        pdf.line(5, 24, 75, 24)
        
        pdf.setFontSize(9)
        pdf.text(`Order: ${order.order_number}`, 5, 30)
        pdf.text(format(new Date(order.created_at), 'dd/MM/yy HH:mm'), 75, 30, { align: 'right' })
        
        pdf.line(5, 34, 75, 34)
        
        let yPos = 40
        order.order_items?.forEach((item) => {
          pdf.text(`${item.quantity}x ${item.item_name}`, 5, yPos)
          pdf.text(`₹${parseFloat(item.total_price).toFixed(0)}`, 75, yPos, { align: 'right' })
          yPos += 5
        })
        
        yPos += 3
        pdf.line(5, yPos, 75, yPos)
        yPos += 6
        
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(11)
        pdf.text('TOTAL:', 5, yPos)
        pdf.text(`₹${parseFloat(order.total_amount).toFixed(0)}`, 75, yPos, { align: 'right' })
        
        yPos += 8
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        pdf.text('Thank you for dining with us!', 40, yPos, { align: 'center' })
        
        pdf.save(`Receipt-${order.order_number}.pdf`)
        toast.success('PDF downloaded!')
      } catch (fallbackError) {
        toast.error('Failed to generate PDF. Try Print instead.')
        console.error('Fallback PDF Error:', fallbackError)
      }
    }
    setGenerating(false)
  }

  // Share via WhatsApp
  const handleWhatsAppShare = async () => {
    const itemsList = order.order_items?.map(item => 
      `• ${item.item_name}${item.variant ? ` (${item.variant})` : ''} x${item.quantity} = ₹${parseFloat(item.total_price).toFixed(0)}`
    ).join('\n')

    const message = `
🧾 *${restaurantName}*
📍 ${restaurantAddress}
📞 ${restaurantPhone}
━━━━━━━━━━━━━━━
*Order: ${order.order_number}*
📅 ${format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
🍽️ ${order.order_type?.replace('_', ' ')}${order.table_number ? ` | Table: ${order.table_number}` : ''}
${order.customer_name ? `👤 ${order.customer_name}` : ''}
${order.customer_phone ? `📱 ${order.customer_phone}` : ''}
━━━━━━━━━━━━━━━
*Items:*
${itemsList}
━━━━━━━━━━━━━━━
Subtotal: ₹${parseFloat(order.subtotal).toFixed(0)}
${order.discount_amount > 0 ? `Discount: -₹${parseFloat(order.discount_amount).toFixed(0)}\n` : ''}GST (${order.tax_percentage || 5}%): ₹${parseFloat(order.tax_amount).toFixed(0)}
━━━━━━━━━━━━━━━
*TOTAL: ₹${parseFloat(order.total_amount).toFixed(0)}*
━━━━━━━━━━━━━━━
💳 Payment: ${order.payment_method} (${order.payment_status})
━━━━━━━━━━━━━━━
🙏 Thank you for dining with us!
_"Good Food Brings People Together"_
    `.trim()

    const encodedMessage = encodeURIComponent(message)
    const whatsappURL = `https://wa.me/?text=${encodedMessage}`
    
    window.open(whatsappURL, '_blank')
    toast.success('Opening WhatsApp...')
  }

  // Share via native share (mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        const canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          backgroundColor: '#ffffff'
        })
        
        canvas.toBlob(async (blob) => {
          const file = new File([blob], `Receipt-${order.order_number}.png`, { type: 'image/png' })
          
          await navigator.share({
            title: `Receipt - ${order.order_number}`,
            text: `Receipt from ${restaurantName}`,
            files: [file]
          })
        })
      } catch (error) {
        const text = `Receipt ${order.order_number} - Total: ₹${parseFloat(order.total_amount).toFixed(0)}`
        await navigator.share({
          title: `Receipt - ${order.order_number}`,
          text: text
        })
      }
    } else {
      handleWhatsAppShare()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-dark-secondary rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-gold/20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-cream">Receipt</h2>
            {/* Printer Status Badge */}
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
              printerConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-muted/20 text-muted border border-muted/30'
            }`}>
              {printerConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {printerConnected ? 'USB' : 'Browser'}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted hover:text-cream hover:bg-dark-primary rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-4 overflow-y-auto max-h-[50vh] flex justify-center bg-gray-100">
          <div 
            ref={receiptRef} 
            className="bg-white text-black p-4 w-[280px] font-mono text-sm shadow-lg"
          >
            {/* Header with Logo */}
            <div className="text-center mb-3">
              <img 
                src={bismiLogo} 
                alt="Logo" 
                className="w-16 h-16 mx-auto rounded-full object-cover mb-2 border-2 border-gray-300"
              />
              <h1 className="text-base font-bold leading-tight">{restaurantName}</h1>
              <p className="text-[10px] mt-1 leading-tight">{restaurantAddress}</p>
              <p className="text-[10px]">Ph: {restaurantPhone}</p>
              {gstNumber && <p className="text-[10px]">GSTIN: {gstNumber}</p>}
            </div>
            
            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Order Info */}
            <div className="mb-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold">{order.order_number}</span>
                <span>{format(new Date(order.created_at), 'dd/MM/yy HH:mm')}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>{order.order_type?.replace('_', ' ')}</span>
                {order.table_number && <span>Table: {order.table_number}</span>}
              </div>
              {/* Customer info */}
              {order.customer_name && (
                <div className="text-[10px] text-gray-600 mt-1">
                  Customer: {order.customer_name}
                </div>
              )}
              {order.customer_phone && (
                <div className="text-[10px] text-gray-600">
                  Phone: {order.customer_phone}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Items Header */}
            <div className="flex justify-between text-[10px] font-bold mb-1 border-b border-gray-200 pb-1">
              <span className="flex-1">Item</span>
              <span className="w-8 text-center">Qty</span>
              <span className="w-14 text-right">Amount</span>
            </div>

            {/* Items */}
            <div className="mb-2">
              {order.order_items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[10px] py-0.5">
                  <span className="flex-1 pr-1 leading-tight">
                    {item.item_name}
                    {item.variant && <span className="text-gray-500 block text-[9px]">({item.variant})</span>}
                  </span>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <span className="w-14 text-right">₹{parseFloat(item.total_price).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Totals */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST ({order.tax_percentage || 5}%)</span>
                <span>₹{parseFloat(order.tax_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-double border-gray-600 my-2" />

            {/* Grand Total */}
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Payment Info */}
            <div className="text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-semibold">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-bold ${order.payment_status === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {order.payment_status}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Footer */}
            <div className="text-center">
              <p className="text-[10px] font-semibold">Thank you for dining with us!</p>
              <p className="text-[9px] text-gray-500 italic mt-1">"Good Food Brings People Together"</p>
              <div className="mt-2 text-[8px] text-gray-400">
                Visit again soon! 🙏
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-brand-gold/20 space-y-3">
          {/* Primary Print Button - Thermal */}
          <button
            onClick={handleThermalPrint}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-brand-gold text-dark-primary font-bold text-sm hover:bg-brand-gold-light transition-all shadow-gold"
          >
            <Printer size={20} />
            🖨️ Print Receipt
            {printerConnected && <span className="text-xs opacity-70">(USB Direct)</span>}
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-2">
            {/* USB Direct Print (if connected) */}
            {printerConnected && (
              <button
                onClick={handleDirectPrint}
                disabled={generating}
                className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all"
              >
                <Usb size={18} />
                <span className="text-[10px]">USB Print</span>
              </button>
            )}
            <button
              onClick={handleSilentPrint}
              disabled={generating}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all"
            >
              <Printer size={18} />
              <span className="text-[10px]">Browser</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all"
            >
              <Download size={18} />
              <span className="text-[10px]">{generating ? 'Wait...' : 'PDF'}</span>
            </button>
            <button
              onClick={handleWhatsAppShare}
              disabled={generating}
              className="flex flex-col items-center gap-1 p-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all"
            >
              <MessageCircle size={18} />
              <span className="text-[10px]">WhatsApp</span>
            </button>
          </div>

          {/* Native Share (Mobile) */}
          {'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold transition-all"
            >
              <Share2 size={18} />
              <span className="text-sm font-medium">Share Receipt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
