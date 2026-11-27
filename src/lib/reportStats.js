// Sales report figures (SIP N' GOSSIP style) plus Bismi extras:
// staff-wise sales, top customers, busiest hours, previous-period compare.
// Money in paise internally.

import { series, startOfDay, endOfDay, startOfWeek, startOfMonth, addDays } from './dashboardStats.js'

const P = (n) => Math.round((Number(n) || 0) * 100)
const R = (p) => p / 100
const METHODS = ['CASH', 'CARD', 'UPI']
const TYPES = { DINE_IN: 'Dine In', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery' }
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** [from, to] Date pair for a preset id. */
export function presetRange(id, now = new Date()) {
  const today = startOfDay(now)
  switch (id) {
    case 'yesterday': return [addDays(today, -1), endOfDay(addDays(today, -1))]
    case 'week': return [startOfWeek(now), endOfDay(now)]
    case 'lastweek': return [addDays(startOfWeek(now), -7), endOfDay(addDays(startOfWeek(now), -1))]
    case 'month': return [startOfMonth(now), endOfDay(now)]
    case 'lastmonth': {
      const s = startOfMonth(now)
      s.setMonth(s.getMonth() - 1)
      return [s, endOfDay(addDays(startOfMonth(now), -1))]
    }
    default: return [today, endOfDay(now)]
  }
}

/** The same-length period just before [from, to] (for "vs previous"). */
export function previousRange(from, to) {
  const days = Math.round((startOfDay(to) - startOfDay(from)) / 86400000) + 1
  return [addDays(startOfDay(from), -days), endOfDay(addDays(startOfDay(from), -1))]
}

/** % change, or null when there is nothing to compare with. */
export function pctChange(now, before) {
  if (!before) return null
  return Math.round(((now - before) / Math.abs(before)) * 1000) / 10
}

/** Headline numbers only (used for the previous period). */
export function headline({ orders = [], ledger = [], expenses = [] }) {
  const bills = orders.filter((o) => o.order_status === 'COMPLETED')
  const revenue = bills.reduce((s, o) => s + P(o.total_amount), 0)
  const refunded = ledger.filter((p) => p.kind === 'REFUND' && p.orders?.order_status !== 'CANCELLED').reduce((s, p) => s + P(p.amount), 0)
  const exp = expenses.reduce((s, e) => s + P(e.amount), 0)
  return {
    revenue: R(revenue),
    bills: bills.length,
    avgBill: bills.length ? Math.round(revenue / bills.length) / 100 : 0,
    expenses: R(exp),
    profit: R(revenue - refunded - exp),
  }
}

/**
 * Full report.
 * orders: orders created in the range (with order_items)
 * ledger: payment rows in the range (with orders.order_number / order_status)
 * expenses: expenses in the range
 * categoryOf: Map menu_item_id -> category name
 */
export function buildReport({ orders = [], ledger = [], expenses = [], categoryOf = new Map(), from, to }) {
  const bills = orders.filter((o) => o.order_status === 'COMPLETED')
  const cancelled = orders.filter((o) => o.order_status === 'CANCELLED')
  const acc = { gross: 0, discount: 0, parcel: 0, roundOff: 0, revenue: 0, due: 0 }
  const items = new Map()
  const cats = new Map()
  const types = {}
  const staff = new Map()
  const customers = new Map()
  const heat = WEEKDAYS.map(() => Array(24).fill(0))
  const heatCount = WEEKDAYS.map(() => Array(24).fill(0))

  for (const o of bills) {
    acc.gross += P(o.subtotal)
    acc.discount += P(o.discount_amount)
    acc.parcel += P(o.parcel_charge)
    acc.roundOff += P(o.round_off)
    acc.revenue += P(o.total_amount)
    acc.due += Math.max(0, P(o.total_amount) - P(o.paid_amount))

    const t = types[o.order_type] || (types[o.order_type] = { count: 0, amount: 0 })
    t.count += 1
    t.amount += P(o.total_amount)

    const who = o.created_by_name || '(not recorded)'
    const st = staff.get(who) || { name: who, bills: 0, amount: 0, discount: 0 }
    st.bills += 1
    st.amount += P(o.total_amount)
    st.discount += P(o.discount_amount)
    staff.set(who, st)

    const phone = String(o.customer_phone || '').trim()
    if (phone) {
      const c = customers.get(phone) || { phone, name: '', visits: 0, amount: 0, last: o.created_at }
      c.visits += 1
      c.amount += P(o.total_amount)
      if (o.customer_name) c.name = o.customer_name
      if (o.created_at > c.last) c.last = o.created_at
      customers.set(phone, c)
    }

    const d = new Date(o.created_at)
    const wd = (d.getDay() + 6) % 7
    heat[wd][d.getHours()] += P(o.total_amount)
    heatCount[wd][d.getHours()] += 1

    for (const i of o.order_items || []) {
      const name = i.variant ? `${i.item_name} (${i.variant})` : i.item_name
      const category = categoryOf.get(i.menu_item_id) || 'Other'
      const it = items.get(name) || { name, category, qty: 0, amount: 0 }
      it.qty += Number(i.quantity) || 0
      it.amount += P(i.total_price)
      items.set(name, it)
      const c = cats.get(category) || { name: category, qty: 0, amount: 0 }
      c.qty += Number(i.quantity) || 0
      c.amount += P(i.total_price)
      cats.set(category, c)
    }
  }

  const received = { CASH: 0, CARD: 0, UPI: 0 }
  const refundedBy = { CASH: 0, CARD: 0, UPI: 0 }
  const refunds = []
  for (const p of ledger) {
    if (p.orders?.order_status === 'CANCELLED') continue
    const m = p.method === 'WALLET' ? 'UPI' : p.method
    if (p.kind === 'REFUND') {
      refundedBy[m] = (refundedBy[m] || 0) + P(p.amount)
      refunds.push({ bill: p.orders?.order_number || '', time: p.created_at, method: m, reason: p.reason || '', by: p.created_by_name || '', amount: Number(p.amount) })
    } else {
      received[m] = (received[m] || 0) + P(p.amount)
    }
  }
  const collected = METHODS.reduce((s, m) => s + received[m], 0)
  const refunded = METHODS.reduce((s, m) => s + refundedBy[m], 0)

  const expTotal = expenses.reduce((s, e) => s + P(e.amount), 0)
  const expByCat = new Map()
  for (const e of expenses) expByCat.set(e.category || 'Other', (expByCat.get(e.category || 'Other') || 0) + P(e.amount))

  const byMoney = (m) => [...m.values()].map((x) => ({ ...x, amount: R(x.amount) }))
  const heatmap = heat.map((row) => row.map(R))
  let peak = null
  heat.forEach((row, d) => row.forEach((v, h) => { if (v > 0 && (!peak || v > peak.v)) peak = { day: d, hour: h, v } }))

  return {
    revenue: R(acc.revenue),
    grossSales: R(acc.gross),
    discounts: R(acc.discount),
    parcelCharges: R(acc.parcel),
    roundOff: R(acc.roundOff),
    billCount: bills.length,
    avgBill: bills.length ? Math.round(acc.revenue / bills.length) / 100 : 0,
    pendingDue: R(acc.due),
    cancelledCount: cancelled.length,
    cancelledAmount: R(cancelled.reduce((s, o) => s + P(o.total_amount), 0)),
    collected: R(collected),
    refunded: R(refunded),
    netCollected: R(collected - refunded),
    expenses: R(expTotal),
    estimatedProfit: R(acc.revenue - refunded - expTotal),
    payments: METHODS.map((m) => ({ method: m, received: R(received[m]), refunded: R(refundedBy[m]), net: R(received[m] - refundedBy[m]) })),
    orderTypes: Object.entries(types).map(([k, v]) => ({ type: TYPES[k] || k, count: v.count, amount: R(v.amount) })),
    daily: from && to ? series(orders, 'day', from, to).map(({ label, orders: n, sales }) => ({ label, orders: n, sales })) : [],
    items: byMoney(items).sort((a, b) => b.qty - a.qty || b.amount - a.amount),
    categories: byMoney(cats).sort((a, b) => b.amount - a.amount),
    expenseByCategory: [...expByCat.entries()].map(([name, v]) => ({ name, amount: R(v) })).sort((a, b) => b.amount - a.amount),
    discountBills: bills.filter((o) => P(o.discount_amount) > 0).map((o) => ({
      bill: o.order_number, time: o.created_at,
      kind: o.discount_type === 'PERCENTAGE' ? `${Number(o.discount_value)}%` : 'Flat',
      subtotal: Number(o.subtotal), amount: Number(o.discount_amount), by: o.created_by_name || '',
    })),
    refunds,
    cancelled: cancelled.map((o) => ({ bill: o.order_number, time: o.created_at, amount: Number(o.total_amount), reason: o.cancel_reason || '', by: o.created_by_name || '' })),
    staff: [...staff.values()].map((x) => ({ ...x, amount: R(x.amount), discount: R(x.discount) })).sort((a, b) => b.amount - a.amount),
    customers: byMoney(customers).sort((a, b) => b.amount - a.amount || b.visits - a.visits),
    heatmap,
    heatCount,
    peak: peak ? { day: WEEKDAYS[peak.day], hour: peak.hour, amount: R(peak.v) } : null,
  }
}
