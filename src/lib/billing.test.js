import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeBill, billConfigFromSettings, validatePayments, cashChange, balanceDue, netByMethod, dbErrorMessage, receiptExtras, unitLine,
} from './billing.js'
import { parseCsv, csvToMenu } from './menuImport.js'
import { toCsv } from './exporters.js'

const items = [{ price: 150, quantity: 2 }, { price: 60, quantity: 1 }]

test('default config keeps the old billing: subtotal - discount', () => {
  const b = computeBill(items, { type: 'FIXED', value: 10 }, 'TAKEAWAY', billConfigFromSettings({}))
  assert.deepEqual(b, { itemCount: 3, subtotal: 360, discount: 10, parcelCharge: 0, roundOff: 0, total: 350 })
})

test('percentage discount, capped at subtotal', () => {
  assert.equal(computeBill(items, { type: 'PERCENTAGE', value: 10 }).discount, 36)
  assert.equal(computeBill(items, { type: 'PERCENTAGE', value: 500 }).total, 0)
  assert.equal(computeBill(items, { type: 'FIXED', value: 9999 }).total, 0)
})

test('parcel charge per item / per order, only for configured types', () => {
  const cfg = billConfigFromSettings({ parcel_charge: '5', parcel_order_types: 'TAKEAWAY,DELIVERY' })
  assert.equal(computeBill(items, null, 'TAKEAWAY', cfg).parcelCharge, 15)
  assert.equal(computeBill(items, null, 'DINE_IN', cfg).parcelCharge, 0)
  const perOrder = billConfigFromSettings({ parcel_charge: '10', parcel_mode: 'per_order' })
  assert.equal(computeBill(items, null, 'DELIVERY', perOrder).total, 370)
})

test('round off to nearest rupee, matching the database', () => {
  const cfg = billConfigFromSettings({ round_off: 'true', parcel_charge: '5' })
  const b = computeBill([{ price: 99.6, quantity: 2 }], null, 'TAKEAWAY', cfg)
  assert.equal(b.subtotal, 199.2)
  assert.equal(b.parcelCharge, 10)
  assert.equal(b.total, 209)
  assert.equal(b.roundOff, -0.2)
  assert.equal(computeBill([{ price: 0.1, quantity: 3 }]).subtotal, 0.3) // no float drift
})

test('payment validation and change', () => {
  assert.equal(validatePayments(100, [{ method: 'CASH', amount: 60 }, { method: 'UPI', amount: 40 }]), null)
  assert.match(validatePayments(100, [{ method: 'CASH', amount: 101 }]), /more than/)
  assert.match(validatePayments(100, [{ method: 'CASH', amount: 0 }]), /more than zero/)
  assert.match(validatePayments(100, []), /at least one/)
  assert.equal(cashChange(500, 360), 140)
  assert.equal(cashChange(100, 360), 0)
})

test('balance and ledger totals', () => {
  assert.equal(balanceDue({ total_amount: '360.00', paid_amount: '100.00' }), 260)
  assert.equal(balanceDue({ total_amount: '360.00', paid_amount: '0', order_status: 'CANCELLED' }), 0)
  assert.deepEqual(netByMethod([
    { kind: 'PAYMENT', method: 'CASH', amount: '100.50' },
    { kind: 'PAYMENT', method: 'UPI', amount: '200' },
    { kind: 'REFUND', method: 'CASH', amount: '20.25' },
  ]), { CASH: 80.25, CARD: 0, UPI: 200 })
})

test('database error codes map to friendly text', () => {
  assert.equal(dbErrorMessage({ message: 'TABLE_OCCUPIED: T1 already has a running order.' }), 'That table already has a running order.')
  assert.equal(dbErrorMessage({ message: 'REFUND_TOO_LARGE: Refund cannot be more than Rs.40 paid.' }), 'Refund cannot be more than Rs.40 paid.')
  assert.match(dbErrorMessage({ message: 'TypeError: Failed to fetch' }), /internet/)
})

test('CSV menu import parsing', () => {
  assert.deepEqual(parseCsv('a,"b, c",d\n"x ""y""",2,\n'), [['a', 'b, c', 'd'], ['x "y"', '2', '']])
  const { items: rows, errors } = csvToMenu(
    'Category,Item,Price,Description,Variant\nMandi,Chicken Mandi,"₹1,000",Big plate,Family\nDrinks,Lime,abc\n,NoCat,10\nDrinks,Mint Mojito,90\n',
  )
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], { category: 'Mandi', name: 'Chicken Mandi', price: 1000, description: 'Big plate', variant: 'Family' })
  assert.equal(rows[1].variant, null)
  assert.equal(errors.length, 2)
})

test('CSV export escapes quotes and blocks formula injection', () => {
  const csv = toCsv([{ name: 'S', columns: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], rows: [{ a: '=HYPERLINK("x")', b: -5 }, { a: 'x,"y"', b: 1.5 }] }])
  assert.equal(csv, 'A,B\r\n"\'=HYPERLINK(""x"")",-5\r\n"x,""y""",1.5\r\n')
})

test('receipt lines: bill no, cashier, per-payment lines with cash received / change', () => {
  const r = receiptExtras({
    order_number: 'ORD-261125-001', created_by_name: 'Kumar', order_type: 'DINE_IN', total_amount: '273', paid_amount: '273',
    payment_status: 'PAID', created_at: '2026-11-25T13:22:00Z',
    payments: [
      { kind: 'PAYMENT', method: 'CASH', amount: '200', tendered: '500', change_given: '300' },
      { kind: 'PAYMENT', method: 'UPI', amount: '73', reference: 'TXN9' },
    ],
  })
  assert.equal(r.billNo, 'ORD-261125-001')
  assert.equal(r.cashier, 'Kumar')
  assert.equal(r.typeLabel, 'Dine-in')
  assert.deepEqual(r.paymentLines, [
    { label: 'Paid - CASH', amount: 200, note: 'Cash received ₹500.00 / Change ₹300.00' },
    { label: 'Paid - UPI', amount: 73, note: 'Ref: TXN9' },
  ])
  assert.equal(unitLine({ quantity: 2, unit_price: '20' }), '2 x ₹20.00')
  assert.equal(unitLine({ quantity: 1, unit_price: '20' }), '')
})
