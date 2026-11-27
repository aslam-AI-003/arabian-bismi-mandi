import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Loader2, AlertTriangle, CheckCircle2, IndianRupee, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAppSettings } from '../context/SettingsContext'
import {
  getProfitOrders, getItemCosts, getExpenses, getPrivateSettings, savePrivateSettings, getMenuForCosts, getSoldItemIds,
} from '../lib/supabase'
import { buildProfit, DEFAULT_FOOD_CATEGORIES } from '../lib/profitStats'
import { presetRange } from '../lib/reportStats'
import { startOfDay, endOfDay, addDays } from '../lib/dashboardStats'
import { dbErrorMessage } from '../lib/billing'
import { exportCsv, exportXlsx, exportPdf } from '../lib/exporters'
import { Kpi, Section, PeriodPicker, ExportButtons } from './ReportParts'

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const iso = (d) => format(d, 'yyyy-MM-dd')
const marginColor = (r) => (r.margin == null ? 'text-muted' : r.margin >= 50 ? 'text-green-400' : r.margin >= 30 ? 'text-yellow-400' : 'text-red-400')

function parseList(v, fallback) {
  try { const x = JSON.parse(v); return Array.isArray(x) ? x : fallback } catch { return fallback }
}

/**
 * Item profit / food cost. Expected food cost comes from the cost prices
 * on each bill line; actual food cost comes from Expenses in the chosen
 * food categories. The gap shows wastage, wrong costs or missing stock.
 */
