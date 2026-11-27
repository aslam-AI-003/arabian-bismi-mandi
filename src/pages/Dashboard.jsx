import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area,
} from 'recharts'
import {
  supabase, subscribeToOrders, getDashboardOrders, getTrendOrders, getDashboardPayments,
  getExpenses, getPendingBalanceOrders, getOpenOrderCount, getMenuCategoryMap,
} from '../lib/supabase'
import { balanceDue, dbErrorMessage } from '../lib/billing'
import {
  series, summarizeDashboard, startOfDay, endOfDay, startOfWeek, startOfMonth, addDays,
} from '../lib/dashboardStats'
import { useLanguage } from '../context/LanguageContext'
import OrderDetail, { StatusBadges } from '../components/OrderDetail'

// SIP N' GOSSIP style dashboard in the Bismi colours.
const PERIODS = {
  today: { label: 'periodToday', sales: 'salesToday', from: () => startOfDay() },
  week: { label: 'periodWeek', sales: 'salesWeek', from: () => startOfWeek() },
  month: { label: 'periodMonth', sales: 'salesMonth', from: () => startOfMonth() },
}
const TRENDS = {
  day: { label: 'trendDaily', from: () => addDays(startOfDay(), -29) },
  week: { label: 'trendWeekly', from: () => addDays(startOfWeek(), -7 * 11) },
  month: { label: 'trendMonthly', from: () => { const d = startOfMonth(); d.setMonth(d.getMonth() - 11); return d } },
}
const TYPE_KEY = { DINE_IN: 'dineIn', TAKEAWAY: 'takeaway', DELIVERY: 'delivery' }
const GOLD = '#D4A44C'
const tip = {
  contentStyle: { background: '#2D1515', border: '1px solid rgba(212,164,76,0.3)', borderRadius: 8, color: '#FFF8E7' },
  labelStyle: { color: GOLD },
}
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const iso = (d) => format(d, 'yyyy-MM-dd')

