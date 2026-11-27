import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Loader2, Printer, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { getReportOrders, getReportPayments, getExpenses, getMenuCategoryMap } from '../lib/supabase'
import { buildReport } from '../lib/reportStats'
import { buildDaySlip, slipToPdf } from '../lib/daySlip'
import { printSlip } from '../lib/thermalPrinter'
import { dbErrorMessage } from '../lib/billing'
import DayEndSettlement from './DayEndSettlement'

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const todayIso = () => format(new Date(), 'yyyy-MM-dd')

function Stat({ label, value, color = 'text-cream' }) {
  return (
    <div className="rounded-xl border border-brand-gold/20 bg-dark-secondary/60 p-3">
      <p className="text-muted text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  )
}

/** One screen to close a day: its numbers, the cash drawer, and the day-end slip. */
export default function DayClose() {
  const { t, language } = useLanguage()
  const { staff } = useAuth()
  const { settings } = useAppSettings()
  const [date, setDate] = useState(todayIso())
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drawer, setDrawer] = useState(null)

  const load = useCallback(async () => {
    setBusy(true)
    const from = new Date(`${date}T00:00:00`).toISOString()
    const to = new Date(`${date}T23:59:59.999`).toISOString()
    const [o, p, e, c] = await Promise.all([getReportOrders(from, to), getReportPayments(from, to), getExpenses(date, date), getMenuCategoryMap()])
    const err = o.error || p.error || e.error
    if (err) toast.error(dbErrorMessage(err, language))
    else setData({ orders: o.data, ledger: p.data, expenses: e.data || [], categoryOf: c.data })
    setBusy(false)
  }, [date, language])

  useEffect(() => { load() }, [load])

  const r = useMemo(() => (data ? buildReport(data) : null), [data])
  const dateLabel = format(new Date(`${date}T00:00:00`), 'EEEE, dd MMM yyyy')
  const slip = () => buildDaySlip({ dateLabel, report: r, drawer, printedBy: staff?.name })

  const print = async () => {
    const res = await printSlip(slip(), settings)
    if (res.success) toast.success(res.message)
    else toast.error(res.message)
  }
  const pdf = async () => {
    try { await slipToPdf(slip(), settings, `day-end-${date}`) } catch (e) { toast.error(e?.message || 'PDF failed') }
  }

  const pay = (m) => r?.payments.find((x) => x.method === m)?.net || 0

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-end gap-3">
        <div>
          <label className="text-muted text-xs block mb-1">{t('date')}</label>
          <input type="date" className="input py-2" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <p className="text-muted text-sm flex-1 min-w-[200px]">{t('dayCloseIntro')}</p>
        <div className="flex gap-2">
          <button type="button" onClick={print} disabled={!r} className="px-4 py-2 rounded-lg bg-brand-gold text-dark-primary font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
            <Printer size={16} /> {t('printSlip')}
          </button>
          <button type="button" onClick={pdf} disabled={!r} className="px-4 py-2 rounded-lg bg-dark-secondary border border-brand-gold/20 text-cream hover:border-brand-gold text-sm flex items-center gap-2 disabled:opacity-50">
            <Download size={16} /> {t('slipPdf')}
          </button>
        </div>
      </div>

      {!r ? (
        <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>
      ) : (
        <div className={busy ? 'opacity-60' : ''}>
          <h2 className="text-xl font-decorative text-brand-gold mb-3">{dateLabel}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label={t('totalRevenue')} value={money(r.revenue)} color="text-brand-gold" />
            <Stat label={t('bills')} value={r.billCount} />
            <Stat label={t('avgBill')} value={money(r.avgBill)} />
            <Stat label={t('cancelledTab')} value={`${r.cancelledCount} · ${money(r.cancelledAmount)}`} color="text-red-300" />
            <Stat label={language === 'ta' ? 'பணம் (Cash)' : 'Cash'} value={money(pay('CASH'))} />
            <Stat label="UPI" value={money(pay('UPI'))} />
            <Stat label={language === 'ta' ? 'கார்டு' : 'Card'} value={money(pay('CARD'))} />
            <Stat label={t('expenses')} value={money(r.expenses)} color="text-red-400" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <div className="card">
              <h3 className="text-cream font-semibold mb-2">{t('secOrderTypes')}</h3>
              {r.orderTypes.length === 0 ? <p className="text-muted text-sm">—</p> : r.orderTypes.map((x) => (
                <div key={x.type} className="flex justify-between text-sm py-1 border-b border-brand-gold/10 last:border-0">
                  <span className="text-cream">{x.type} ({x.count})</span><span className="font-mono text-brand-gold">{money(x.amount)}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="text-cream font-semibold mb-2">{t('bestSellers')}</h3>
              {r.items.length === 0 ? <p className="text-muted text-sm">—</p> : r.items.slice(0, 6).map((x) => (
                <div key={x.name} className="flex justify-between text-sm py-1 border-b border-brand-gold/10 last:border-0">
                  <span className="text-cream">{x.qty} × {x.name}</span><span className="font-mono text-brand-gold">{money(x.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <DayEndSettlement date={date} onSummary={setDrawer} />
    </div>
  )
}
