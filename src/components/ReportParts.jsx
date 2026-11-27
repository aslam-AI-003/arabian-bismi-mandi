import { useState } from 'react'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Loader2, RefreshCw, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

// Shared pieces for the Reports tabs.
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const SCREEN_ROWS = 100

export const PRESETS = [
  ['today', 'periodToday'], ['yesterday', 'yesterday'], ['week', 'periodWeek'], ['lastweek', 'lastWeek'],
  ['month', 'periodMonth'], ['lastmonth', 'lastMonth'], ['custom', 'custom'],
]

export function Kpi({ label, value, color = 'text-cream', change, invert = false }) {
  const { t } = useLanguage()
  const good = change != null && (invert ? change <= 0 : change >= 0)
  return (
    <div className="rounded-xl border border-brand-gold/20 bg-gradient-to-br from-dark-secondary to-dark-primary p-4">
      <p className="text-muted text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-xl lg:text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
      {change != null && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${good ? 'text-green-400' : 'text-red-400'}`} title={t('vsPrevious')}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% <span className="text-muted">{t('vsPrevious')}</span>
        </p>
      )}
    </div>
  )
}

export function Section({ sheet, defaultOpen, children }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(defaultOpen)
  const shown = sheet.rows.slice(0, SCREEN_ROWS)
  return (
    <div className="card p-0 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-gold/5">
        <span className="flex items-center gap-2 text-cream font-semibold">
          {open ? <ChevronDown size={18} className="text-brand-gold" /> : <ChevronRight size={18} className="text-brand-gold" />}
          {sheet.title}
        </span>
        <span className="text-muted text-xs">{sheet.rows.length} {t('rows')}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children || (sheet.rows.length === 0 ? <p className="text-muted text-sm py-4 text-center">—</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wide border-b border-brand-gold/20">
                    {sheet.columns.map((c) => (
                      <th key={c.key} className={`py-2 px-2 ${c.money || c.num || c.pct ? 'text-right' : 'text-left'}`}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r, i) => (
                    <tr key={i} className={`border-b border-brand-gold/10 last:border-0 ${r._bold ? 'font-semibold text-brand-gold' : ''}`}>
                      {sheet.columns.map((c) => (
                        <td key={c.key} className={`py-2 px-2 ${c.money || c.num || c.pct ? 'text-right font-mono' : ''} ${c.className ? c.className(r) : ''} ${r._bold ? '' : c.money ? 'text-cream' : 'text-cream/90'}`}>
                          {c.money ? (r[c.key] == null ? '—' : money(r[c.key])) : c.pct ? (r[c.key] == null ? '—' : `${r[c.key]}%`) : r[c.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sheet.rows.length > SCREEN_ROWS && (
                <p className="text-muted text-xs mt-2">{t('showingFirst')} {SCREEN_ROWS} / {sheet.rows.length} · {t('exportForAll')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export function PeriodPicker({ preset, onPreset, from, to, setFrom, setTo, onRun, busy, max, range }) {
  const { t } = useLanguage()
  return (
    <div className="card space-y-3">
      <div className="flex rounded-full bg-dark-primary/60 border border-brand-gold/20 p-1 overflow-x-auto w-fit max-w-full">
        {PRESETS.map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => onPreset(id)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${preset === id ? 'bg-brand-gold text-dark-primary font-semibold' : 'text-cream hover:text-brand-gold'}`}
          >
            {t(key)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-muted text-xs block mb-1">{t('from')}</label>
          <input type="date" className="input py-2" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-muted text-xs block mb-1">{t('to')}</label>
          <input type="date" className="input py-2" value={to} min={from} max={max} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" onClick={onRun} disabled={busy} className="px-5 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} {t('runReport')}
        </button>
        <span className="text-muted text-sm ml-auto">{range}</span>
      </div>
    </div>
  )
}

export function ExportButtons({ disabled, onExport, children }) {
  const { t } = useLanguage()
  const cls = 'px-4 py-2 rounded-lg bg-dark-secondary border border-brand-gold/20 text-cream hover:border-brand-gold text-sm flex items-center gap-2 disabled:opacity-50'
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 -mt-2">
      {children}
      <button type="button" disabled={disabled} onClick={() => onExport('csv')} className={cls}><FileText size={16} /> {t('exportCsv')}</button>
      <button type="button" disabled={disabled} onClick={() => onExport('xlsx')} className={cls}><FileSpreadsheet size={16} /> {t('exportExcel')}</button>
      <button type="button" disabled={disabled} onClick={() => onExport('pdf')} className="px-4 py-2 rounded-lg bg-brand-gold text-dark-primary font-semibold hover:bg-brand-gold-light text-sm flex items-center gap-2 disabled:opacity-50">
        <Download size={16} /> {t('exportPdf')}
      </button>
    </div>
  )
}
