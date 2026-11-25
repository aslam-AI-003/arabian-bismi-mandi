import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, RefreshCw, Trash2, Unlock, Receipt as ReceiptIcon, PlusCircle, IndianRupee } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { useConnection } from '../context/ConnectionContext'
import {
  supabase, getTables, createTables, updateTable, deleteTable, subscribeToTables, getOrderById, addPayments,
} from '../lib/supabase'
import { balanceDue, dbErrorMessage } from '../lib/billing'
import PaymentModal from '../components/PaymentModal'
import ReceiptModal from '../components/ReceiptModal'
import Modal from '../components/Modal'

const isClosed = (o) => !o || o.order_status === 'CANCELLED' || (o.order_status === 'COMPLETED' && ['PAID', 'REFUNDED'].includes(o.payment_status))

export default function Tables() {
  const { t, language } = useLanguage()
  const { isAdmin } = useAuth()
  const { settings } = useAppSettings()
  const { online } = useConnection()
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // table with full order loaded
  const [collecting, setCollecting] = useState(null)
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addCount, setAddCount] = useState(1)
  const [addName, setAddName] = useState('')

  const fetchTables = useCallback(async () => {
    const { data, error } = await getTables(true)
    if (error) toast.error(dbErrorMessage(error, language))
    else setTables(data || [])
    setLoading(false)
  }, [language])

  useEffect(() => {
    fetchTables()
    const channel = subscribeToTables(() => fetchTables())
    const timer = setInterval(fetchTables, 20000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [fetchTables])

  const openTable = async (tb) => {
    if (!tb.is_active) {
      if (isAdmin && window.confirm(`${t('active')}: ${tb.name}?`)) {
        await updateTable(tb.id, { is_active: true })
        fetchTables()
      }
      return
    }
    if (isClosed(tb.active_order)) {
      navigate(`/pos?table=${tb.id}`)
      return
    }
    const { data, error } = await getOrderById(tb.active_order.id)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    setSelected({ table: tb, order: data })
  }

  const collect = async (rows) => {
    const { data, error } = await addPayments(collecting.id, rows)
    if (error) throw error
    toast.success(`${t('paidAmount')} ₹${rows.reduce((s, r) => s + r.amount, 0).toFixed(2)}`)
    setCollecting(null)
    setSelected((s) => (s ? { ...s, order: { ...s.order, ...data } } : s))
    fetchTables()
  }

  const release = async (tb) => {
    if (!window.confirm(`${t('releaseTable')} ${tb.name}?`)) return
    const { error } = await updateTable(tb.id, { active_order_id: null })
    if (error) toast.error(dbErrorMessage(error, language))
    setSelected(null)
    fetchTables()
  }

  const addTables = async () => {
    const existing = new Set(tables.map((x) => x.name.toLowerCase()))
    const maxOrder = tables.reduce((m, x) => Math.max(m, x.display_order || 0), 0)
    let rows = []
    if (addName.trim()) {
      rows = [{ name: addName.trim().slice(0, 30), display_order: maxOrder + 1 }]
    } else {
      let n = 1
      const count = Math.min(Math.max(parseInt(addCount, 10) || 0, 1), 50)
      while (rows.length < count) {
        if (!existing.has(`t${n}`)) rows.push({ name: `T${n}`, display_order: maxOrder + rows.length + 1 })
        n += 1
      }
    }
    if (rows.some((r) => existing.has(r.name.toLowerCase()))) { toast.error('Name already used'); return }
    const { error } = await createTables(rows)
    if (error) { toast.error(dbErrorMessage(error, language)); return }
    setShowAdd(false)
    setAddName('')
    fetchTables()
  }

  const removeTable = async (tb) => {
    if (!isClosed(tb.active_order)) { toast.error(t('occupied')); return }
    if (!window.confirm(`${t('delete')} ${tb.name}?`)) return
    const { error } = await deleteTable(tb.id)
    if (error) {
      // Tables used by past orders can't be removed; hide them instead.
      const { error: e2 } = await updateTable(tb.id, { is_active: false })
      if (e2) toast.error(dbErrorMessage(e2, language))
    }
    fetchTables()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-12 h-12 animate-spin text-brand-gold" /></div>
  }

  const visible = tables.filter((x) => x.is_active || isAdmin)
  const freeCount = visible.filter((x) => x.is_active && isClosed(x.active_order)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-cream">{t('tables')}</h1>
          <p className="text-muted text-sm">{t('free')}: {freeCount} · {t('occupied')}: {visible.filter((x) => !isClosed(x.active_order)).length}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTables} className="btn-secondary py-2 px-4 flex items-center gap-2"><RefreshCw size={16} /> {t('refresh')}</button>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)} className="btn-primary py-2 px-4 flex items-center gap-2"><Plus size={16} /> {t('addTables')}</button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-12 text-center text-muted">{t('noTablesYet')}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {visible.map((tb) => {
            const o = tb.active_order
            const busy = !isClosed(o)
            const due = busy ? balanceDue(o) : 0
            return (
              <div
                key={tb.id}
                onClick={() => openTable(tb)}
                className={`relative rounded-xl p-4 border-2 cursor-pointer transition-all min-h-[110px] ${
                  !tb.is_active ? 'opacity-40 border-dashed border-muted/40'
                    : busy ? 'bg-red-500/10 border-red-500/40 hover:border-red-400'
                      : 'bg-green-500/10 border-green-500/30 hover:border-green-400'
                }`}
              >
                <p className="text-xl font-bold text-cream">{tb.name}</p>
                {busy ? (
                  <div className="text-xs mt-1 space-y-0.5">
                    <p className="text-red-300 font-mono">{o.order_number}</p>
                    <p className="text-cream font-mono">₹{parseFloat(o.total_amount).toFixed(0)}</p>
                    {due > 0 && <p className="text-yellow-400">{t('balance')} ₹{due.toFixed(0)}</p>}
                    <p className="text-muted">{formatDistanceToNowStrict(new Date(o.created_at))}</p>
                  </div>
                ) : (
                  <p className="text-green-400 text-sm mt-1">{tb.is_active ? t('free') : t('disabled')}</p>
                )}
                {isAdmin && !busy && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTable(tb) }}
                    className="absolute top-2 right-2 p-1 text-muted hover:text-red-400"
                    aria-label={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Occupied table detail */}
      {selected && (
        <Modal title={`${selected.table.name} · ${selected.order.order_number}`} onClose={() => setSelected(null)}>
          {(() => {
            const o = selected.order
            const due = balanceDue(o)
            const editable = Number(o.paid_amount) === 0 && !['COMPLETED', 'CANCELLED'].includes(o.order_status)
            return (
              <div className="space-y-4">
                <div className="space-y-1">
                  {o.order_items?.map((i) => (
                    <div key={i.id} className="flex justify-between text-sm">
                      <span className="text-cream">{i.quantity}x {i.item_name}{i.variant ? ` (${i.variant})` : ''}</span>
                      <span className="text-muted font-mono">₹{parseFloat(i.total_price).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-brand-gold/20 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-cream font-semibold"><span>{t('total')}</span><span className="font-mono">₹{parseFloat(o.total_amount).toFixed(2)}</span></div>
                  <div className="flex justify-between text-green-400"><span>{t('paidAmount')}</span><span className="font-mono">₹{parseFloat(o.paid_amount).toFixed(2)}</span></div>
                  {due > 0 && <div className="flex justify-between text-yellow-400"><span>{t('balance')}</span><span className="font-mono">₹{due.toFixed(2)}</span></div>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {editable && (
                    <button onClick={() => navigate(`/pos?order=${o.id}`)} className="flex items-center justify-center gap-1 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm">
                      <PlusCircle size={16} /> {t('add')}
                    </button>
                  )}
                  {due > 0 && (
                    <button disabled={!online} onClick={() => setCollecting(o)} className="flex items-center justify-center gap-1 p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm disabled:opacity-50">
                      <IndianRupee size={16} /> {t('collect')}
                    </button>
                  )}
                  <button onClick={() => setReceiptOrder(o)} className="flex items-center justify-center gap-1 p-2 rounded-lg bg-brand-gold/20 text-brand-gold hover:bg-brand-gold/30 text-sm">
                    <ReceiptIcon size={16} /> {language === 'ta' ? 'ரசீது' : 'Receipt'}
                  </button>
                  {isAdmin && (
                    <button onClick={() => release(selected.table)} className="flex items-center justify-center gap-1 p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm">
                      <Unlock size={16} /> {t('releaseTable')}
                    </button>
                  )}
                </div>
                <p className="text-muted text-xs">
                  {language === 'ta'
                    ? 'முழு பணம் பெற்றவுடன் ஆர்டர் முடிந்து டேபிள் தானாக காலியாகும்.'
                    : 'Once the bill is fully paid, the order completes and the table frees itself.'}
                </p>
              </div>
            )
          })()}
        </Modal>
      )}

      {collecting && (
        <PaymentModal
          title={`${t('collectBalance')} · ${collecting.order_number}`}
          due={balanceDue(collecting)}
          onConfirm={collect}
          onClose={() => setCollecting(null)}
        />
      )}

      {receiptOrder && <ReceiptModal order={receiptOrder} settings={settings} onClose={() => setReceiptOrder(null)} />}

      {showAdd && (
        <Modal
          title={t('addTables')}
          onClose={() => setShowAdd(false)}
          footer={<button onClick={addTables} className="btn-primary w-full">{t('add')}</button>}
        >
          <div className="space-y-3">
            <div>
              <label className="text-muted text-sm mb-1 block">{t('numberOfTables')} (T1, T2, …)</label>
              <input type="number" min="1" max="50" className="input" value={addCount} onChange={(e) => setAddCount(e.target.value)} disabled={!!addName.trim()} />
            </div>
            <div>
              <label className="text-muted text-sm mb-1 block">{language === 'ta' ? 'அல்லது ஒரு பெயர் (எ.கா. Family 1)' : 'Or one custom name (e.g. Family 1)'}</label>
              <input className="input" value={addName} onChange={(e) => setAddName(e.target.value)} maxLength={30} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
