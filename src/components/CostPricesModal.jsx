import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Wand2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from './Modal'
import { useLanguage } from '../context/LanguageContext'
import { getMenuForCosts, getItemCosts, saveItemCosts } from '../lib/supabase'
import { suggestCosts } from '../lib/costSuggest'
import { dbErrorMessage } from '../lib/billing'

const marginClass = (m) => (m == null ? 'text-muted' : m >= 50 ? 'text-green-400' : m >= 30 ? 'text-yellow-400' : 'text-red-400')

/**
 * All menu items in one list, grouped by category: type the cost of one
 * plate next to its selling price. Only changed rows are saved.
 */
export default function CostPricesModal({ onClose }) {
  const { t, language } = useLanguage()
  const [items, setItems] = useState(null)
  const [saved, setSaved] = useState({})
  const [costs, setCosts] = useState({})
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getMenuForCosts(), getItemCosts()]).then(([m, c]) => {
      if (m.error || c.error) { toast.error(dbErrorMessage(m.error || c.error, language)); return }
      const map = Object.fromEntries(m.data.map((i) => [i.id, c.data.has(i.id) ? String(c.data.get(i.id)) : '']))
      setSaved(map)
      setCosts(map)
      setItems(m.data)
    })
  }, [language])

  const suggestions = useMemo(() => (items ? suggestCosts(items, costs) : new Map()), [items, costs])
  const changed = items ? items.filter((i) => (costs[i.id] ?? '') !== (saved[i.id] ?? '')) : []
  const withCost = items ? items.filter((i) => costs[i.id] !== '' && costs[i.id] != null).length : 0

  const groups = useMemo(() => {
    if (!items) return []
    const s = q.trim().toLowerCase()
    const m = new Map()
    for (const it of items) {
      if (s && !`${it.name} ${it.variant || ''} ${it.categories?.name || ''}`.toLowerCase().includes(s)) continue
      const k = it.categories?.name || 'Other'
      if (!m.has(k)) m.set(k, { name: k, order: it.categories?.display_order ?? 999, items: [] })
      m.get(k).items.push(it)
    }
    return [...m.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  }, [items, q])

  const fillSuggestions = () => {
    setCosts((c) => {
      const next = { ...c }
      suggestions.forEach((v, id) => { next[id] = String(v) })
      return next
    })
    toast.success(`${suggestions.size} ✓`)
  }

  const save = async () => {
    const bad = changed.find((i) => costs[i.id] !== '' && !(Number(costs[i.id]) >= 0))
    if (bad) { toast.error(`${bad.name}: ${t('costPrice')}?`); return }
    setBusy(true)
    const { error } = await saveItemCosts(changed.map((i) => ({ menu_item_id: i.id, cost_price: costs[i.id] === '' ? null : Math.round(Number(costs[i.id]) * 100) / 100 })))
    setBusy(false)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    toast.success(language === 'ta' ? 'அடக்க விலைகள் சேமிக்கப்பட்டன' : 'Cost prices saved')
    setSaved({ ...costs })
  }

  return (
    <Modal
      wide
      title={t('costPrices')}
      onClose={busy ? undefined : onClose}
      footer={(
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted text-sm">{withCost} / {items?.length ?? 0} {t('itemsHaveCost')}</span>
          <button type="button" onClick={save} disabled={busy || changed.length === 0} className="btn-primary ml-auto flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} {t('save')} ({changed.length})
          </button>
        </div>
      )}
    >
      {!items ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-gold" /></div>
      ) : (
        <div className="space-y-3">
          <p className="text-muted text-sm">{t('costPricesHelp')}</p>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input className="input-search" style={{ paddingLeft: '2.25rem' }} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {suggestions.size > 0 && (
              <button type="button" onClick={fillSuggestions} className="px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-sm flex items-center gap-2">
                <Wand2 size={16} /> {t('fillSuggested')} ({suggestions.size})
              </button>
            )}
          </div>
          {groups.map((g) => (
            <div key={g.name}>
              <p className="text-brand-gold text-sm font-semibold mt-2 mb-1">{g.name}</p>
              <div className="rounded-lg border border-brand-gold/15 divide-y divide-brand-gold/10">
                {g.items.map((it) => {
                  const price = Number(it.price)
                  const c = costs[it.id]
                  const has = c !== '' && c != null
                  const margin = has && price > 0 ? Math.round(((price - Number(c)) / price) * 1000) / 10 : null
                  const sug = suggestions.get(it.id)
                  return (
                    <div key={it.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex-1 text-cream text-sm">
                        {it.name}{it.variant ? <span className="text-muted"> ({it.variant})</span> : null}
                        {it.is_available === false && <span className="text-muted text-xs"> · off</span>}
                      </span>
                      <span className="w-20 text-right font-mono text-muted text-sm">₹{price.toFixed(0)}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        value={c ?? ''}
                        placeholder={sug != null ? String(sug) : t('costPrice')}
                        onChange={(e) => setCosts((x) => ({ ...x, [it.id]: e.target.value }))}
                        className={`input py-1.5 px-2 w-24 text-right font-mono text-sm ${(c ?? '') !== (saved[it.id] ?? '') ? 'border-brand-gold' : ''}`}
                        aria-label={`${t('costPrice')} ${it.name} ${it.variant || ''}`}
                      />
                      <span className={`w-14 text-right text-xs font-mono ${marginClass(margin)}`}>{margin == null ? '—' : `${margin}%`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
