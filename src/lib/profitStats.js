// Item profit / food cost report. Money in paise internally.
//
// For each bill line on a completed bill:
//   sales  = line amount minus its share of the bill discount
//            (share = bill discount x line amount / bill subtotal)
//   cost   = cost saved on the line when billed (unit_cost) x qty;
//            older lines without a saved cost use today's cost (marked "estimated")
//   profit = sales - cost
// Parcel charges are not food, so they are left out.
// Lines whose item has no cost at all are reported as "cost not set" and kept
// out of the cost / profit totals, so a half-filled menu never gives wrong totals.

const P = (n) => Math.round((Number(n) || 0) * 100)
const R = (p) => p / 100
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null)

export const DEFAULT_FOOD_CATEGORIES = ['Raw materials', 'Meat & chicken', 'Vegetables']

/**
 * orders: completed/other orders in the period, with order_items
 *         (menu_item_id, item_name, variant, quantity, total_price, unit_cost)
 * costOf: Map menu_item_id -> today's cost price
 * expenses: expenses in the period
 * foodCategories: expense categories that are food purchases
 * menu: [{ id, name, variant, category, is_available }]
 * soldLast30: Set of menu_item_ids sold in the last 30 days
 */
export function buildProfit({ orders = [], costOf = new Map(), expenses = [], foodCategories = DEFAULT_FOOD_CATEGORIES, menu = [], soldLast30 = new Set() }) {
  const items = new Map()
  let allSales = 0
  for (const o of orders) {
    if (o.order_status !== 'COMPLETED') continue
    const sub = P(o.subtotal)
    const disc = P(o.discount_amount)
    for (const l of o.order_items || []) {
      const lineP = P(l.total_price)
      const share = sub > 0 ? Math.round((disc * lineP) / sub) : 0
      const sales = lineP - share
      const qty = Number(l.quantity) || 0
      const saved = l.unit_cost != null && l.unit_cost !== ''
      const current = costOf.get(l.menu_item_id)
      const unit = saved ? P(l.unit_cost) : current != null ? P(current) : null
      const key = l.menu_item_id || `${l.item_name}|${l.variant || ''}`
      const name = l.variant ? `${l.item_name} (${l.variant})` : l.item_name
      const it = items.get(key) || { id: l.menu_item_id, name, qty: 0, sales: 0, cost: 0, costedSales: 0, costedQty: 0, missingQty: 0, estimated: false }
      it.qty += qty
      it.sales += sales
      if (unit == null) it.missingQty += qty
      else {
        it.cost += unit * qty
        it.costedSales += sales
        it.costedQty += qty
        if (!saved) it.estimated = true
      }
      items.set(key, it)
      allSales += sales
    }
  }

  const rows = [...items.values()].map((it) => {
    const profit = it.costedSales - it.cost
    return {
      id: it.id,
      name: it.name,
      qty: it.qty,
      sales: R(it.sales),
      cost: it.costedQty ? R(it.cost) : null,
      profit: it.costedQty ? R(profit) : null,
      margin: it.costedQty ? pct(profit, it.costedSales) : null,
      costSet: it.missingQty === 0,
      partlyCosted: it.missingQty > 0 && it.costedQty > 0,
      estimated: it.estimated,
    }
  })

  const costed = [...items.values()].filter((i) => i.costedQty > 0)
  const costedSales = costed.reduce((s, i) => s + i.costedSales, 0)
  const cost = costed.reduce((s, i) => s + i.cost, 0)
  const profit = costedSales - cost
  const avgMargin = pct(profit, costedSales)

  // Sells a lot but low profit: sales value at least the median item's,
  // and profit % below the average.
  const withMargin = rows.filter((r) => r.margin != null)
  const amounts = withMargin.map((r) => r.sales).sort((a, b) => a - b)
  const median = amounts.length ? amounts[Math.floor((amounts.length - 1) / 2)] : 0
  const lowMargin = withMargin
    .filter((r) => r.sales >= median && avgMargin != null && r.margin < avgMargin)
    .sort((a, b) => b.sales - a.sales || a.margin - b.margin)
    .slice(0, 10)

  const foodSet = new Set(foodCategories.map((c) => c.toLowerCase()))
  const actual = expenses.filter((e) => foodSet.has(String(e.category || '').toLowerCase())).reduce((s, e) => s + P(e.amount), 0)

  const notSold = menu
    .filter((m) => m.is_available !== false && !soldLast30.has(m.id))
    .map((m) => ({ name: m.variant ? `${m.name} (${m.variant})` : m.name, category: m.category || '' }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

  return {
    items: rows.sort((a, b) => (b.profit ?? -Infinity) - (a.profit ?? -Infinity) || b.sales - a.sales),
    itemSales: R(allSales),
    costedSales: R(costedSales),
    coveragePct: pct(costedSales, allSales),
    foodCost: R(cost),
    grossProfit: R(profit),
    foodCostPct: pct(cost, costedSales),
    avgMargin,
    lowMargin,
    missingCost: rows.filter((r) => !r.costSet).sort((a, b) => b.sales - a.sales),
    expectedFoodCost: R(cost),
    actualFoodCost: R(actual),
    actualFoodCostPct: pct(actual, allSales),
    difference: R(actual - cost),
    hasActual: actual > 0,
    notSold,
  }
}
