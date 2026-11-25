import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Loader2, RefreshCw } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import toast from 'react-hot-toast'
import { getOrdersForTab, subscribeToOrders, supabase } from '../lib/supabase'
import { balanceDue, dbErrorMessage } from '../lib/billing'
import { useLanguage } from '../context/LanguageContext'
import OrderDetail, { StatusBadges } from '../components/OrderDetail'
import TodaySummary from '../components/TodaySummary'

// SIP N' GOSSIP style: no kitchen steps. An order is Active until it is
// fully paid, then it becomes Completed by itself.
const TABS = [
  { id: 'active', key: 'activeTab' },
  { id: 'pending', key: 'pendingPayment' },
  { id: 'completed', key: 'completedTab' },
  { id: 'cancelled', key: 'cancelledTab' },
]

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const today = () => format(new Date(), 'yyyy-MM-dd')
const TYPE_KEY = { DINE_IN: 'dineIn', TAKEAWAY: 'takeaway', DELIVERY: 'delivery' }

export default function Orders() {
  const { t } = useLanguage()
  const [tab, setTab] = useState('active')
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { language } = useLanguage()

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    const { data, error } = await getOrdersForTab(
      tab,
      startOfDay(new Date(`${from}T00:00:00`)).toISOString(),
      endOfDay(new Date(`${to}T00:00:00`)).toISOString(),
    )
    if (error) toast.error(dbErrorMessage(error, language))
    else setRows(data || [])
    setLoading(false)
    setRefreshKey((k) => k + 1)
  }, [tab, from, to, language])

  useEffect(() => {
    load()
    // Live updates from other devices
    const channel = subscribeToOrders(() => load(false))
    return () => { supabase.removeChannel(channel) }
  }, [load])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((o) => [o.order_number, o.customer_name, o.customer_phone, o.table_number]
      .some((v) => v && String(v).toLowerCase().includes(s)))
  }, [rows, q])

  const total = filtered.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const due = filtered.reduce((s, o) => s + balanceDue(o), 0)
  const dated = tab === 'completed' || tab === 'cancelled'

  return (
    <div className="space-y-4">
      {/* Today at a glance */}
      <TodaySummary refreshKey={refreshKey} />

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-dark-secondary/60 border border-brand-gold/20 p-1 overflow-x-auto">
          {TABS.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                tab === x.id ? 'bg-brand-gold text-dark-primary font-semibold' : 'text-cream hover:text-brand-gold'
              }`}
            >
              {t(x.key)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input className="input-search" style={{ paddingLeft: "2.5rem" }} placeholder={t('searchOrders')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="button" onClick={() => load()} className="p-2 rounded-full text-muted hover:text-brand-gold" title={t('refresh')} aria-label={t('refresh')}>
          <RefreshCw size={18} />
        </button>
      </div>

      {dated && (
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-muted text-xs block mb-1">{t('from')}</label>
            <input type="date" className="input py-2" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-muted text-xs block mb-1">{t('to')}</label>
            <input type="date" className="input py-2" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap gap-5 text-sm">
        <span className="text-muted">{filtered.length} {t('ordersCount')}</span>
        {tab !== 'cancelled' && <span className="text-cream">{t('total')} <b className="font-mono">{money(total)}</b></span>}
        {(tab === 'active' || tab === 'pending') && <span className="text-cream">{t('unpaidTotal')} <b className="font-mono text-yellow-400">{money(due)}</b></span>}
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-gold" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-muted text-center py-12">{t('noOrders')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-brand-gold/20 bg-dark-primary/40">
                  <th className="px-4 py-3">{language === 'ta' ? 'ஆர்டர்' : 'Order'}</th>
                  <th className="px-4 py-3 hidden sm:table-cell">{t('type')}</th>
                  <th className="px-4 py-3 hidden sm:table-cell">{t('time')}</th>
                  <th className="px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3 text-right">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpen(o)}
                    className="border-b border-brand-gold/10 last:border-0 cursor-pointer hover:bg-brand-gold/5"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-gold">{o.order_number}</span>
                      <span className="block text-muted text-xs">
                        {[o.table_number && `${t('table')} ${o.table_number}`, o.customer_name, o.customer_phone].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-cream">{t(TYPE_KEY[o.order_type] || 'takeaway')}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted" title={format(new Date(o.created_at), 'dd MMM yyyy, hh:mm a')}>
                      {format(new Date(o.created_at), dated && from !== to ? 'dd MMM, hh:mm a' : 'hh:mm a')}
                    </td>
                    <td className="px-4 py-3"><StatusBadges order={o} /></td>
                    <td className="px-4 py-3 text-right">
                      <b className="font-mono text-cream">{money(o.total_amount)}</b>
                      {balanceDue(o) > 0 && <span className="block text-yellow-400 text-xs font-mono">{t('balance')} {money(balanceDue(o))}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <OrderDetail initial={open} onClose={() => setOpen(null)} onChanged={() => load(false)} />}
    </div>
  )
}
