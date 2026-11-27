// WhatsApp summary for the owners (Reports → Sales Report → Send to owner).

const rs = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** Indian mobile -> wa.me number (adds 91 to 10-digit numbers). '' if invalid. */
export function waNumber(phone) {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.length === 10) return `91${d}`
  if (d.length === 12 && d.startsWith('91')) return d
  return d.length >= 11 && d.length <= 15 ? d : ''
}

/** r = buildReport() result; unpaidAll = balance on all open bills. */
export function ownerMessage({ restaurant, rangeLabel, r, unpaidAll }) {
  const pay = Object.fromEntries(r.payments.map((p) => [p.method, p.net]))
  const top = r.items.slice(0, 5).map((i, n) => `${n + 1}. ${i.name} × ${i.qty} = ${rs(i.amount)}`)
  return [
    `📊 *${restaurant || 'Arabian Bismi Mandi'}*`,
    `🗓️ ${rangeLabel}`,
    '━━━━━━━━━━━━━━━',
    `💰 *Sales: ${rs(r.revenue)}*`,
    `🧾 Bills: ${r.billCount}  ·  Avg: ${rs(r.avgBill)}`,
    `💵 Cash: ${rs(pay.CASH)}`,
    `📱 UPI: ${rs(pay.UPI)}`,
    `💳 Card: ${rs(pay.CARD)}`,
    ...(r.refunded > 0 ? [`↩️ Refunds: ${rs(r.refunded)}`] : []),
    ...(r.cancelledCount > 0 ? [`❌ Cancelled: ${r.cancelledCount} (${rs(r.cancelledAmount)})`] : []),
    '━━━━━━━━━━━━━━━',
    '🔥 *Top items*',
    ...(top.length ? top : ['—']),
    '━━━━━━━━━━━━━━━',
    `🧾 Expenses: ${rs(r.expenses)}`,
    `📈 *Est. profit: ${rs(r.estimatedProfit)}*`,
    `⏳ Unpaid (all open bills): ${rs(unpaidAll)}`,
  ].join('\n')
}

export const waLink = (phone, text) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`
