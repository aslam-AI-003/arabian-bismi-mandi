import { useState, useEffect } from 'react'
import {
  Wallet, Plus, Trash2, Loader2, CheckCircle2, XCircle, AlertCircle,
  Banknote, ArrowDown, ArrowUp, Calculator, Lock, History
} from 'lucide-react'
import { getDailySales, getSettlement, upsertSettlement, getCashOuts, addCashOut, deleteCashOut, getSettlements } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const DENOMINATIONS = [
  { value: 2000, label: '₹2000' },
  { value: 500, label: '₹500' },
  { value: 200, label: '₹200' },
  { value: 100, label: '₹100' },
  { value: 50, label: '₹50' },
  { value: 20, label: '₹20' },
  { value: 10, label: '₹10' },
  { value: 5, label: '₹5' },
  { value: 0, label: 'Coins' },
]

export default function DayEndSettlement() {
  const { language } = useLanguage()
  const today = new Date().toISOString().split('T')[0]

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settlement, setSettlement] = useState(null)
  const [cashOuts, setCashOuts] = useState([])
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  // Form state
  const [openingBalance, setOpeningBalance] = useState('')
  const [denominations, setDenominations] = useState({})
  const [coinsAmount, setCoinsAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [cashOutReason, setCashOutReason] = useState('')
  const [cashOutAmount, setCashOutAmount] = useState('')

  // Sales data (auto from POS)
  const [salesData, setSalesData] = useState({
    cashSales: 0, cardSales: 0, upiSales: 0, totalSales: 0, totalOrders: 0
  })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchSales(), fetchSettlement(), fetchCashOuts(), fetchHistory()])
    setLoading(false)
  }

  const fetchSales = async () => {
    const { data } = await getDailySales(new Date())
    if (data) {
      let cash = 0, card = 0, upi = 0
      data.forEach(order => {
        const amt = parseFloat(order.total_amount) || 0
        if (order.payment_method === 'CASH') cash += amt
        else if (order.payment_method === 'CARD') card += amt
        else if (order.payment_method === 'UPI') upi += amt
        else cash += amt
      })
      setSalesData({
        cashSales: cash,
        cardSales: card,
        upiSales: upi,
        totalSales: cash + card + upi,
        totalOrders: data.length
      })
    }
  }

  const fetchSettlement = async () => {
    const { data } = await getSettlement(today)
    if (data) {
      setSettlement(data)
      setOpeningBalance(data.opening_balance?.toString() || '')
      setDenominations(data.denomination || {})
      setCoinsAmount(data.denomination?.coins?.toString() || '')
      setNotes(data.notes || '')
    }
  }

  const fetchCashOuts = async () => {
    const { data } = await getCashOuts(today)
    if (data) setCashOuts(data)
  }

  const fetchHistory = async () => {
    const { data } = await getSettlements(15)
    if (data) setHistory(data)
  }

  // Calculations
  const cashOutTotal = cashOuts.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
  const opening = parseFloat(openingBalance) || 0
  const expectedCash = opening + salesData.cashSales - cashOutTotal
  
  const countedCash = DENOMINATIONS.reduce((sum, d) => {
    if (d.value === 0) return sum + (parseFloat(coinsAmount) || 0)
    return sum + (parseInt(denominations[d.value] || 0) * d.value)
  }, 0)
  
  const difference = countedCash - expectedCash
  const isClosed = settlement?.status === 'CLOSED'

  // Handlers
  const handleDenominationChange = (value, count) => {
    setDenominations(prev => ({ ...prev, [value]: parseInt(count) || 0 }))
  }

  const handleAddCashOut = async () => {
    if (!cashOutReason.trim() || !cashOutAmount) {
      toast.error(language === 'ta' ? 'காரணம் & தொகை தேவை' : 'Reason & amount required')
      return
    }
    try {
      await addCashOut({
        settlement_date: today,
        reason: cashOutReason.trim(),
        amount: parseFloat(cashOutAmount)
      })
      setCashOutReason('')
      setCashOutAmount('')
      fetchCashOuts()
      toast.success(language === 'ta' ? 'சேர்க்கப்பட்டது' : 'Cash out added')
    } catch (e) {
      toast.error('Failed to add')
    }
  }

  const handleDeleteCashOut = async (id) => {
    await deleteCashOut(id)
    fetchCashOuts()
    toast.success(language === 'ta' ? 'நீக்கப்பட்டது' : 'Removed')
  }

  const handleSave = async (close = false) => {
    setSaving(true)
    try {
      const denominationData = { ...denominations, coins: parseFloat(coinsAmount) || 0 }
      await upsertSettlement({
        settlement_date: today,
        opening_balance: opening,
        cash_sales: salesData.cashSales,
        card_sales: salesData.cardSales,
        upi_sales: salesData.upiSales,
        total_sales: salesData.totalSales,
        total_orders: salesData.totalOrders,
        cash_out_total: cashOutTotal,
        expected_cash: expectedCash,
        actual_cash: countedCash,
        difference: difference,
        denomination: denominationData,
        notes: notes,
        status: close ? 'CLOSED' : 'OPEN',
      })
      toast.success(close
        ? (language === 'ta' ? '✅ நாள் முடிவு சேமிக்கப்பட்டது!' : '✅ Day closed & saved!')
        : (language === 'ta' ? 'சேமிக்கப்பட்டது' : 'Saved!')
      )
      fetchSettlement()
      fetchHistory()
    } catch (e) {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  // Labels
  const l = {
    title: language === 'ta' ? '💰 நாள் முடிவு கணக்கு' : '💰 Day End Settlement',
    openingBalance: language === 'ta' ? '🌅 தொடக்க இருப்பு' : '🌅 Opening Balance',
    openingHint: language === 'ta' ? 'இன்று காலை டிராயரில் எவ்வளவு பணம் வைத்தீர்கள்?' : 'How much cash did you put in the drawer this morning?',
    todaySales: language === 'ta' ? '📊 இன்றைய விற்பனை (POS இலிருந்து)' : "📊 Today's Sales (Auto from POS)",
    cashOut: language === 'ta' ? '💸 பணம் எடுத்தது (டிராயரிலிருந்து)' : '💸 Cash Out (From Drawer)',
    cashOutHint: language === 'ta' ? 'டிராயரிலிருந்து எடுத்த பணம் (செலவு, உரிமையாளர் எடுத்தது)' : 'Money taken out from drawer (expenses, owner withdrawal)',
    reason: language === 'ta' ? 'காரணம்' : 'Reason',
    amount: language === 'ta' ? 'தொகை' : 'Amount',
    cashCount: language === 'ta' ? '💵 பண எண்ணிக்கை' : '💵 Cash Denomination Count',
    cashCountHint: language === 'ta' ? 'இரவு டிராயரில் உள்ள பணத்தை எண்ணவும்' : 'Count the physical cash in the drawer',
    result: language === 'ta' ? '📋 கணக்கு முடிவு' : '📋 Settlement Result',
    expected: language === 'ta' ? 'இருக்க வேண்டியது' : 'Expected Cash',
    counted: language === 'ta' ? 'உண்மையில் இருப்பது' : 'Actually Counted',
    diff: language === 'ta' ? 'வித்தியாசம்' : 'Difference',
    balanced: language === 'ta' ? '✅ சரியாக உள்ளது!' : '✅ BALANCED!',
    short: language === 'ta' ? '❌ குறைவு!' : '❌ SHORT!',
    excess: language === 'ta' ? '⚠️ அதிகம்!' : '⚠️ EXCESS!',
    save: language === 'ta' ? 'சேமி' : 'Save Draft',
    closeDay: language === 'ta' ? '✅ நாள் முடிவு & சேமி' : '✅ Close Day & Save',
    closed: language === 'ta' ? '🔒 இந்த நாள் முடிக்கப்பட்டது' : '🔒 This day is closed',
    history: language === 'ta' ? '📜 வரலாறு' : '📜 History',
    notes: language === 'ta' ? 'குறிப்புகள்' : 'Notes',
    cash: language === 'ta' ? 'பணம்' : 'Cash',
    card: language === 'ta' ? 'கார்டு' : 'Card',
    count: language === 'ta' ? 'எண்ணிக்கை' : 'Count',
    total: language === 'ta' ? 'மொத்தம்' : 'Total',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cream">{l.title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm">{format(new Date(), 'dd MMM yyyy')}</span>
          {isClosed && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
              <Lock size={12} /> {l.closed}
            </span>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-secondary text-cream hover:bg-brand-gold/20 text-sm"
          >
            <History size={14} />
            {l.history}
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="card p-4">
          <h3 className="text-cream font-semibold mb-3 flex items-center gap-2"><History size={16} /> {l.history}</h3>
          {history.length === 0 ? (
            <p className="text-muted text-sm">{language === 'ta' ? 'வரலாறு இல்லை' : 'No settlement history'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs border-b border-brand-gold/10">
                    <th className="text-left py-2">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                    <th className="text-right">{language === 'ta' ? 'விற்பனை' : 'Sales'}</th>
                    <th className="text-right">{l.expected}</th>
                    <th className="text-right">{l.counted}</th>
                    <th className="text-right">{l.diff}</th>
                    <th className="text-center">{language === 'ta' ? 'நிலை' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-brand-gold/5">
                      <td className="py-2 text-cream">{format(new Date(h.settlement_date), 'dd MMM yy')}</td>
                      <td className="text-right text-cream font-mono">₹{parseFloat(h.total_sales).toFixed(0)}</td>
                      <td className="text-right text-muted font-mono">₹{parseFloat(h.expected_cash).toFixed(0)}</td>
                      <td className="text-right text-cream font-mono">₹{parseFloat(h.actual_cash).toFixed(0)}</td>
                      <td className={`text-right font-mono font-bold ${
                        parseFloat(h.difference) === 0 ? 'text-green-400'
                        : parseFloat(h.difference) < 0 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {parseFloat(h.difference) > 0 ? '+' : ''}₹{parseFloat(h.difference).toFixed(0)}
                      </td>
                      <td className="text-center">
                        {h.status === 'CLOSED' ? (
                          <span className="text-green-400">✅</span>
                        ) : (
                          <span className="text-yellow-400">⏳</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: Opening Balance */}
      <div className="card p-4">
        <h3 className="text-cream font-semibold mb-1 flex items-center gap-2">
          <Wallet className="text-brand-gold" size={18} /> {l.openingBalance}
        </h3>
        <p className="text-muted text-xs mb-3">{l.openingHint}</p>
        <div className="relative w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold font-bold">₹</span>
          <input
            type="number"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="input pl-8 text-lg font-mono"
            placeholder="0"
            disabled={isClosed}
          />
        </div>
      </div>

      {/* STEP 2: Today's Sales (Auto) */}
      <div className="card p-4">
        <h3 className="text-cream font-semibold mb-3 flex items-center gap-2">
          <Calculator className="text-brand-gold" size={18} /> {l.todaySales}
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <p className="text-green-400 text-xs mb-1">💵 {l.cash}</p>
            <p className="text-cream font-bold font-mono text-lg">₹{salesData.cashSales.toFixed(0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-blue-400 text-xs mb-1">💳 {l.card}</p>
            <p className="text-cream font-bold font-mono text-lg">₹{salesData.cardSales.toFixed(0)}</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
            <p className="text-purple-400 text-xs mb-1">📱 UPI</p>
            <p className="text-cream font-bold font-mono text-lg">₹{salesData.upiSales.toFixed(0)}</p>
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">{language === 'ta' ? 'மொத்த ஆர்டர்கள்' : 'Total Orders'}: <span className="text-cream font-bold">{salesData.totalOrders}</span></span>
          <span className="text-muted">{l.total}: <span className="text-brand-gold font-bold font-mono">₹{salesData.totalSales.toFixed(0)}</span></span>
        </div>
      </div>

      {/* STEP 3: Cash Out */}
      <div className="card p-4">
        <h3 className="text-cream font-semibold mb-1 flex items-center gap-2">
          <ArrowUp className="text-red-400" size={18} /> {l.cashOut}
        </h3>
        <p className="text-muted text-xs mb-3">{l.cashOutHint}</p>
        
        {/* Existing entries */}
        {cashOuts.length > 0 && (
          <div className="space-y-2 mb-3">
            {cashOuts.map(co => (
              <div key={co.id} className="flex items-center justify-between p-2 rounded-lg bg-dark-primary/50 border border-red-500/10">
                <div>
                  <span className="text-cream text-sm">{co.reason}</span>
                  <span className="text-red-400 font-mono ml-3">-₹{parseFloat(co.amount).toFixed(0)}</span>
                </div>
                {!isClosed && (
                  <button onClick={() => handleDeleteCashOut(co.id)} className="text-red-400 hover:bg-red-500/20 p-1 rounded">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <div className="text-right text-sm">
              <span className="text-muted">{l.total}: </span>
              <span className="text-red-400 font-bold font-mono">-₹{cashOutTotal.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Add new */}
        {!isClosed && (
          <div className="flex gap-2">
            <input
              type="text"
              value={cashOutReason}
              onChange={(e) => setCashOutReason(e.target.value)}
              className="input flex-1 text-sm"
              placeholder={language === 'ta' ? 'காரணம் (உ.ம்: கோழி 10kg)' : 'Reason (e.g., Chicken 10kg)'}
            />
            <div className="relative w-32">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
              <input
                type="number"
                value={cashOutAmount}
                onChange={(e) => setCashOutAmount(e.target.value)}
                className="input pl-6 text-sm"
                placeholder="0"
              />
            </div>
            <button onClick={handleAddCashOut} className="btn-primary px-3">
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>

      {/* STEP 4: Cash Denomination Count */}
      <div className="card p-4">
        <h3 className="text-cream font-semibold mb-1 flex items-center gap-2">
          <Banknote className="text-brand-gold" size={18} /> {l.cashCount}
        </h3>
        <p className="text-muted text-xs mb-3">{l.cashCountHint}</p>
        
        <div className="space-y-2">
          {DENOMINATIONS.map(d => (
            <div key={d.value} className="flex items-center gap-3">
              <span className="w-16 text-cream text-sm font-medium">{d.label}</span>
              <span className="text-muted">×</span>
              {d.value === 0 ? (
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">₹</span>
                  <input
                    type="number"
                    value={coinsAmount}
                    onChange={(e) => setCoinsAmount(e.target.value)}
                    className="input text-sm pl-6 py-1.5"
                    placeholder="0"
                    disabled={isClosed}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  value={denominations[d.value] || ''}
                  onChange={(e) => handleDenominationChange(d.value, e.target.value)}
                  className="input w-20 text-sm text-center py-1.5"
                  placeholder="0"
                  min="0"
                  disabled={isClosed}
                />
              )}
              <span className="text-muted">=</span>
              <span className="text-cream font-mono text-sm w-24 text-right">
                ₹{d.value === 0
                  ? (parseFloat(coinsAmount) || 0).toFixed(0)
                  : ((parseInt(denominations[d.value] || 0)) * d.value).toFixed(0)
                }
              </span>
            </div>
          ))}
          <div className="border-t border-brand-gold/20 pt-2 mt-2 flex items-center justify-between">
            <span className="text-cream font-semibold">{l.total} {l.counted}:</span>
            <span className="text-brand-gold font-bold font-mono text-xl">₹{countedCash.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* STEP 5: Result */}
      <div className={`card p-5 border-2 ${
        countedCash === 0 ? 'border-brand-gold/20'
        : difference === 0 ? 'border-green-500/40 bg-green-500/5'
        : difference < 0 ? 'border-red-500/40 bg-red-500/5'
        : 'border-yellow-500/40 bg-yellow-500/5'
      }`}>
        <h3 className="text-cream font-semibold mb-4 flex items-center gap-2">
          <Calculator className="text-brand-gold" size={18} /> {l.result}
        </h3>
        
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-muted">{l.openingBalance}</span>
            <span className="text-cream font-mono">+ ₹{opening.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{language === 'ta' ? 'பண விற்பனை' : 'Cash Sales'}</span>
            <span className="text-green-400 font-mono">+ ₹{salesData.cashSales.toFixed(0)}</span>
          </div>
          {cashOutTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">{l.cashOut}</span>
              <span className="text-red-400 font-mono">- ₹{cashOutTotal.toFixed(0)}</span>
            </div>
          )}
          <div className="border-t border-brand-gold/20 pt-2 flex justify-between font-bold">
            <span className="text-cream">{l.expected}</span>
            <span className="text-cream font-mono">₹{expectedCash.toFixed(0)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-cream">{l.counted}</span>
            <span className="text-brand-gold font-mono">₹{countedCash.toFixed(0)}</span>
          </div>
          <div className="border-t-2 border-brand-gold/30 pt-3 flex justify-between text-lg font-bold">
            <span className="text-cream">{l.diff}</span>
            <span className={`font-mono ${
              difference === 0 ? 'text-green-400'
              : difference < 0 ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {difference === 0 ? (
                <span className="flex items-center gap-2"><CheckCircle2 size={20} /> {l.balanced}</span>
              ) : difference < 0 ? (
                <span className="flex items-center gap-2"><XCircle size={20} /> {difference.toFixed(0)} {l.short}</span>
              ) : (
                <span className="flex items-center gap-2"><AlertCircle size={20} /> +{difference.toFixed(0)} {l.excess}</span>
              )}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-muted text-xs mb-1 block">{l.notes}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input text-sm"
            rows={2}
            placeholder={language === 'ta' ? 'குறிப்புகள் (விருப்பமானது)' : 'Notes (optional)'}
            disabled={isClosed}
          />
        </div>

        {/* Action Buttons */}
        {!isClosed ? (
          <div className="flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <ArrowDown size={16} />}
              {l.save}
            </button>
            <button
              onClick={() => {
                if (confirm(language === 'ta' ? 'நாளை முடிக்க விரும்புகிறீர்களா? முடிவு பின் மாற்ற முடியாது.' : 'Close this day? This cannot be undone.')) {
                  handleSave(true)
                }
              }}
              disabled={saving || countedCash === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
              {l.closeDay}
            </button>
          </div>
        ) : (
          <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <Lock className="text-green-400 mx-auto mb-1" size={20} />
            <p className="text-green-400 font-medium text-sm">{l.closed}</p>
          </div>
        )}
      </div>
    </div>
  )
}
