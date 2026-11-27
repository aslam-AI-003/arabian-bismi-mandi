import { useCallback, useEffect, useState } from 'react'
import { IndianRupee, Clock, Receipt } from 'lucide-react'
import { startOfDay, endOfDay } from 'date-fns'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getOrdersByDateRange, getPendingBalanceOrders } from '../lib/supabase'
import { balanceDue } from '../lib/billing'

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

/**
 * Strip at the top of Orders: today's sales and bill count (admins only,
 * like the Dashboard) and the unpaid total across all open orders.
 * `refreshKey` changes whenever the Orders list reloads.
 */
export default function TodaySummary({ refreshKey }) {
  const { t } = useLanguage()
  const { isAdmin } = useAuth()
  const [s, setS] = useState(null)

  const load = useCallback(async () => {
    const now = new Date()
    const [todayRes, pendRes] = await Promise.all([
      isAdmin ? getOrdersByDateRange(startOfDay(now).toISOString(), endOfDay(now).toISOString()) : Promise.resolve({ data: [] }),
      getPendingBalanceOrders(),
    ])
    const completed = (todayRes.data || []).filter((o) => o.order_status === 'COMPLETED')
    setS({
      sales: completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      bills: completed.length,
      unpaid: (pendRes.data || []).reduce((sum, o) => sum + balanceDue(o), 0),
      unpaidCount: (pendRes.data || []).length,
    })
  }, [isAdmin])

  useEffect(() => { load() }, [load, refreshKey])

  const cards = [
    isAdmin && { icon: IndianRupee, label: t('todaysSales'), value: s ? money(s.sales) : '…', color: 'text-brand-gold' },
    isAdmin && { icon: Receipt, label: t('completedTab'), value: s ? s.bills : '…', color: 'text-cream' },
    { icon: Clock, label: `${t('unpaidTotal')}${s ? ` (${s.unpaidCount})` : ''}`, value: s ? money(s.unpaid) : '…', color: 'text-yellow-400' },
  ].filter(Boolean)

  return (
    <div className={`grid ${cards.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'} gap-3`}>
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border border-brand-gold/20 bg-dark-secondary/60 px-4 py-3">
          <Icon className="text-brand-gold shrink-0" size={20} />
          <div className="min-w-0">
            <p className="text-muted text-xs truncate">{label}</p>
            <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
