import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, Pencil, Trash2, Calendar } from 'lucide-react'
import { format, startOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAppSettings } from '../context/SettingsContext'
import { useConnection } from '../context/ConnectionContext'
import { getExpenses, saveExpense, deleteExpense } from '../lib/supabase'
import { dbErrorMessage, sumAmounts } from '../lib/billing'
import Modal from '../components/Modal'

const METHODS = ['CASH', 'UPI', 'CARD', 'BANK']
const today = () => format(new Date(), 'yyyy-MM-dd')

export default function Expenses() {
  const { t, language } = useLanguage()
  const { expenseCategories } = useAppSettings()
  const { online } = useConnection()
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(today())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await getExpenses(from, to)
    if (error) toast.error(dbErrorMessage(error, language))
    else setRows(data || [])
    setLoading(false)
  }, [from, to, language])

  useEffect(() => { load() }, [load])

  const openNew = () => setEditing({
    expense_date: today(), name: '', category: expenseCategories[0] || 'Other', amount: '', payment_method: 'CASH', description: '',
  })

  const save = async () => {
    const amount = Number(editing.amount)
    if (!editing.name.trim()) { toast.error(t('expenseName')); return }
    if (!(amount > 0)) { toast.error(t('amount')); return }
    setSaving(true)
    const { error } = await saveExpense({
      ...(editing.id ? { id: editing.id } : {}),
      expense_date: editing.expense_date,
      name: editing.name.trim().slice(0, 150),
      category: editing.category,
      amount: Math.round(amount * 100) / 100,
      payment_method: editing.payment_method,
      description: editing.description?.trim() || null,
    })
    setSaving(false)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    toast.success('✓')
    setEditing(null)
    load()
  }

  const remove = async (row) => {
    if (!window.confirm(`${t('delete')} "${row.name}" ₹${row.amount}?`)) return
    const { error } = await deleteExpense(row.id)
    if (error) toast.error(dbErrorMessage(error, language))
    load()
  }

  const shown = filterCat ? rows.filter((r) => r.category === filterCat) : rows
  const total = sumAmounts(shown)
  const byCat = Object.entries(rows.reduce((m, r) => ({ ...m, [r.category]: (m[r.category] || 0) + Number(r.amount) }), {}))
    .sort((a, b) => b[1] - a[1])
  const set = (k) => (e) => setEditing((x) => ({ ...x, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-cream">{t('expenses')}</h1>
        <button onClick={openNew} disabled={!online} className="btn-primary py-2 px-4 flex items-center gap-2 disabled:opacity-50">
          <Plus size={18} /> {t('addExpense')}
        </button>
      </div>

      <div className="card flex flex-wrap gap-3 items-center">
        <Calendar className="text-brand-gold" size={20} />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input max-w-[160px]" />
        <span className="text-muted">{language === 'ta' ? 'முதல்' : 'to'}</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input max-w-[160px]" />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input max-w-[200px]">
          <option value="">{language === 'ta' ? 'எல்லா வகைகளும்' : 'All categories'}</option>
          {expenseCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="ml-auto text-right">
          <p className="text-muted text-xs">{t('totalExpenses')}</p>
          <p className="text-2xl font-bold text-red-400 font-mono">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {byCat.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {byCat.map(([c, v]) => (
            <button key={c} onClick={() => setFilterCat(filterCat === c ? '' : c)} className={`px-3 py-1 rounded-full text-xs ${filterCat === c ? 'bg-brand-gold text-dark-primary' : 'bg-dark-secondary text-cream'}`}>
              {c}: ₹{v.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-10 h-10 animate-spin text-brand-gold" /></div>
      ) : shown.length === 0 ? (
        <div className="card p-12 text-center text-muted">{t('noExpenses')}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-brand-gold/20">
                <th className="py-2">{t('date')}</th>
                <th className="py-2">{t('expenseName')}</th>
                <th className="py-2">{t('category')}</th>
                <th className="py-2">{t('paymentMode')}</th>
                <th className="py-2 text-right">{t('amount')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-brand-gold/10 last:border-0">
                  <td className="py-2 text-muted whitespace-nowrap">{format(new Date(`${r.expense_date}T00:00:00`), 'dd MMM')}</td>
                  <td className="py-2 text-cream">
                    {r.name}
                    {r.description && <span className="block text-muted text-xs">{r.description}</span>}
                  </td>
                  <td className="py-2 text-cream">{r.category}</td>
                  <td className="py-2 text-muted">{r.payment_method}</td>
                  <td className="py-2 text-right font-mono text-red-300">₹{Number(r.amount).toFixed(2)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditing({ ...r, amount: String(r.amount), description: r.description || '' })} className="p-1 text-muted hover:text-brand-gold" aria-label={t('edit')}><Pencil size={16} /></button>
                    <button onClick={() => remove(r)} className="p-1 text-muted hover:text-red-400" aria-label={t('delete')}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? t('editExpense') : t('addExpense')}
          onClose={() => setEditing(null)}
          footer={(
            <button onClick={save} disabled={saving || !online} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="animate-spin" size={18} />} {t('save')}
            </button>
          )}
        >
          <div className="space-y-3">
            <div>
              <label className="text-muted text-sm mb-1 block">{t('expenseName')} *</label>
              <input className="input" value={editing.name} onChange={set('name')} maxLength={150} placeholder={language === 'ta' ? 'எ.கா. கேஸ் சிலிண்டர்' : 'e.g. Gas cylinder'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-sm mb-1 block">{t('amount')} (₹) *</label>
                <input type="number" min="0" step="0.01" inputMode="decimal" className="input font-mono" value={editing.amount} onChange={set('amount')} />
              </div>
              <div>
                <label className="text-muted text-sm mb-1 block">{t('date')}</label>
                <input type="date" className="input" value={editing.expense_date} onChange={set('expense_date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted text-sm mb-1 block">{t('category')}</label>
                <select className="input" value={editing.category} onChange={set('category')}>
                  {[...new Set([...expenseCategories, editing.category])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-muted text-sm mb-1 block">{t('paymentMode')}</label>
                <select className="input" value={editing.payment_method} onChange={set('payment_method')}>
                  {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-muted text-sm mb-1 block">{t('description')}</label>
              <textarea className="input" rows={2} value={editing.description} onChange={set('description')} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
