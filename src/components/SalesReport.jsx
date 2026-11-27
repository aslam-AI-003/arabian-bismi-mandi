import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAppSettings } from '../context/SettingsContext'
import { getReportOrders, getReportPayments, getExpenses, getMenuCategoryMap, getCompareData, getPrivateSettings, getPendingBalanceOrders } from '../lib/supabase'
import { ownerMessage, waLink, waNumber } from '../lib/ownerReport'
import { MessageCircle } from 'lucide-react'
import { buildReport, headline, presetRange, previousRange, pctChange, WEEKDAYS } from '../lib/reportStats'
import { startOfDay, endOfDay } from '../lib/dashboardStats'
import { balanceDue, dbErrorMessage } from '../lib/billing'
import { exportCsv, exportXlsx, exportPdf } from '../lib/exporters'
import { Kpi, Section, PeriodPicker, ExportButtons } from './ReportParts'

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const iso = (d) => format(d, 'yyyy-MM-dd')
const dt = (d) => (d ? format(new Date(d), 'dd MMM yyyy, hh:mm a') : '')

// Day x hour grid of sales (6:00–23:00), darker = more sales.
function Heatmap({ r }) {
  const { t } = useLanguage()
  const hours = Array.from({ length: 18 }, (_, i) => i + 6)
  const max = Math.max(1, ...r.heatmap.flat())
  return (
    <div className="overflow-x-auto">
      {r.peak && (
        <p className="text-sm text-cream mb-3">
          {t('peakTime')}: <b className="text-brand-gold">{r.peak.day} {String(r.peak.hour).padStart(2, '0')}:00–{String(r.peak.hour + 1).padStart(2, '0')}:00</b> ({money(r.peak.amount)})
        </p>
      )}
      <table className="text-xs border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th />
            {hours.map((h) => <th key={h} className="text-muted font-normal w-8">{String(h).padStart(2, '0')}</th>)}
          </tr>
        </thead>
        <tbody>
          {WEEKDAYS.map((d, di) => (
            <tr key={d}>
              <td className="text-muted pr-2">{d}</td>
              {hours.map((h) => {
                const v = r.heatmap[di][h]
                return (
                  <td
                    key={h}
                    title={`${d} ${h}:00 · ${money(v)} · ${r.heatCount[di][h]} bills`}
                    className="w-8 h-7 rounded"
                    style={{ background: v > 0 ? `rgba(212,164,76,${0.15 + 0.85 * (v / max)})` : 'rgba(255,255,255,0.04)' }}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SalesReport() {
  const { t, language } = useLanguage()
  const { settings } = useAppSettings()
  const [preset, setPreset] = useState('today')
  const [from, setFrom] = useState(iso(new Date()))
  const [to, setTo] = useState(iso(new Date()))
  const [data, setData] = useState(null)
  const [prev, setPrev] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (f = from, tt = to) => {
    setBusy(true)
    setError('')
    const start = startOfDay(new Date(`${f}T00:00:00`))
    const end = endOfDay(new Date(`${tt}T00:00:00`))
    const [pf, pt] = previousRange(start, end)
    const [o, p, e, c, cmp] = await Promise.all([
      getReportOrders(start.toISOString(), end.toISOString()),
      getReportPayments(start.toISOString(), end.toISOString()),
      getExpenses(f, tt),
      getMenuCategoryMap(),
      getCompareData(pf.toISOString(), pt.toISOString(), iso(pf), iso(pt)),
    ])
    const err = o.error || p.error || e.error
    if (err) setError(dbErrorMessage(err, language))
    else {
      setData({ orders: o.data, ledger: p.data, expenses: e.data || [], categoryOf: c.data, from: start, to: end })
      setPrev(cmp.error ? null : headline(cmp.data))
    }
    setBusy(false)
  }, [from, to, language])

  // Presets run straight away; Custom waits for "Run report".
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id) => {
    setPreset(id)
    if (id === 'custom') return
    const [a, b] = presetRange(id)
    setFrom(iso(a))
    setTo(iso(b))
    load(iso(a), iso(b))
  }

  const r = useMemo(() => (data ? buildReport(data) : null), [data])

  const buildSheets = useCallback((lang) => {
    if (!r) return []
    const m = (key, label) => ({ key, label, money: true })
    const n = (key, label) => ({ key, label, num: true })
    const c = (key, label) => ({ key, label })
    const L = (en, ta) => (lang === 'ta' ? ta : en)
    return [
      {
        name: 'Summary', title: t('secSummary'), open: true,
        columns: [c('k', L('Item', 'விவரம்')), m('v', L('Amount', 'தொகை'))],
        rows: [
          { k: L('Gross sales (menu value)', 'மொத்த விற்பனை (மெனு மதிப்பு)'), v: r.grossSales },
          { k: L('Discounts', 'தள்ளுபடி'), v: -r.discounts },
          { k: L('Parcel charges', 'பார்சல் கட்டணம்'), v: r.parcelCharges },
          { k: L('Round off', 'ரவுண்ட் ஆஃப்'), v: r.roundOff },
          { k: L('Total sales (completed bills)', 'மொத்த விற்பனை (முடிந்த பில்கள்)'), v: r.revenue, _bold: true },
          { k: L('Refunds', 'திருப்பி கொடுத்தது'), v: -r.refunded },
          { k: L('Expenses', 'செலவுகள்'), v: -r.expenses },
          { k: L('Estimated profit', 'மதிப்பிட்ட லாபம்'), v: r.estimatedProfit, _bold: true },
          { k: L('Unpaid on these bills', 'இந்த பில்களில் பாக்கி'), v: r.pendingDue },
          { k: `${L('Bills', 'பில்கள்')}: ${r.billCount} · ${L('Average bill', 'சராசரி பில்')}`, v: r.avgBill },
          { k: `${L('Cancelled orders', 'ரத்தான ஆர்டர்கள்')}: ${r.cancelledCount}`, v: r.cancelledAmount },
        ],
      },
      {
        name: 'Payments', title: t('secPayments'), open: true,
        columns: [c('method', L('Method', 'முறை')), m('received', L('Received', 'பெற்றது')), m('refunded', L('Refunded', 'திருப்பியது')), m('net', L('Net', 'நிகர'))],
        rows: [...r.payments, { method: L('Total', 'மொத்தம்'), received: r.collected, refunded: r.refunded, net: r.netCollected, _bold: true }],
      },
      {
        name: 'Order types', title: t('secOrderTypes'), open: true,
        columns: [c('type', L('Type', 'வகை')), n('count', L('Bills', 'பில்கள்')), m('amount', L('Sales', 'விற்பனை'))],
        rows: r.orderTypes,
      },
      {
        name: 'Daily sales', title: t('secDaily'),
        columns: [c('label', L('Date', 'தேதி')), n('orders', L('Bills', 'பில்கள்')), m('sales', L('Sales', 'விற்பனை'))],
        rows: r.daily,
      },
      {
        name: 'Staff-wise sales', title: t('secStaff'), open: true,
        columns: [c('name', L('Staff', 'பணியாளர்')), n('bills', L('Bills', 'பில்கள்')), m('amount', L('Sales', 'விற்பனை')), m('discount', L('Discount given', 'தள்ளுபடி'))],
        rows: r.staff,
      },
      {
        name: 'Top customers', title: t('secCustomers'),
        columns: [c('phone', L('Phone', 'போன்')), c('name', L('Name', 'பெயர்')), n('visits', L('Visits', 'வருகைகள்')), m('amount', L('Spent', 'செலவழித்தது')), c('lastAt', L('Last visit', 'கடைசி வருகை'))],
        rows: r.customers.slice(0, 50).map((x) => ({ ...x, lastAt: dt(x.last) })),
      },
      {
        name: 'Busiest hours', title: t('busiestHours'), heatmap: true,
        columns: [c('day', L('Day', 'நாள்')), ...Array.from({ length: 18 }, (_, i) => m(`h${i + 6}`, `${String(i + 6).padStart(2, '0')}:00`))],
        rows: WEEKDAYS.map((d, di) => Object.fromEntries([['day', d], ...Array.from({ length: 18 }, (_, i) => [`h${i + 6}`, r.heatmap[di][i + 6]])])),
      },
      {
        name: 'Items sold', title: t('secItems'),
        columns: [c('name', L('Item', 'பொருள்')), c('category', L('Category', 'வகை')), n('qty', L('Qty', 'அளவு')), m('amount', L('Sales', 'விற்பனை'))],
        rows: r.items,
      },
      {
        name: 'Categories', title: t('secCategories'),
        columns: [c('name', L('Category', 'வகை')), n('qty', L('Qty', 'அளவு')), m('amount', L('Sales', 'விற்பனை'))],
        rows: r.categories,
      },
      {
        name: 'Expenses by category', title: t('secExpCat'),
        columns: [c('name', L('Category', 'வகை')), m('amount', L('Amount', 'தொகை'))],
        rows: r.expenseByCategory,
      },
      {
        name: 'Discounts', title: t('secDiscounts'),
        columns: [c('bill', L('Bill', 'பில்')), c('timeAt', L('Time', 'நேரம்')), c('kind', L('Type', 'வகை')), c('by', L('By', 'யார்')), m('subtotal', L('Subtotal', 'கூட்டுத்தொகை')), m('amount', L('Discount', 'தள்ளுபடி'))],
        rows: r.discountBills.map((x) => ({ ...x, timeAt: dt(x.time) })),
      },
      {
        name: 'Refunds', title: t('secRefunds'),
        columns: [c('bill', L('Bill', 'பில்')), c('timeAt', L('Time', 'நேரம்')), c('method', L('Method', 'முறை')), c('reason', L('Reason', 'காரணம்')), c('by', L('By', 'யார்')), m('amount', L('Amount', 'தொகை'))],
        rows: r.refunds.map((x) => ({ ...x, timeAt: dt(x.time) })),
      },
      {
        name: 'Cancelled', title: t('secCancelled'),
        columns: [c('bill', L('Order', 'ஆர்டர்')), c('timeAt', L('Time', 'நேரம்')), c('reason', L('Reason', 'காரணம்')), c('by', L('By', 'யார்')), m('amount', L('Amount', 'தொகை'))],
        rows: r.cancelled.map((x) => ({ ...x, timeAt: dt(x.time) })),
      },
      {
        name: 'Bills', title: t('secBills'),
        columns: [
          c('no', L('Bill', 'பில்')), c('timeAt', L('Time', 'நேரம்')), c('type', L('Type', 'வகை')), c('table', L('Table', 'டேபிள்')),
          c('status', L('Status', 'நிலை')), c('pay', L('Payment', 'பணம்')), c('by', L('Cashier', 'காசாளர்')),
          m('total', L('Total', 'மொத்தம்')), m('paid', L('Paid', 'செலுத்தியது')), m('due', L('Balance', 'பாக்கி')),
        ],
        rows: [...data.orders].reverse().map((o) => ({
          no: o.order_number, timeAt: dt(o.created_at), type: o.order_type, table: o.table_number || '', status: o.order_status,
          pay: o.order_status === 'CANCELLED' ? '' : `${o.payment_method || ''} ${o.payment_status || ''}`.trim(), by: o.created_by_name || '',
          total: Number(o.total_amount), paid: Number(o.paid_amount), due: balanceDue(o),
        })),
      },
    ]
  }, [r, data, t])
  const sheets = useMemo(() => buildSheets(language), [buildSheets, language])

  const range = from === to ? format(new Date(`${from}T00:00:00`), 'dd MMM yyyy') : `${format(new Date(`${from}T00:00:00`), 'dd MMM yyyy')} – ${format(new Date(`${to}T00:00:00`), 'dd MMM yyyy')}`
  const doExport = async (kind) => {
    // Export files always use English headings (Tamil letters don't render in the PDF font)
    const filename = `bismi-report-${from}_to_${to}`
    const clean = buildSheets('en').map(({ name, columns, rows }) => ({ name, columns, rows: rows.map(({ _bold, ...x }) => x) }))
    try {
      if (kind === 'csv') exportCsv(clean, filename)
      else if (kind === 'xlsx') await exportXlsx(clean, filename)
      else await exportPdf(clean, filename, { title: `${settings.restaurant_name || 'Arabian Bismi Mandi Restaurant'} – Sales report`, subtitle: range })
    } catch (e) {
      toast.error(e?.message || 'Export failed')
    }
  }

  const cmp = (now, key) => (prev ? pctChange(now, prev[key]) : null)

  // WhatsApp summary to one of the (max 2) owner numbers from Settings.
  const [owners, setOwners] = useState([])
  const [pickOwner, setPickOwner] = useState(false)
  useEffect(() => {
    getPrivateSettings().then(({ data }) => setOwners([data?.owner_whatsapp_1, data?.owner_whatsapp_2].filter((n) => waNumber(n))))
  }, [])
  const sendTo = async (phone) => {
    setPickOwner(false)
    const { data: pend } = await getPendingBalanceOrders()
    const unpaidAll = (pend || []).reduce((sum, o) => sum + balanceDue(o), 0)
    const text = ownerMessage({ restaurant: settings.restaurant_name, rangeLabel: range, r, unpaidAll })
    window.open(waLink(phone, text), '_blank')
  }
  const onSend = () => {
    if (owners.length === 0) { toast.error(t('noOwnerNumbers')); return }
    if (owners.length === 1) sendTo(owners[0])
    else setPickOwner((x) => !x)
  }

  return (
    <div className="space-y-5">
      <ExportButtons disabled={!r} onExport={doExport}>
        <div className="relative">
          <button type="button" disabled={!r} onClick={onSend} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
            <MessageCircle size={16} /> {t('sendToOwner')}
          </button>
          {pickOwner && (
            <div className="absolute right-0 mt-1 z-20 rounded-lg border border-brand-gold/30 bg-dark-secondary shadow-lg overflow-hidden min-w-[180px]">
              {owners.map((n, i) => (
                <button key={n} type="button" onClick={() => sendTo(n)} className="block w-full text-left px-4 py-2 text-sm text-cream hover:bg-brand-gold/10">
                  {t('ownerNumber')} {i + 1} · {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </ExportButtons>

      <PeriodPicker
        preset={preset}
        onPreset={choose}
        from={from}
        to={to}
        setFrom={(v) => { setPreset('custom'); setFrom(v) }}
        setTo={(v) => { setPreset('custom'); setTo(v) }}
        onRun={() => load()}
        busy={busy}
        max={iso(new Date())}
        range={range}
      />

      {error && <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm">{error}</div>}
      {busy && !r && <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>}

      {r && (
        <>
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${busy ? 'opacity-60' : ''}`}>
            <Kpi label={t('totalRevenue')} value={money(r.revenue)} color="text-brand-gold" change={cmp(r.revenue, 'revenue')} />
            <Kpi label={t('bills')} value={r.billCount} change={cmp(r.billCount, 'bills')} />
            <Kpi label={t('avgBill')} value={money(r.avgBill)} change={cmp(r.avgBill, 'avgBill')} />
            <Kpi label={t('discount')} value={money(r.discounts)} />
            <Kpi label={t('refunds')} value={money(r.refunded)} />
            <Kpi label={t('expenses')} value={money(r.expenses)} color="text-red-400" change={cmp(r.expenses, 'expenses')} invert />
            <Kpi label={t('estimatedProfit')} value={money(r.estimatedProfit)} color={r.estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'} change={cmp(r.estimatedProfit, 'profit')} />
            <Kpi label={t('netCollected')} value={money(r.netCollected)} />
          </div>
          <p className="text-muted text-xs -mt-2">{t('dashNote')}</p>

          <div className="space-y-3">
            {sheets.map((sh) => (
              <Section key={sh.name} sheet={sh} defaultOpen={!!sh.open}>
                {sh.heatmap ? <Heatmap r={r} /> : null}
              </Section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