export default function ProfitReport() {
  const { t, language } = useLanguage()
  const { expenseCategories } = useAppSettings()
  const navigate = useNavigate()
  const [preset, setPreset] = useState('month')
  const [from, setFrom] = useState(() => iso(presetRange('month')[0]))
  const [to, setTo] = useState(iso(new Date()))
  const [data, setData] = useState(null)
  const [foodCats, setFoodCats] = useState(DEFAULT_FOOD_CATEGORIES)
  const [catsDirty, setCatsDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (f = from, tt = to) => {
    setBusy(true)
    setError('')
    const start = startOfDay(new Date(`${f}T00:00:00`))
    const end = endOfDay(new Date(`${tt}T00:00:00`))
    const last30 = addDays(startOfDay(), -29)
    const [o, c, e, ps, m, sold] = await Promise.all([
      getProfitOrders(start.toISOString(), end.toISOString()),
      getItemCosts(),
      getExpenses(f, tt),
      getPrivateSettings(),
      getMenuForCosts(),
      getSoldItemIds(last30.toISOString(), endOfDay().toISOString()),
    ])
    const err = o.error || c.error || e.error || m.error || sold.error
    if (err) setError(dbErrorMessage(err, language))
    else {
      if (!ps.error && ps.data.food_cost_categories) setFoodCats(parseList(ps.data.food_cost_categories, DEFAULT_FOOD_CATEGORIES))
      setCatsDirty(false)
      setData({
        orders: o.data,
        costOf: c.data,
        expenses: e.data || [],
        menu: m.data.map((x) => ({ id: x.id, name: x.name, variant: x.variant, is_available: x.is_available, category: x.categories?.name || '' })),
        soldLast30: sold.data,
      })
    }
    setBusy(false)
  }, [from, to, language])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (id) => {
    setPreset(id)
    if (id === 'custom') return
    const [a, b] = presetRange(id)
    setFrom(iso(a))
    setTo(iso(b))
    load(iso(a), iso(b))
  }

  const p = useMemo(() => (data ? buildProfit({ ...data, foodCategories: foodCats }) : null), [data, foodCats])

  const toggleCat = (c) => {
    setFoodCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))
    setCatsDirty(true)
  }
  const saveCats = async () => {
    const { error: err } = await savePrivateSettings({ food_cost_categories: JSON.stringify(foodCats) })
    if (err) toast.error(dbErrorMessage(err, language))
    else { toast.success('✓'); setCatsDirty(false) }
  }

  const buildSheets = useCallback((lang) => {
    if (!p) return []
    const L = (en, ta) => (lang === 'ta' ? ta : en)
    const m = (key, label) => ({ key, label, money: true })
    const n = (key, label) => ({ key, label, num: true })
    const pc = (key, label, className) => ({ key, label, pct: true, className })
    const c = (key, label) => ({ key, label })
    const itemCols = [c('name', L('Item', 'பொருள்')), n('qty', L('Sold', 'விற்றது')), m('sales', L('Sales', 'விற்பனை')), m('cost', L('Cost', 'அடக்கம்')), m('profit', L('Profit', 'லாபம்')), pc('margin', L('Profit %', 'லாபம் %'), marginColor)]
    return [
      {
        name: 'Summary', title: t('secSummary'), open: true,
        columns: [c('k', L('Item', 'விவரம்')), c('v', L('Value', 'மதிப்பு'))],
        rows: [
          { k: L('Item sales (after discounts)', 'பொருள் விற்பனை (தள்ளுபடி பின்)'), v: money(p.itemSales) },
          { k: L('Sales with cost price set', 'அடக்க விலை உள்ள விற்பனை'), v: `${money(p.costedSales)} (${p.coveragePct ?? 0}%)` },
          { k: L('Food cost (from cost prices)', 'உணவு அடக்கம் (அடக்க விலையிலிருந்து)'), v: money(p.foodCost) },
          { k: L('Gross profit', 'மொத்த லாபம்'), v: money(p.grossProfit), _bold: true },
          { k: L('Food cost %', 'உணவு அடக்கம் %'), v: p.foodCostPct == null ? '—' : `${p.foodCostPct}%` },
          { k: L('Actual food purchases (Expenses)', 'உண்மையான உணவு வாங்கியது (செலவுகள்)'), v: money(p.actualFoodCost) },
          { k: L('Difference (actual - expected)', 'வித்தியாசம் (உண்மை - எதிர்பார்ப்பு)'), v: money(p.difference), _bold: true },
        ],
      },
      { name: 'Item profit', title: t('secItemProfit'), open: true, columns: itemCols, rows: p.items },
      { name: 'Low profit best sellers', title: t('secLowMargin'), open: true, columns: itemCols, rows: p.lowMargin },
      { name: 'Cost not set', title: t('secMissingCost'), columns: [c('name', L('Item', 'பொருள்')), n('qty', L('Sold', 'விற்றது')), m('sales', L('Sales', 'விற்பனை'))], rows: p.missingCost },
      { name: 'Not sold in 30 days', title: t('secNotSold'), columns: [c('category', L('Category', 'வகை')), c('name', L('Item', 'பொருள்'))], rows: p.notSold },
    ]
  }, [p, t])
  const sheets = useMemo(() => buildSheets(language), [buildSheets, language])

  const range = from === to ? format(new Date(`${from}T00:00:00`), 'dd MMM yyyy') : `${format(new Date(`${from}T00:00:00`), 'dd MMM yyyy')} – ${format(new Date(`${to}T00:00:00`), 'dd MMM yyyy')}`
  const doExport = async (kind) => {
    const filename = `bismi-profit-${from}_to_${to}`
    const clean = buildSheets('en').map(({ name, columns, rows }) => ({
      name,
      columns: columns.map(({ className: _c, ...col }) => col),
      rows: rows.map(({ _bold, ...x }) => x),
    }))
    try {
      if (kind === 'csv') exportCsv(clean, filename)
      else if (kind === 'xlsx') await exportXlsx(clean, filename)
      else await exportPdf(clean, filename, { title: 'Arabian Bismi Mandi – Item profit', subtitle: range })
    } catch (e) { toast.error(e?.message || 'Export failed') }
  }

  const diff = p?.difference || 0

  return (
    <div className="space-y-5">
      <ExportButtons disabled={!p} onExport={doExport}>
        <button type="button" onClick={() => navigate('/menu?costs=1')} className="px-4 py-2 rounded-lg bg-dark-secondary border border-brand-gold/20 text-cream hover:border-brand-gold text-sm flex items-center gap-2">
          <IndianRupee size={16} /> {t('costPrices')}
        </button>
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
      {busy && !p && <div className="flex justify-center py-16"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>}

      {p && (
        <div className={`space-y-5 ${busy ? 'opacity-60' : ''}`}>
          {p.itemSales > 0 && (p.coveragePct ?? 0) < 100 && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 text-sm">
              <AlertTriangle size={18} className="shrink-0" />
              <span className="flex-1">{t('coverageWarn').replace('{pct}', String(p.coveragePct ?? 0)).replace('{n}', String(p.missingCost.length))}</span>
              <button type="button" onClick={() => navigate('/menu?costs=1')} className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 text-xs font-semibold">{t('costPrices')}</button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label={t('itemSales')} value={money(p.itemSales)} color="text-brand-gold" />
            <Kpi label={t('foodCost')} value={money(p.foodCost)} color="text-red-300" />
            <Kpi label={t('grossProfit')} value={money(p.grossProfit)} color={p.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'} />
            <Kpi label={t('foodCostPct')} value={p.foodCostPct == null ? '—' : `${p.foodCostPct}%`} />
            <Kpi label={t('avgProfitPct')} value={p.avgMargin == null ? '—' : `${p.avgMargin}%`} />
          </div>

          {/* Expected vs actual food cost */}
          <div className="card space-y-4">
            <h2 className="text-lg font-semibold text-cream">{t('expectedVsActual')}</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-brand-gold/20 p-3">
                <p className="text-muted text-xs uppercase">{t('expectedFoodCost')}</p>
                <p className="text-xl font-bold font-mono text-cream">{money(p.expectedFoodCost)}</p>
                <p className="text-muted text-xs mt-1">{t('expectedHelp')}</p>
              </div>
              <div className="rounded-lg border border-brand-gold/20 p-3">
                <p className="text-muted text-xs uppercase">{t('actualFoodCost')}</p>
                <p className="text-xl font-bold font-mono text-cream">{money(p.actualFoodCost)}</p>
                <p className="text-muted text-xs mt-1">{t('actualHelp')}{p.actualFoodCostPct != null && p.hasActual ? ` · ${p.actualFoodCostPct}% ${t('ofSales')}` : ''}</p>
              </div>
              <div className={`rounded-lg border p-3 ${!p.hasActual ? 'border-brand-gold/20' : diff > 0 ? 'border-red-500/50 bg-red-500/10' : 'border-green-500/40 bg-green-500/10'}`}>
                <p className="text-muted text-xs uppercase">{t('difference')}</p>
                <p className={`text-xl font-bold font-mono ${!p.hasActual ? 'text-muted' : diff > 0 ? 'text-red-400' : 'text-green-400'}`}>{p.hasActual ? money(diff) : '—'}</p>
                <p className="text-xs mt-1 flex items-start gap-1 text-cream/80">
                  {!p.hasActual ? t('noActualHelp')
                    : diff > 0 ? <><AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" /> {t('diffMore')}</>
                      : <><CheckCircle2 size={14} className="text-green-400 shrink-0 mt-0.5" /> {t('diffOk')}</>}
                </p>
              </div>
            </div>
            <div>
              <p className="text-muted text-xs mb-2">{t('foodCategoriesHelp')}</p>
              <div className="flex flex-wrap gap-2 items-center">
                {[...new Set([...expenseCategories, ...foodCats])].map((c) => {
                  const on = foodCats.includes(c)
                  return (
                    <button key={c} type="button" onClick={() => toggleCat(c)} className={`px-3 py-1 rounded-full text-xs ${on ? 'bg-brand-gold text-dark-primary font-semibold' : 'bg-dark-secondary text-cream'}`}>
                      {on ? '✓ ' : ''}{c}
                    </button>
                  )
                })}
                {catsDirty && (
                  <button type="button" onClick={saveCats} className="px-3 py-1 rounded-full text-xs bg-green-700 text-white flex items-center gap-1"><Save size={12} /> {t('save')}</button>
                )}
              </div>
            </div>
          </div>

          <p className="text-muted text-xs">{t('profitNote')}</p>

          <div className="space-y-3">
            {sheets.map((sh) => <Section key={sh.name} sheet={sh} defaultOpen={!!sh.open} />)}
          </div>
        </div>
      )}
    </div>
  )
}
