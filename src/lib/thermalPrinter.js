/**
 * Thermal Printer Integration for Arabian Bismi Mandi POS
 * 
 * Supports two modes:
 * 1. Silent Print (Option B) - Uses browser's default printer with optimized receipt formatting
 * 2. Web Serial API (Option A) - Direct USB thermal printer connection via ESC/POS commands
 * 
 * ESC/POS is the standard protocol for 58mm/80mm thermal receipt printers
 */

// ============================================
// ESC/POS COMMAND CONSTANTS
// ============================================
const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

const COMMANDS = {
  // Initialize printer
  INIT: [ESC, 0x40],
  
  // Text alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  
  // Text style
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  
  // Font size
  FONT_A: [ESC, 0x4D, 0x00], // 12x24
  FONT_B: [ESC, 0x4D, 0x01], // 9x17 (smaller)
  
  // Line spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32],
  LINE_SPACING_SET: (n) => [ESC, 0x33, n],
  
  // Paper
  FEED_LINE: [LF],
  FEED_LINES: (n) => [ESC, 0x64, n],
  CUT_PAPER: [GS, 0x56, 0x00],      // Full cut
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01], // Partial cut
  
  // Cash drawer
  OPEN_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xFA],
}

// ============================================
// PRINTER STATE MANAGEMENT
// ============================================
let serialPort = null
let writer = null
let isConnected = false
let printerConfig = {
  mode: 'silent', // 'silent' | 'serial'
  paperWidth: 80,  // 80mm or 58mm
  autoPrint: false,
  openDrawer: false,
  printCopy: 1,
}

