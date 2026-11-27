import { test } from 'node:test'
import assert from 'node:assert/strict'
import { printerText, rawbtIntentUrl, detectDevice, getReceiptBytes } from './thermalPrinter.js'

test('printer text is plain ASCII', () => {
  assert.equal(printerText('₹250 × 2 – Chicken “Mandi” …'), 'Rs.250 x 2 - Chicken "Mandi" ...')
  assert.equal(printerText('சிக்கன் Mandi 🍗'), ' Mandi ')
})

test('RawBT intent link (Android) carries the ESC/POS bytes in base64', () => {
  const bytes = new Uint8Array([0x1b, 0x40, 72, 105, 10])
  const url = rawbtIntentUrl(bytes)
  assert.match(url, /^intent:base64,G0BIaQo=#Intent;scheme=rawbt;package=ru\.a402d\.rawbtprinter;S\.browser_fallback_url=https%3A%2F%2Fplay\.google\.com%2F.*;end;$/)
})

test('device detection', () => {
  assert.deepEqual(detectDevice('Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'), { os: 'android', browser: 'chrome', mobile: true })
  assert.equal(detectDevice('Mozilla/5.0 (Linux; Android 13) SamsungBrowser/23.0 Chrome/115').browser, 'samsung')
  assert.equal(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605 Version/17.0 Mobile Safari/604').os, 'ios')
  assert.deepEqual(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36 Edg/120'), { os: 'windows', browser: 'edge', mobile: false })
})

test('58mm receipt: every printed line fits 32 characters', () => {
  const order = {
    order_number: 'ORD-261127-012', order_type: 'DINE_IN', table_number: '5', created_by_name: 'Kumar', customer_name: 'Ravi', customer_phone: '9894092449',
    created_at: '2026-11-27T13:22:00Z', subtotal: '300', discount_amount: '0', total_amount: '300', paid_amount: '300', payment_method: 'SPLIT', payment_status: 'PAID',
    order_items: [{ item_name: 'Chicken Mandi', variant: 'Single', quantity: 2, unit_price: '150', total_price: '300' }],
    payments: [{ kind: 'PAYMENT', method: 'CASH', amount: '250', tendered: '500', change_given: '250' }, { kind: 'PAYMENT', method: 'UPI', amount: '50' }],
  }
  const bytes = getReceiptBytes(order, { restaurant_name: 'Arabian Bismi Mandi Restaurant', restaurant_address: 'Near Bus Stand', restaurant_phone: '9894092449' })
  // drop ESC/POS command bytes, keep printable text lines
  const text = Array.from(bytes).map((b) => (b === 10 || (b >= 32 && b < 127) ? String.fromCharCode(b) : '')).join('')
  const lines = text.split('\n').map((l) => l.replace(/^[@!E\-adMV2-3a]+(?=\S)/, ''))
  for (const l of lines.filter((x) => /Bill No|GRAND TOTAL|Paid - CASH|Cash received|Change Rs|Chicken Mandi|2 x Rs\.150/.test(x))) {
    assert.ok(l.length <= 32, `"${l}" is ${l.length} chars`)
  }
  assert.ok(text.includes('2 x Rs.150.00'))
  assert.ok(text.includes('  Cash received Rs.500.00\n'))
  assert.ok(text.includes('  Change Rs.250.00\n'))
  assert.ok(!/₹/.test(text))
})
