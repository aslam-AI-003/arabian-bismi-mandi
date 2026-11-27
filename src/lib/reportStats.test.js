import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildReport, headline, presetRange, previousRange, pctChange } from './reportStats.js'

const at = (d, h) => new Date(2026, 10, d, h, 15).toISOString() // Nov 2026, local time

const orders = [
  { order_number: 'A1', order_status: 'COMPLETED', order_type: 'DINE_IN', subtotal: '300', discount_amount: '30', discount_type: 'PERCENTAGE', discount_value: '10', parcel_charge: '0', round_off: '0', total_amount: '270', paid_amount: '270', created_by_name: 'Kumar', customer_phone: '9894092449', customer_name: 'Ravi', created_at: at(23, 13),
    order_items: [{ menu_item_id: 'm1', item_name: 'Chicken Mandi', variant: 'Single', quantity: 2, total_price: '300' }] },
  { order_number: 'A2', order_status: 'COMPLETED', order_type: 'TAKEAWAY', subtotal: '120', discount_amount: '0', parcel_charge: '10', round_off: '-0.5', total_amount: '129.5', paid_amount: '100', created_by_name: 'Owner', customer_phone: '9894092449', created_at: at(24, 20),
    order_items: [{ menu_item_id: 'm2', item_name: 'Fries', quantity: 2, total_price: '120' }] },
  { order_number: 'A3', order_status: 'CANCELLED', order_type: 'TAKEAWAY', subtotal: '60', total_amount: '60', paid_amount: '0', cancel_reason: 'left', created_by_name: 'Kumar', created_at: at(24, 21), order_items: [] },
  { order_number: 'A4', order_status: 'PENDING', order_type: 'DINE_IN', subtotal: '50', total_amount: '50', paid_amount: '0', created_at: at(24, 21), order_items: [] },
]
const ledger = [
  { kind: 'PAYMENT', method: 'CASH', amount: '270', orders: { order_number: 'A1', order_status: 'COMPLETED' } },
  { kind: 'PAYMENT', method: 'UPI', amount: '100', orders: { order_number: 'A2', order_status: 'COMPLETED' } },
  { kind: 'REFUND', method: 'CASH', amount: '20', reason: 'cold', created_by_name: 'Owner', orders: { order_number: 'A1', order_status: 'COMPLETED' } },
]
const expenses = [{ amount: '100', category: 'Gas' }, { amount: '50.25', category: 'Gas' }, { amount: '10', category: 'Other' }]

test('report: totals, payments, types, profit', () => {
  const r = buildReport({ orders, ledger, expenses, categoryOf: new Map([['m1', 'Mandi'], ['m2', 'Fries & Snacks']]), from: new Date(2026, 10, 23), to: new Date(2026, 10, 24, 23) })
  assert.equal(r.revenue, 399.5)
  assert.equal(r.grossSales, 420)
  assert.equal(r.discounts, 30)
  assert.equal(r.parcelCharges, 10)
  assert.equal(r.roundOff, -0.5)
  assert.equal(r.billCount, 2)
  assert.equal(r.avgBill, 199.75)
  assert.equal(r.pendingDue, 29.5)
  assert.equal(r.cancelledCount, 1)
  assert.equal(r.netCollected, 350)
  assert.equal(r.expenses, 160.25)
  assert.equal(r.estimatedProfit, 219.25)
  assert.deepEqual(r.payments[0], { method: 'CASH', received: 270, refunded: 20, net: 250 })
  assert.deepEqual(r.orderTypes, [{ type: 'Dine In', count: 1, amount: 270 }, { type: 'Takeaway', count: 1, amount: 129.5 }])
  assert.deepEqual(r.daily.map((d) => d.sales), [270, 129.5])
  assert.deepEqual(r.categories.map((c) => c.name), ['Mandi', 'Fries & Snacks'])
  assert.deepEqual(r.expenseByCategory[0], { name: 'Gas', amount: 150.25 })
  assert.equal(r.discountBills[0].kind, '10%')
  assert.equal(r.refunds[0].reason, 'cold')
  assert.equal(r.cancelled[0].reason, 'left')
})

test('report extras: staff, customers, busiest hours', () => {
  const r = buildReport({ orders, ledger, expenses })
  assert.deepEqual(r.staff.map((s) => [s.name, s.bills, s.amount, s.discount]), [['Kumar', 1, 270, 30], ['Owner', 1, 129.5, 0]])
  assert.deepEqual(r.customers[0], { phone: '9894092449', name: 'Ravi', visits: 2, amount: 399.5, last: at(24, 20) })
  // 23 Nov 2026 is a Monday
  assert.equal(r.heatmap[0][13], 270)
  assert.deepEqual(r.peak, { day: 'Mon', hour: 13, amount: 270 })
})

test('periods and comparison', () => {
  const now = new Date(2026, 10, 27, 15) // Friday
  const [wf] = presetRange('week', now)
  assert.equal(wf.getDate(), 23)
  const [lf, lt] = presetRange('lastweek', now)
  assert.deepEqual([lf.getDate(), lt.getDate()], [16, 22])
  const [mf, mt] = presetRange('lastmonth', now)
  assert.deepEqual([mf.getMonth(), mf.getDate(), mt.getMonth(), mt.getDate()], [9, 1, 9, 31])
  const [pf, pt] = previousRange(new Date(2026, 10, 23), new Date(2026, 10, 27, 23))
  assert.deepEqual([pf.getDate(), pt.getDate()], [18, 22])
  assert.equal(pctChange(110, 100), 10)
  assert.equal(pctChange(50, 0), null)
  assert.deepEqual(headline({ orders, ledger, expenses }), { revenue: 399.5, bills: 2, avgBill: 199.75, expenses: 160.25, profit: 219.25 })
})

import { waNumber, ownerMessage, waLink } from './ownerReport.js'

test('owner WhatsApp message and number', () => {
  assert.equal(waNumber('98940 92449'), '919894092449')
  assert.equal(waNumber('+91 98940-92449'), '919894092449')
  assert.equal(waNumber('123'), '')
  const r = buildReport({ orders, ledger, expenses })
  const msg = ownerMessage({ restaurant: 'Arabian Bismi', rangeLabel: '27 Nov 2026', r, unpaidAll: 29.5 })
  for (const s of ['*Sales: ₹399.5*', 'Bills: 2', 'Cash: ₹250', 'UPI: ₹100', 'Refunds: ₹20', 'Cancelled: 1', '1. Chicken Mandi (Single) × 2 = ₹300', 'Expenses: ₹160.25', '*Est. profit: ₹219.25*', 'Unpaid (all open bills): ₹29.5']) {
    assert.ok(msg.includes(s), s)
  }
  assert.match(waLink('9894092449', 'hi & bye'), /^https:\/\/wa\.me\/919894092449\?text=hi%20%26%20bye$/)
})
