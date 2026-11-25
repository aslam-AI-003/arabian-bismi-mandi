// Report exports. Each "sheet" is { name, columns: [{ key, label, money? }], rows: [] }.

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

const csvCell = (v) => {
  let s = v == null ? '' : String(v)
  // Stop spreadsheet formula injection from user-entered text (names, notes).
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(sheets) {
  const parts = []
  sheets.forEach((sh, i) => {
    if (sheets.length > 1) {
      if (i > 0) parts.push('')
      parts.push(csvCell(sh.name))
    }
    parts.push(sh.columns.map((c) => csvCell(c.label)).join(','))
    for (const r of sh.rows) parts.push(sh.columns.map((c) => csvCell(r[c.key])).join(','))
  })
  return parts.join('\r\n') + '\r\n'
}

export function exportCsv(sheets, filename) {
  // BOM so Excel opens UTF-8 (₹, Tamil names) correctly.
  download(new Blob(['\ufeff', toCsv(sheets)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export async function exportXlsx(sheets, filename) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const data = sheets.map((sh) => ({
    sheet: sh.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31),
    columns: sh.columns.map((c) => ({ width: c.money ? 14 : Math.min(Math.max(c.label.length + 4, 12), 40) })),
    data: [
      sh.columns.map((c) => ({ value: c.label, fontWeight: 'bold' })),
      ...sh.rows.map((r) => sh.columns.map((c) => {
        const v = r[c.key]
        if (typeof v === 'number') return { value: v, type: Number, format: c.money ? '#,##0.00' : undefined }
        return { value: v == null ? '' : String(v), type: String }
      })),
    ],
  }))
  await writeXlsxFile(data).toFile(`${filename}.xlsx`)
}

export async function exportPdf(sheets, filename, { title, subtitle } = {}) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text(title || 'Report', 14, 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  if (subtitle) pdf.text(subtitle, 14, 22)
  let y = 28
  // The built-in PDF font has no ₹ glyph or Tamil letters, so money uses "Rs."
  const fmt = (v, money) => (typeof v === 'number'
    ? (money ? `Rs.${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : v.toLocaleString('en-IN'))
    : (v == null ? '' : String(v).replace(/₹/g, 'Rs.')))
  for (const sh of sheets) {
    autoTable(pdf, {
      startY: y,
      head: [
        [{ content: sh.name, colSpan: sh.columns.length, styles: { fillColor: [45, 21, 21], textColor: [212, 164, 76] } }],
        sh.columns.map((c) => c.label),
      ],
      body: sh.rows.length ? sh.rows.map((r) => sh.columns.map((c) => fmt(r[c.key], c.money))) : [[{ content: 'No data', colSpan: sh.columns.length }]],
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [200, 161, 61], textColor: [30, 10, 10] },
      columnStyles: Object.fromEntries(sh.columns.map((c, i) => [i, typeof sh.rows[0]?.[c.key] === 'number' ? { halign: 'right' } : {}])),
      margin: { left: 14, right: 14 },
    })
    y = pdf.lastAutoTable.finalY + 8
  }
  pdf.save(`${filename}.pdf`)
}