function Seg({ options, value, onChange }) {
  const { t } = useLanguage()
  return (
    <div className="flex rounded-full bg-dark-secondary/60 border border-brand-gold/20 p-1 overflow-x-auto">
      {Object.entries(options).map(([k, v]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
            value === k ? 'bg-brand-gold text-dark-primary font-semibold' : 'text-cream hover:text-brand-gold'
          }`}
        >
          {t(v.label)}
        </button>
      ))}
    </div>
  )
}

function Kpi({ label, value, color = 'text-cream' }) {
  return (
    <div className="rounded-xl border border-brand-gold/20 bg-gradient-to-br from-dark-secondary to-dark-primary p-4">
      <p className="text-muted text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-xl lg:text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function Card({ title, right, children }) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-cream">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { t, language } = useLanguage()
  const [period, setPeriod] = useState('today')
  const [trend, setTrend] = useState('day')
  const [data, setData] = useState(null)
  const [trendData, setTrendData] = useState(null)
  const [trendBusy, setTrendBusy] = useState(false)
  const [pendingAll, setPendingAll] = useState([])
  const [activeCount, setActiveCount] = useState(0)
  const [categoryOf, setCategoryOf] = useState(new Map())
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const timer = useRef(null)

  const loadPeriod = useCallback(async () => {
    const from = PERIODS[period].from()
    const to = endOfDay()
    const [o, p, e, pend, cnt] = await Promise.all([
      getDashboardOrders(from.toISOString(), to.toISOString()),
      getDashboardPayments(from.toISOString(), to.toISOString()),
      getExpenses(iso(from), iso(to)),
      getPendingBalanceOrders(),
      getOpenOrderCount(),
    ])
    const err = o.error || p.error || e.error || pend.error || cnt.error
    if (err) { setError(dbErrorMessage(err, language)); return }
    setError('')
    setData({ orders: o.data, ledger: p.data, expenses: e.data || [] })
    setPendingAll(pend.data || [])
    setActiveCount(cnt.count)
  }, [period, language])

  const loadTrend = useCallback(async () => {
    setTrendBusy(true)
    const from = TRENDS[trend].from()
    const to = endOfDay()
    const { data: rows, error: err } = await getTrendOrders(from.toISOString(), to.toISOString())
    if (err) setError(dbErrorMessage(err, language))
    else setTrendData(series(rows, trend, from, to))
    setTrendBusy(false)
  }, [trend, language])

  useEffect(() => { setData(null); loadPeriod() }, [loadPeriod])
  useEffect(() => { loadTrend() }, [loadTrend])
  useEffect(() => { getMenuCategoryMap().then(({ data: m }) => setCategoryOf(m)) }, [])

  // Live: refresh a moment after any order changes on any device.
  useEffect(() => {
    const channel = subscribeToOrders(() => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => { loadPeriod(); loadTrend() }, 1500)
    })
    return () => { clearTimeout(timer.current); supabase.removeChannel(channel) }
  }, [loadPeriod, loadTrend])

  const s = useMemo(() => (data ? summarizeDashboard({ ...data, categoryOf }) : null), [data, categoryOf])
  const hourly = useMemo(
    () => (data && period === 'today' ? series(data.orders, 'hour').filter((h) => h.key >= 6 || h.sales > 0) : null),
    [data, period],
  )
  const recent = useMemo(() => (data ? [...data.orders].reverse().slice(0, 8) : []), [data])
  const pendingTotal = pendingAll.reduce((a, o) => a + balanceDue(o), 0)
  const axis = { stroke: '#B8A88A', fontSize: 11 }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-decorative text-brand-gold">{t('dashboard')}</h1>
        <Seg options={PERIODS} value={period} onChange={setPeriod} />
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-sm">{error}</div>}

      {!s ? (
        <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <Kpi label={t(PERIODS[period].sales)} value={money(s.revenue)} color="text-brand-gold" />
            <Kpi label={t('bills')} value={s.billCount} />
            <Kpi label={t('activeOrdersKpi')} value={activeCount} />
            <Kpi label={language === 'ta' ? 'பணம் (Cash)' : 'Cash'} value={money(s.collections.CASH)} />
            <Kpi label="UPI" value={money(s.collections.UPI)} />
            <Kpi label={language === 'ta' ? 'கார்டு' : 'Card'} value={money(s.collections.CARD)} />
            <Kpi label={t('pendingPaymentsAll')} value={money(pendingTotal)} color={pendingTotal > 0 ? 'text-red-400' : 'text-cream'} />
            <Kpi label={t('expenses')} value={money(s.expenses)} color="text-red-400" />
            <Kpi label={t('estimatedProfit')} value={money(s.estimatedProfit)} color={s.estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
          </div>
          <p className="text-muted text-xs -mt-2">{t('dashNote')}</p>

          {hourly && (
            <Card title={t('hourlySales')}>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,164,76,0.12)" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} width={56} />
                    <Tooltip {...tip} cursor={{ fill: 'rgba(212,164,76,0.08)' }} formatter={(v, n) => [n === 'sales' ? money(v) : v, n === 'sales' ? t('sales') : t('bills')]} />
                    <Bar dataKey="sales" fill={GOLD} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title={t('salesTrend')} right={<Seg options={TRENDS} value={trend} onChange={setTrend} />}>
            <div style={{ height: 260 }} className="relative">
              {trendBusy && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-gold" /></div>}
              {!trendBusy && trendData && (
                <ResponsiveContainer>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="bismiTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,164,76,0.12)" />
                    <XAxis dataKey="label" {...axis} />
                    <YAxis {...axis} width={60} />
                    <Tooltip {...tip} formatter={(v, n) => [n === 'sales' ? money(v) : v, n === 'sales' ? t('sales') : t('bills')]} />
                    <Area type="monotone" dataKey="sales" stroke="#E8C97A" fill="url(#bismiTrend)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title={t('bestSellers')}>
              {s.products.length === 0 ? <p className="text-muted text-center py-8">{t('noSalesYet')}</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted text-xs uppercase tracking-wide border-b border-brand-gold/20">
                      <th className="text-left py-2">{language === 'ta' ? 'பொருள்' : 'Item'}</th>
                      <th className="text-right py-2">{language === 'ta' ? 'அளவு' : 'Qty'}</th>
                      <th className="text-right py-2">{t('sales')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.products.slice(0, 10).map((p) => (
                      <tr key={p.name} className="border-b border-brand-gold/10 last:border-0">
                        <td className="py-2 text-cream">{p.name}</td>
                        <td className="py-2 text-right text-cream">{p.qty}</td>
                        <td className="py-2 text-right font-mono text-brand-gold">{money(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title={t('categorySales')}>
              {s.categories.length === 0 ? <p className="text-muted text-center py-8">{t('noSalesYet')}</p> : (
                <div style={{ height: Math.max(200, s.categories.slice(0, 12).length * 32) }}>
                  <ResponsiveContainer>
                    <BarChart data={s.categories.slice(0, 12)} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" {...axis} />
                      <YAxis type="category" dataKey="name" {...axis} width={130} />
                      <Tooltip {...tip} cursor={{ fill: 'rgba(212,164,76,0.08)' }} formatter={(v) => [money(v), t('sales')]} />
                      <Bar dataKey="amount" fill="#B8862E" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>

          <Card title={t('recentOrders')}>
            {recent.length === 0 ? <p className="text-muted text-center py-8">{t('noClosedOrders')}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted text-xs uppercase tracking-wide border-b border-brand-gold/20">
                      <th className="py-2">{t('bill')}</th>
                      <th className="py-2 hidden sm:table-cell">{t('type')}</th>
                      <th className="py-2 hidden sm:table-cell">{t('time')}</th>
                      <th className="py-2">{t('status')}</th>
                      <th className="py-2 text-right">{t('total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((o) => (
                      <tr key={o.id} onClick={() => setOpen(o)} className="border-b border-brand-gold/10 last:border-0 cursor-pointer hover:bg-brand-gold/5">
                        <td className="py-2.5 font-mono font-semibold text-brand-gold">{o.order_number}</td>
                        <td className="py-2.5 hidden sm:table-cell text-cream">{t(TYPE_KEY[o.order_type] || 'takeaway')}</td>
                        <td className="py-2.5 hidden sm:table-cell text-muted">{format(new Date(o.created_at), period === 'today' ? 'hh:mm a' : 'dd MMM, hh:mm a')}</td>
                        <td className="py-2.5"><StatusBadges order={o} /></td>
                        <td className="py-2.5 text-right font-mono text-cream">{money(o.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {open && <OrderDetail initial={open} onClose={() => setOpen(null)} onChanged={() => loadPeriod()} />}
    </div>
  )
}
