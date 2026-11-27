// Day-end slip: one layout used for the thermal printer, browser print and PDF.

const rs = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * report: buildReport() result for the day
 * drawer: DayEndSettlement summary (may be null)
 */
export function buildDaySlip({ dateLabel, report: r, drawer, printedBy }) {
  const sections = [
    {
      heading: 'Sales',
      rows: [
        ['Bills', String(r.billCount)],
        ['Gross sales', rs(r.grossSales)],
        ...(r.discounts > 0 ? [['Discounts', `-${rs(r.discounts)}`]] : []),
        ...(r.parcelCharges > 0 ? [['Parcel charges', rs(r.parcelCharges)]] : []),
        ...(r.roundOff !== 0 ? [['Round off', rs(r.roundOff)]] : []),
        ['TOTAL SALES', rs(r.revenue), true],
        ['Average bill', rs(r.avgBill)],
        ['Cancelled', `${r.cancelledCount} (${rs(r.cancelledAmount)})`],
        ...(r.pendingDue > 0 ? [['Unpaid on these bills', rs(r.pendingDue)]] : []),
      ],
    },
    {
      heading: 'Payments received',
      rows: [
        ...r.payments.map((p) => [p.method, rs(p.received)]),
        ...(r.refunded > 0 ? [['Refunds', `-${rs(r.refunded)}`]] : []),
        ['NET COLLECTED', rs(r.netCollected), true],
      ],
    },
  ]
  if (r.orderTypes.length) {
    sections.push({ heading: 'Order types', rows: r.orderTypes.map((t) => [`${t.type} (${t.count})`, rs(t.amount)]) })
  }
  if (drawer) {
    const d = drawer.difference
    sections.push({
      heading: 'Cash drawer',
      rows: [
        ['Opening balance', rs(drawer.opening)],
        ['+ Cash received', rs(drawer.cashSales)],
        ['- Cash out', rs(drawer.cashOutTotal)],
        ['EXPECTED CASH', rs(drawer.expectedCash), true],
        ['Counted cash', rs(drawer.countedCash)],
        [Math.abs(d) < 0.01 ? 'Difference (balanced)' : d < 0 ? 'Difference (SHORT)' : 'Difference (EXCESS)', rs(d), true],
      ],
    })
  }
  sections.push({ heading: 'Expenses', rows: [['Total expenses', rs(r.expenses)], ['EST. PROFIT', rs(r.estimatedProfit), true]] })
  if (r.items.length) {
    sections.push({ heading: 'Top items', rows: r.items.slice(0, 8).map((i) => [`${i.qty} x ${i.name}`, rs(i.amount)]) })
  }
  const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
  return { title: 'DAY END REPORT', subtitle: dateLabel, sections, footer: `Printed ${now}${printedBy ? ` by ${printedBy}` : ''}` }
}

/** 80mm PDF of the slip (built-in PDF font has no ₹, so "Rs." is used). */
export async function slipToPdf(slip, settings = {}, filename = 'day-end') {
  const { jsPDF } = await import('jspdf')
  const W = 80
  const M = 5
  const lines = 8 + slip.sections.reduce((n, s) => n + s.rows.length + 2, 0)
  const pdf = new jsPDF({ unit: 'mm', format: [W, Math.max(100, 28 + lines * 4.6)] })
  const t = (s) => String(s).replace(/₹/g, 'Rs.')
  let y = 8
  pdf.setFont('courier', 'bold')
  pdf.setFontSize(10)
  pdf.text(t(settings.restaurant_name || 'Arabian Bismi Mandi Restaurant'), W / 2, y, { align: 'center', maxWidth: W - 2 * M })
  y += 6
  pdf.setFontSize(12)
  pdf.text(slip.title, W / 2, y, { align: 'center' })
  y += 5
  pdf.setFont('courier', 'normal')
  pdf.setFontSize(9)
  if (slip.subtitle) { pdf.text(t(slip.subtitle), W / 2, y, { align: 'center' }); y += 4 }
  for (const s of slip.sections) {
    pdf.setLineDashPattern([1, 1], 0)
    pdf.line(M, y, W - M, y)
    y += 4.5
    pdf.setFont('courier', 'bold')
    pdf.text(t(s.heading).toUpperCase(), M, y)
    y += 4.5
    for (const [l, v, b] of s.rows) {
      pdf.setFont('courier', b ? 'bold' : 'normal')
      const label = t(l).length > 26 ? `${t(l).slice(0, 25)}…` : t(l)
      pdf.text(label, M, y)
      pdf.text(t(v), W - M, y, { align: 'right' })
      y += 4.3
    }
  }
  pdf.line(M, y, W - M, y)
  y += 5
  pdf.setFont('courier', 'normal')
  pdf.setFontSize(7.5)
  pdf.text(t(slip.footer || ''), W / 2, y, { align: 'center' })
  pdf.save(`${filename}.pdf`)
}
