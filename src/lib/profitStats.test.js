import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProfit } from './profitStats.js'

// The worked example from the pitch: 20 Chicken Mandi, 10 Mutton Mandi, 15 Fries.
const orders = [{
  order_status: 'COMPLETED', subtotal: '7900', discount_amount: '0',
  order_items: [
    { menu_item_id: 'cm', item_name: 'Chicken Mandi', variant: 'Single', quantity: 20, total_price: '3000', unit_cost: '80' },
    { menu_item_id: 'mm', item_name: 'Mutton Mandi', variant: 'Single', quantity: 10, total_price: '4000', unit_cost: '300' },
    { menu_item_id: 'ff', item_name: 'French Fries', variant: null, quantity: 15, total_price: '900', unit_cost: '20' },
  ],
}]

test('pitch example: profit per item, food cost %', () => {
  const r = buildProfit({ orders })
  assert.equal(r.itemSales, 7900)
  assert.equal(r.foodCost, 4900)
  assert.equal(r.grossProfit, 3000)
  assert.equal(r.foodCostPct, 62)
  const by = Object.fromEntries(r.items.map((i) => [i.name, i]))
  assert.deepEqual([by['Chicken Mandi (Single)'].profit, by['Chicken Mandi (Single)'].margin], [1400, 46.7])
  assert.deepEqual([by['Mutton Mandi (Single)'].profit, by['Mutton Mandi (Single)'].margin], [1000, 25])
  assert.deepEqual([by['French Fries'].profit, by['French Fries'].margin], [600, 66.7])
  // Mutton Mandi: brings in the most money but its profit % (25) is below average (38)
  assert.deepEqual(r.lowMargin.map((i) => i.name), ['Mutton Mandi (Single)'])
})

test('discount is shared across lines; parcel charge ignored', () => {
  const r = buildProfit({ orders: [{ order_status: 'COMPLETED', subtotal: '400', discount_amount: '40', parcel_charge: '10',
    order_items: [
      { menu_item_id: 'a', item_name: 'A', quantity: 1, total_price: '300', unit_cost: '100' },
      { menu_item_id: 'b', item_name: 'B', quantity: 1, total_price: '100', unit_cost: '50' },
    ] }] })
  assert.equal(r.itemSales, 360)
  assert.deepEqual(r.items.map((i) => [i.name, i.sales, i.profit]), [['A', 270, 170], ['B', 90, 40]])
})

test('missing cost kept out of totals; old lines use today cost as estimate', () => {
  const r = buildProfit({
    orders: [
      { order_status: 'COMPLETED', subtotal: '200', discount_amount: '0', order_items: [
        { menu_item_id: 'x', item_name: 'X', quantity: 1, total_price: '100', unit_cost: null },
        { menu_item_id: 'y', item_name: 'Y', quantity: 1, total_price: '100', unit_cost: null },
      ] },
      { order_status: 'CANCELLED', subtotal: '999', order_items: [{ menu_item_id: 'x', item_name: 'X', quantity: 9, total_price: '999' }] },
    ],
    costOf: new Map([['x', 40]]),
  })
  assert.equal(r.itemSales, 200)
  assert.equal(r.costedSales, 100)
  assert.equal(r.coveragePct, 50)
  assert.equal(r.foodCost, 40)
  const x = r.items.find((i) => i.name === 'X')
  assert.equal(x.estimated, true)
  assert.deepEqual(r.missingCost.map((i) => i.name), ['Y'])
})

test('expected vs actual food cost from expense categories; not sold in 30 days', () => {
  const r = buildProfit({
    orders,
    expenses: [
      { category: 'Meat & chicken', amount: '5000' }, { category: 'vegetables', amount: '700' },
      { category: 'Gas', amount: '1100' }, { category: 'Rent', amount: '9000' },
    ],
    menu: [
      { id: 'cm', name: 'Chicken Mandi', variant: 'Single', category: 'Mandi' },
      { id: 'bm', name: 'Beef Mandi', variant: 'Single', category: 'Mandi' },
      { id: 'off', name: 'Old Dish', category: 'Mandi', is_available: false },
    ],
    soldLast30: new Set(['cm']),
  })
  assert.equal(r.expectedFoodCost, 4900)
  assert.equal(r.actualFoodCost, 5700)
  assert.equal(r.difference, 800)
  assert.equal(r.actualFoodCostPct, 72.2)
  assert.deepEqual(r.notSold, [{ name: 'Beef Mandi (Single)', category: 'Mandi' }])
})

import { sizeFactor, suggestCosts } from './costSuggest.js'

test('cost suggestions for other sizes of the same dish', () => {
  assert.deepEqual(['Single', 'Couple', 'Family', 'Quarter', 'Half', 'Full', '2 pcs', 'Steamed/Fried, 5 pcs', '100g', null].map(sizeFactor), [1, 2, 4, 1, 2, 4, 2, 5, null, null])
  const items = [
    { id: 's', name: 'Chicken Mandi', variant: 'Single' }, { id: 'c', name: 'Chicken Mandi', variant: 'Couple' }, { id: 'f', name: 'Chicken Mandi', variant: 'Family' },
    { id: 'q', name: 'Grill Chicken', variant: 'Quarter' }, { id: 'h', name: 'Grill Chicken', variant: 'Half' }, { id: 'u', name: 'Grill Chicken', variant: 'Full' },
    { id: 'p2', name: 'Momos', variant: '2 pcs' }, { id: 'p6', name: 'Momos', variant: '6 pcs' },
    { id: 'x', name: 'Fries', variant: null },
  ]
  const s = suggestCosts(items, { s: 80, c: '', f: '', q: '', h: 120, u: '', p2: 30, p6: '', x: '' })
  assert.deepEqual(Object.fromEntries(s), { c: 160, f: 320, q: 60, u: 240, p6: 90 })
})