// Load config from localStorage
export function loadPrinterConfig() {
  try {
    const saved = localStorage.getItem('printerConfig')
    if (saved) {
      printerConfig = { ...printerConfig, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Failed to load printer config:', e)
  }
  return printerConfig
}

// Save config to localStorage
export function savePrinterConfig(config) {
  printerConfig = { ...printerConfig, ...config }
  localStorage.setItem('printerConfig', JSON.stringify(printerConfig))
  return printerConfig
}

export function getPrinterConfig() {
  return printerConfig
}

// ============================================
// WEB SERIAL API - Direct Printer Connection
// ============================================

/**
 * Check if Web Serial API is supported
 */
export function isSerialSupported() {
  return 'serial' in navigator
}

/**
 * Connect to thermal printer via USB Serial
 */
export async function connectPrinter() {
  if (!isSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser. Use Chrome or Edge.')
  }

  try {
    // Request port - browser will show a picker dialog
    serialPort = await navigator.serial.requestPort()
    
    // Open the port with common thermal printer baud rates
    await serialPort.open({ 
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    })

    writer = serialPort.writable.getWriter()
    isConnected = true
    
    // Initialize the printer
    await sendCommand(COMMANDS.INIT)
    
    savePrinterConfig({ mode: 'serial' })
    
    return { success: true, message: 'Printer connected successfully!' }
  } catch (error) {
    isConnected = false
    if (error.name === 'NotFoundError') {
      return { success: false, message: 'No printer selected. Please try again.' }
    }
    return { success: false, message: `Connection failed: ${error.message}` }
  }
}

/**
 * Disconnect the printer
 */
export async function disconnectPrinter() {
  try {
    if (writer) {
      await writer.releaseLock()
      writer = null
    }
    if (serialPort) {
      await serialPort.close()
      serialPort = null
    }
    isConnected = false
    return { success: true }
  } catch (error) {
    isConnected = false
    return { success: false, message: error.message }
  }
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected() {
  return isConnected && serialPort !== null
}

/**
 * Send raw bytes to printer
 */
async function sendCommand(bytes) {
  if (!writer) throw new Error('Printer not connected')
  const data = new Uint8Array(bytes)
  await writer.write(data)
}

/**
 * Send text to printer
 */
async function sendText(text) {
  if (!writer) throw new Error('Printer not connected')
  const encoder = new TextEncoder()
  await writer.write(encoder.encode(text))
}

// ============================================
// RECEIPT FORMATTING - ESC/POS
// ============================================

/**
 * Generate ESC/POS receipt data for thermal printer
 */
function generateReceiptBytes(order, settings = {}) {
  const restaurantName = settings.restaurant_name || 'Arabian Bismi Mandi Restaurant'
  const restaurantAddress = settings.restaurant_address || 'Near Kovilady Bus Stand, Main Road, Chakkarapalli'
  const restaurantPhone = settings.restaurant_phone || '9894092449 | 9025499668'
  const paperWidth = printerConfig.paperWidth === 58 ? 32 : 48 // characters per line
  
  const commands = []
  
  // Helper functions
  const addCmd = (cmd) => commands.push(...cmd)
  const addText = (text) => {
    const encoder = new TextEncoder()
    commands.push(...encoder.encode(text + '\n'))
  }
  const addLine = () => addText('-'.repeat(paperWidth))
  const addDashLine = () => addText('='.repeat(paperWidth))
  const padRight = (str, len) => str.substring(0, len).padEnd(len)
  const padLeft = (str, len) => str.substring(0, len).padStart(len)
  const formatRow = (left, right) => {
    const maxLeft = paperWidth - right.length - 1
    return padRight(left, maxLeft) + ' ' + right
  }
  const formatRow3 = (left, center, right) => {
    const centerLen = 5
    const rightLen = right.length
    const leftLen = paperWidth - centerLen - rightLen - 2
    return padRight(left, leftLen) + ' ' + padRight(center, centerLen) + ' ' + right
  }
  
  // Initialize
  addCmd(COMMANDS.INIT)
  addCmd(COMMANDS.ALIGN_CENTER)
  
  // Restaurant Header
  addCmd(COMMANDS.BOLD_ON)
  addCmd(COMMANDS.DOUBLE_SIZE_ON)
  addText(restaurantName.length > paperWidth/2 ? 'Arabian Bismi' : restaurantName)
  addCmd(COMMANDS.NORMAL_SIZE)
  
  if (restaurantName.length > paperWidth/2) {
    addText('Mandi Restaurant')
  }
  
  addCmd(COMMANDS.BOLD_OFF)
  addCmd(COMMANDS.FONT_B)
  addText(restaurantAddress)
  addText(`Ph: ${restaurantPhone}`)
  addCmd(COMMANDS.FONT_A)
  
  addDashLine()
  
  // Order Info
  addCmd(COMMANDS.ALIGN_LEFT)
  addCmd(COMMANDS.BOLD_ON)
  const orderDate = new Date(order.created_at)
  const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  addText(formatRow(`Order: ${order.order_number}`, `${dateStr} ${timeStr}`))
  addCmd(COMMANDS.BOLD_OFF)
  
  const orderType = order.order_type?.replace('_', ' ') || ''
  const tableInfo = order.table_number ? `Table: ${order.table_number}` : ''
  addText(formatRow(orderType, tableInfo))
  
  // Customer info
  if (order.customer_name) {
    addText(`Customer: ${order.customer_name}`)
  }
  if (order.customer_phone) {
    addText(`Phone: ${order.customer_phone}`)
  }
  
  addLine()
  
  // Items Header
  addCmd(COMMANDS.BOLD_ON)
  addText(formatRow3('Item', 'Qty', 'Amount'))
  addCmd(COMMANDS.BOLD_OFF)
  addLine()
  
  // Items
  order.order_items?.forEach(item => {
    const itemName = item.item_name || ''
    const qty = item.quantity.toString()
    const price = `Rs.${parseFloat(item.total_price).toFixed(0)}`
    
    if (item.variant) {
      addText(itemName)
      addText(formatRow3(`  (${item.variant})`, qty, price))
    } else {
      addText(formatRow3(itemName, qty, price))
    }
  })
  
  addLine()
  
  // Totals
  addText(formatRow('Subtotal', `Rs.${parseFloat(order.subtotal).toFixed(2)}`))
  
  if (order.discount_amount > 0) {
    addText(formatRow('Discount', `-Rs.${parseFloat(order.discount_amount).toFixed(2)}`))
  }
  
  addText(formatRow(`GST (${order.tax_percentage || 5}%)`, `Rs.${parseFloat(order.tax_amount).toFixed(2)}`))
  
  addDashLine()
  
  // Grand Total
  addCmd(COMMANDS.BOLD_ON)
  addCmd(COMMANDS.DOUBLE_HEIGHT_ON)
  addText(formatRow('TOTAL', `Rs.${parseFloat(order.total_amount).toFixed(2)}`))
  addCmd(COMMANDS.NORMAL_SIZE)
  addCmd(COMMANDS.BOLD_OFF)
  
  addDashLine()
  
  // Payment
  addText(formatRow('Payment', order.payment_method || 'CASH'))
  addText(formatRow('Status', order.payment_status || 'PAID'))
  
  addLine()
  
  // Footer
  addCmd(COMMANDS.ALIGN_CENTER)
  addCmd(COMMANDS.FONT_B)
  addText('')
  addText('Thank you for dining with us!')
  addText('"Good Food Brings People Together"')
  addText('')
  addCmd(COMMANDS.FONT_A)
  
  // Feed and cut
  addCmd(COMMANDS.FEED_LINES(4))
  addCmd(COMMANDS.CUT_PAPER_PARTIAL)
  
  return new Uint8Array(commands)
}

// ============================================
// PRINT FUNCTIONS
// ============================================

/**
 * Print receipt via Web Serial API (Direct ESC/POS)
 */
export async function printReceiptSerial(order, settings = {}) {
  if (!isPrinterConnected()) {
    throw new Error('Printer not connected. Please connect a printer first.')
  }
  
  try {
    const receiptData = generateReceiptBytes(order, settings)
    await writer.write(receiptData)
    
    // Open cash drawer if configured
    if (printerConfig.openDrawer) {
      await sendCommand(COMMANDS.OPEN_DRAWER)
    }
    
    return { success: true, message: 'Receipt printed!' }
  } catch (error) {
    return { success: false, message: `Print failed: ${error.message}` }
  }
}

/**
 * Print receipt via Silent Browser Print (Option B)
 * Opens a minimal print window optimized for thermal printers
 */
export function printReceiptSilent(order, settings = {}) {
  const restaurantName = settings.restaurant_name || 'Arabian Bismi Mandi Restaurant'
  const restaurantAddress = settings.restaurant_address || 'Near Kovilady Bus Stand, Main Road, Chakkarapalli'
  const restaurantPhone = settings.restaurant_phone || '9894092449 | 9025499668'
  const gstNumber = settings.gst_number || ''
  const paperWidth = printerConfig.paperWidth === 58 ? '58mm' : '80mm'

  const orderDate = new Date(order.created_at)
  const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })

  const itemsHTML = (order.order_items || []).map(item => `
    <tr>
      <td class="item-name">
        ${item.item_name}
        ${item.variant ? `<br><small>(${item.variant})</small>` : ''}
      </td>
      <td class="qty">${item.quantity}</td>
      <td class="price">₹${parseFloat(item.total_price).toFixed(0)}</td>
    </tr>
  `).join('')

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${order.order_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', 'Lucida Console', monospace;
          width: ${paperWidth};
          max-width: ${paperWidth};
          padding: 5px 8px;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .big { font-size: 16px; }
        .small { font-size: 10px; }
        .divider { 
          border: none;
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .double-divider {
          border: none;
          border-top: 2px solid #000;
          margin: 6px 0;
        }
        .header h1 { font-size: 16px; margin-bottom: 2px; }
        .header p { font-size: 10px; line-height: 1.3; }
        .order-info { margin: 4px 0; }
        .order-info .row { display: flex; justify-content: space-between; }
        table { width: 100%; border-collapse: collapse; }
        th { font-size: 10px; text-align: left; padding: 2px 0; border-bottom: 1px solid #000; }
        td { padding: 2px 0; font-size: 11px; vertical-align: top; }
        td.qty { text-align: center; width: 30px; }
        td.price { text-align: right; width: 55px; }
        td.item-name { }
        td.item-name small { color: #555; }
        .totals .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
        .totals .total-row { font-size: 16px; font-weight: bold; padding: 4px 0; }
        .totals .discount { color: #000; }
        .footer { margin-top: 8px; font-size: 10px; }
        .customer-info { font-size: 10px; margin: 2px 0; }
        
        @media print {
          @page { 
            size: ${paperWidth} auto;
            margin: 0;
          }
          body { 
            width: ${paperWidth}; 
            padding: 3px 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header center">
        <h1 class="bold">${restaurantName}</h1>
        <p>${restaurantAddress}</p>
        <p>Ph: ${restaurantPhone}</p>
        ${gstNumber ? `<p>GSTIN: ${gstNumber}</p>` : ''}
      </div>
      
      <hr class="divider" />
      
      <div class="order-info">
        <div class="row">
          <span class="bold">${order.order_number}</span>
          <span>${dateStr} ${timeStr}</span>
        </div>
        <div class="row small">
          <span>${(order.order_type || '').replace('_', ' ')}</span>
          ${order.table_number ? `<span>Table: ${order.table_number}</span>` : ''}
        </div>
        ${order.customer_name ? `<div class="customer-info">Customer: ${order.customer_name}</div>` : ''}
        ${order.customer_phone ? `<div class="customer-info">Phone: ${order.customer_phone}</div>` : ''}
      </div>
      
      <hr class="divider" />
      
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="qty">Qty</th>
            <th class="price">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <hr class="divider" />
      
      <div class="totals">
        <div class="row">
          <span>Subtotal</span>
          <span>₹${parseFloat(order.subtotal).toFixed(2)}</span>
        </div>
        ${order.discount_amount > 0 ? `
        <div class="row discount">
          <span>Discount</span>
          <span>-₹${parseFloat(order.discount_amount).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="row">
          <span>GST (${order.tax_percentage || 5}%)</span>
          <span>₹${parseFloat(order.tax_amount).toFixed(2)}</span>
        </div>
        <hr class="double-divider" />
        <div class="row total-row">
          <span>TOTAL</span>
          <span>₹${parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      </div>
      
      <hr class="divider" />
      
      <div class="order-info">
        <div class="row small">
          <span>Payment: ${order.payment_method || 'CASH'}</span>
          <span>${order.payment_status || 'PAID'}</span>
        </div>
      </div>
      
      <hr class="divider" />
      
      <div class="footer center">
        <p class="bold">Thank you for dining with us!</p>
        <p><i>"Good Food Brings People Together"</i></p>
        <br />
        <p>Visit again soon! 🙏</p>
      </div>
      
      <script>
        // Auto-print when page loads
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }, 200);
        };
      </script>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank', `width=350,height=600,left=100,top=100`)
  if (printWindow) {
    printWindow.document.write(printHTML)
    printWindow.document.close()
    return { success: true, message: 'Receipt sent to printer!' }
  } else {
    return { success: false, message: 'Pop-up blocked! Please allow pop-ups for printing.' }
  }
}

/**
 * Main print function - auto-selects the best method
 */
export async function printReceipt(order, settings = {}) {
  const config = loadPrinterConfig()
  
  if (config.mode === 'serial' && isPrinterConnected()) {
    return await printReceiptSerial(order, settings)
  } else {
    return printReceiptSilent(order, settings)
  }
}

/**
 * Print test page
 */
export async function printTestPage() {
  const testOrder = {
    order_number: 'TEST-001',
    order_type: 'DINE_IN',
    table_number: '5',
    customer_name: 'Test Customer',
    customer_phone: '9894092449',
    created_at: new Date().toISOString(),
    subtotal: 500,
    discount_amount: 0,
    tax_percentage: 5,
    tax_amount: 25,
    total_amount: 525,
    payment_method: 'CASH',
    payment_status: 'PAID',
    order_items: [
      { item_name: 'Chicken Mandi', variant: 'Single', quantity: 2, total_price: 300 },
      { item_name: 'Chicken Shawarma', variant: null, quantity: 1, total_price: 80 },
      { item_name: 'French Fries', variant: null, quantity: 1, total_price: 60 },
      { item_name: 'Cola', variant: null, quantity: 2, total_price: 60 },
    ]
  }
  
  return await printReceipt(testOrder)
}
