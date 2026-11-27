// Pure helpers for the Dashboard (SIP N' GOSSIP style). Money in paise
// internally to avoid float drift.

const P = (n) => Math.round((Number(n) || 0) * 100)
const R = (p) => p / 100

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Monday-based week start. */
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

/**
 * Bucket completed bills into a time series: unit = hour | day | week | month.
 * Returns [{ key, label, sales, orders }].
 */
export function series(orders, unit, from, to) {
  const buckets = []
  const keyOf = (d) => {
    if (unit === 'hour') return d.getHours()
    if (unit === 'day') return startOfDay(d).getTime()
    if (unit === 'week') return startOfWeek(d).getTime()
    return startOfMonth(d).getTime()
  }
  if (unit === 'hour') {
    for (let h = 0; h < 24; h += 1) buckets.push({ key: h, label: `${String(h).padStart(2, '0')}:00`, sales: 0, orders: 0 })
  } else {
    let cur = unit === 'day' ? startOfDay(from) : unit === 'week' ? startOfWeek(from) : startOfMonth(from)
    const end = new Date(to)
    while (cur <= end) {
      const label = unit === 'month'
        ? cur.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        : cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      buckets.push({ key: cur.getTime(), label, sales: 0, orders: 0 })
      if (unit === 'day') cur = addDays(cur, 1)
      else if (unit === 'week') cur = addDays(cur, 7)
      else { cur = new Date(cur); cur.setMonth(cur.getMonth() + 1) }
    }
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  const paise = buckets.map(() => 0)
  for (const o of orders) {
    if (o.order_status !== 'COMPLETED') continue
    const i = idx.get(keyOf(new Date(o.created_at)))
    if (i == null) continue
    paise[i] += P(o.total_amount)
    buckets[i].orders += 1
  }
  buckets.forEach((b, i) => { b.sales = R(paise[i]) })
  return buckets
}

/**
 * Period figures.
 * orders: orders created in the period (with order_items)
 * ledger: payment rows in the period (with orders.order_status)
 * expenses: expenses in the period
 * categoryOf: menu_item_id -> category name
 */
export function summarizeDashboard({ orders = [], ledger = [], expenses = [], categoryOf = new Map() }) {
  const bills = orders.filter((o) => o.order_status === 'COMPLETED')
  let revenue = 0
  const products = new Map()
  const categories = new Map()
  for (const o of bills) {
    revenue += P(o.total_amount)
    for (const i of o.order_items || []) {
      const name = i.variant ? `${i.item_name} (${i.variant})` : i.item_name
      const amt = P(i.total_price)
      const p = products.get(name) || { name, qty: 0, amount: 0 }
      p.qty += Number(i.quantity) || 0
      p.amount += amt
      products.set(name, p)
      const cn = categoryOf.get(i.menu_item_id) || 'Other'
      categories.set(cn, (categories.get(cn) || 0) + amt)
    }
  }
  const collections = { CASH: 0, CARD: 0, UPI: 0 }
  let refunded = 0
  for (const p of ledger) {
    if (p.orders?.order_status === 'CANCELLED') continue
    const m = p.method === 'WALLET' ? 'UPI' : p.method
    if (p.kind === 'REFUND') refunded += P(p.amount)
    else collections[m] = (collections[m] || 0) + P(p.amount)
  }
  const expenseTotal = expenses.reduce((s, e) => s + P(e.amount), 0)
  return {
    revenue: R(revenue),
    billCount: bills.length,
    collections: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, R(v)])),
    refunded: R(refunded),
    expenses: R(expenseTotal),
    estimatedProfit: R(revenue - refunded - expenseTotal),
    products: [...products.values()].map((p) => ({ ...p, amount: R(p.amount) })).sort((a, b) => b.qty - a.qty || b.amount - a.amount),
    categories: [...categories.entries()].map(([name, v]) => ({ name, amount: R(v) })).sort((a, b) => b.amount - a.amount),
  }
}
