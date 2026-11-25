import { IndianRupee, Undo2, Receipt, TrendingUp, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useLanguage } from '../context/LanguageContext'
import { balanceDue } from '../lib/billing'

const P = (n) => Math.round((Number(n) || 0) * 100)
const R = (p) => p / 100
const METHODS = ['CASH', 'CARD', 'UPI']

/**
 * Money actually received in the period (payment ledger), refunds, expenses
 * and estimated profit. Payments on cancelled orders are left out, the same
 * way the sales and day-end figures leave cancelled orders out.
 * revenue = completed bills in the period (the "Net Sales" figure).
 */
export function summarizeCollections({ ledger = [], expenses = [], revenue = 0 }) {
  const collections = { CASH: 0, CARD: 0, UPI: 0 }
  const refunds = { CASH: 0, CARD: 0, UPI: 0 }
  for (const p of ledger) {
    if (p.orders?.order_status === 'CANCELLED') continue
    const m = p.method === 'WALLET' ? 'UPI' : p.method
    if (p.kind === 'REFUND') refunds[m] = (refunds[m] || 0) + P(p.amount)
    else collections[m] = (collections[m] || 0) + P(p.amount)
  }
  const collected = Object.values(collections).reduce((a, b) => a + b, 0)
  const refunded = Object.values(refunds).reduce((a, b) => a + b, 0)
  const expenseTotal = expenses.reduce((s, e) => s + P(e.amount), 0)
  const byCat = {}
  for (const e of expenses) byCat[e.category || 'Other'] = (byCat[e.category || 'Other'] || 0) + P(e.amount)
  return {
    collections: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, R(v)])),
    refunds: Object.fromEntries(Object.entries(refunds).map(([k, v]) => [k, R(v)])),
    collected: R(collected),
    refunded: R(refunded),
    netCollected: R(collected - refunded),
    expenses: R(expenseTotal),
    expenseByCategory: Object.entries(byCat).map(([name, v]) => ({ name, amount: R(v) })).sort((a, b) => b.amount - a.amount),
    revenue,
    estimatedProfit: R(P(revenue) - refunded - expenseTotal),
  }
}

export default function CollectionsReport({ summary, pendingOrders = [] }) {
  const { t, language } = useLanguage()
  const money = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const pendingTotal = pendingOrders.reduce((s, o) => s + balanceDue(o), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('netCollected'), value: summary.netCollected, icon: IndianRupee, color: 'text-green-400' },
          { label: t('refunds'), value: summary.refunded, icon: Undo2, color: 'text-gray-300' },
          { label: t('expenses'), value: summary.expenses, icon: Receipt, color: 'text-red-400' },
          { label: t('estimatedProfit'), value: summary.estimatedProfit, icon: TrendingUp, color: summary.estimatedProfit >= 0 ? 'text-brand-gold' : 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stats-card">
            <div className="flex items-center gap-2 mb-2"><Icon className="text-brand-gold" size={20} /><span className="text-muted">{label}</span></div>
            <p className={`text-2xl font-bold ${color}`}>{money(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-cream mb-4">💳 {t('collected')} / {t('refunds')}</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-muted border-b border-brand-gold/20"><th className="text-left py-2" /><th className="text-right py-2">{t('collected')}</th><th className="text-right py-2">{t('refunds')}</th><th className="text-right py-2">{t('netCollected')}</th></tr></thead>
            <tbody>
              {METHODS.map((m) => (
                <tr key={m} className="border-b border-brand-gold/10">
                  <td className="py-2 text-cream">{m}</td>
                  <td className="py-2 text-right font-mono text-green-400">{money(summary.collections[m] || 0)}</td>
                  <td className="py-2 text-right font-mono text-gray-300">{money(summary.refunds[m] || 0)}</td>
                  <td className="py-2 text-right font-mono text-brand-gold">{money((summary.collections[m] || 0) - (summary.refunds[m] || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted text-xs mt-3">
            {language === 'ta'
              ? 'இந்த காலத்தில் உண்மையில் பெற்ற பணம் (பாக்கி வசூல் உட்பட).'
              : 'Money actually received in this period, including balances collected for older bills.'}
          </p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-cream mb-4">📊 {t('estimatedProfit')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-cream"><span>{t('revenue')} ({language === 'ta' ? 'முடிந்த பில்கள்' : 'completed bills'})</span><span className="font-mono">{money(summary.revenue)}</span></div>
            <div className="flex justify-between text-gray-300"><span>− {t('refunds')}</span><span className="font-mono">{money(summary.refunded)}</span></div>
            <div className="flex justify-between text-red-300"><span>− {t('expenses')}</span><span className="font-mono">{money(summary.expenses)}</span></div>
            <div className="flex justify-between border-t border-brand-gold/20 pt-2 text-brand-gold font-bold text-lg"><span>{t('estimatedProfit')}</span><span className="font-mono">{money(summary.estimatedProfit)}</span></div>
          </div>
          {summary.expenseByCategory.length > 0 && (
            <div className="mt-4 space-y-1">
              {summary.expenseByCategory.map((c) => (
                <div key={c.name} className="flex justify-between text-xs text-muted"><span>{c.name}</span><span className="font-mono">{money(c.amount)}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-cream mb-4 flex items-center gap-2">
          <Clock className="text-yellow-400" size={20} /> {t('pendingDues')} ({pendingOrders.length}) · <span className="font-mono text-yellow-400">{money(pendingTotal)}</span>
        </h3>
        {pendingOrders.length === 0 ? (
          <p className="text-muted text-center py-4">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted border-b border-brand-gold/20 text-left"><th className="py-2">#</th><th className="py-2">{t('date')}</th><th className="py-2">{t('customerName')}</th><th className="py-2 text-right">{t('total')}</th><th className="py-2 text-right">{t('balance')}</th></tr></thead>
              <tbody>
                {pendingOrders.map((o) => (
                  <tr key={o.id} className="border-b border-brand-gold/10">
                    <td className="py-2 font-mono text-brand-gold">{o.order_number}</td>
                    <td className="py-2 text-muted">{format(new Date(o.created_at), 'dd MMM, hh:mm a')}</td>
                    <td className="py-2 text-cream">{o.customer_name || o.customer_phone || o.table_number || '—'}</td>
                    <td className="py-2 text-right font-mono">{money(o.total_amount)}</td>
                    <td className="py-2 text-right font-mono text-yellow-400">{money(balanceDue(o))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-muted text-xs mt-3">{language === 'ta' ? 'ஆர்டர்கள் பக்கத்தில் பாக்கி வசூலிக்கலாம்.' : 'Collect these from the Orders page (₹ button).'}</p>
      </div>
    </div>
  )
}
