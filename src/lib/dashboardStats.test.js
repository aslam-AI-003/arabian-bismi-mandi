import { test } from 'node:test'
import assert from 'node:assert/strict'
import { series, summarizeDashboard, startOfWeek, startOfDay, addDays } from './dashboardStats.js'

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 30).toISOString()

test('hourly and daily series count only completed bills', () => {
  const orders = [
    { order_status: 'COMPLETED', total_amount: '100.10', created_at: at(2026, 11, 25, 13) },
    { order_status: 'COMPLETED', total_amount: '50.20', created_at: at(2026, 11, 25, 13) },
    { order_status: 'PENDING', total_amount: '999', created_at: at(2026, 11, 25, 13) },
    { order_status: 'COMPLETED', total_amount: '10', created_at: at(2026, 11, 24, 20) },
  ]
  const h = series(orders, 'hour', null, null)
  assert.equal(h.length, 24)
  assert.equal(h[13].sales, 150.3)
  assert.equal(h[13].orders, 2)
  const d = series(orders, 'day', new Date(2026, 10, 20), new Date(2026, 10, 25, 23))
  assert.equal(d.length, 6)
  assert.equal(d.at(-1).sales, 150.3)
  assert.equal(d.at(-2).sales, 10)
})

test('weekly and monthly buckets', () => {
  const mon = startOfWeek(new Date(2026, 10, 26))
  assert.equal(mon.getDay(), 1)
  const w = series([{ order_status: 'COMPLETED', total_amount: 5, created_at: addDays(mon, 2).toISOString() }], 'week', addDays(mon, -14), addDays(mon, 3))
  assert.equal(w.length, 3)
  assert.equal(w[2].sales, 5)
  const m = series([], 'month', new Date(2025, 11, 1), new Date(2026, 10, 25))
  assert.equal(m.length, 12)
  assert.equal(startOfDay(new Date(2026, 0, 1, 15)).getHours(), 0)
})

test('dashboard summary: sales, collections, profit, best sellers, categories', () => {
  const s = summarizeDashboard({
    orders: [
      { order_status: 'COMPLETED', total_amount: '300', order_items: [{ menu_item_id: 'm1', item_name: 'Chicken Mandi', variant: 'Single', quantity: 2, total_price: '300' }] },
      { order_status: 'COMPLETED', total_amount: '60', order_items: [{ menu_item_id: 'm2', item_name: 'Fries', quantity: 1, total_price: '60' }] },
      { order_status: 'CANCELLED', total_amount: '80', order_items: [{ menu_item_id: 'm2', item_name: 'Fries', quantity: 5, total_price: '80' }] },
    ],
    ledger: [
      { kind: 'PAYMENT', method: 'CASH', amount: '200', orders: { order_status: 'COMPLETED' } },
      { kind: 'PAYMENT', method: 'UPI', amount: '160', orders: { order_status: 'COMPLETED' } },
      { kind: 'PAYMENT', method: 'CARD', amount: '80', orders: { order_status: 'CANCELLED' } },
      { kind: 'REFUND', method: 'CASH', amount: '20', orders: { order_status: 'COMPLETED' } },
    ],
    expenses: [{ amount: '100' }],
    categoryOf: new Map([['m1', 'Mandi'], ['m2', 'Fries & Snacks']]),
  })
  assert.equal(s.revenue, 360)
  assert.equal(s.billCount, 2)
  assert.deepEqual(s.collections, { CASH: 200, CARD: 0, UPI: 160 })
  assert.equal(s.estimatedProfit, 240)
  assert.deepEqual(s.products[0], { name: 'Chicken Mandi (Single)', qty: 2, amount: 300 })
  assert.deepEqual(s.categories, [{ name: 'Mandi', amount: 300 }, { name: 'Fries & Snacks', amount: 60 }])
})
