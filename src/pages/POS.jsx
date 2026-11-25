import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Minus, Trash2, UtensilsCrossed, Package, Truck, Loader2, SplitSquareHorizontal, Clock, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { getCategories, getMenuItems, getTables, getOrderById, placeOrder, updateOrderItems } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useAppSettings } from '../context/SettingsContext'
import { useConnection } from '../context/ConnectionContext'
import { printReceipt, loadPrinterConfig } from '../lib/thermalPrinter'
import { dbErrorMessage } from '../lib/billing'
import ReceiptModal from '../components/ReceiptModal'
import PaymentModal from '../components/PaymentModal'

const isClosed = (o) => !o || o.order_status === 'CANCELLED' || (o.order_status === 'COMPLETED' && ['PAID', 'REFUNDED'].includes(o.payment_status))

export default function POS() {
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [tables, setTables] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const busy = useRef(false)
  const cart = useCart()
  const { t, language } = useLanguage()
  const { isAdmin } = useAuth()
  const { cashierCanDiscount, settings } = useAppSettings()
  const { online } = useConnection()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const canDiscount = isAdmin || cashierCanDiscount
  const editing = cart.editingOrder

  // Fetch categories, menu items and tables on mount
  useEffect(() => {
    fetchData()
  }, [])

  // ?order=<id>: open a running order to add items. ?table=<id>: new dine-in order for that table.
  useEffect(() => {
    const orderParam = searchParams.get('order')
    const tableParam = searchParams.get('table')
    if (orderParam && orderParam !== editing?.id) {
      getOrderById(orderParam).then(({ data, error }) => {
        if (error || !data) { toast.error(dbErrorMessage(error, language)); return }
        if (data.order_status === 'COMPLETED' || data.order_status === 'CANCELLED' || Number(data.paid_amount) > 0) {
          toast.error(dbErrorMessage({ message: 'ORDER_HAS_PAYMENTS' }, language))
          return
        }
        cart.loadOrder(data)
      })
      setSearchParams({}, { replace: true })
    } else if (tableParam) {
      if (!editing) {
        cart.setOrderType('DINE_IN')
        cart.setTableId(tableParam)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catResult, menuResult, tableResult] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getTables(),
      ])
      
      if (catResult.data) {
        setCategories([{ id: 'all', name: 'All', icon: '🍽️' }, ...catResult.data])
      }
      if (menuResult.data) {
        setMenuItems(menuResult.data)
      }
      if (tableResult.data) {
        setTables(tableResult.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load menu')
    }
    setLoading(false)
  }

  const refreshTables = async () => {
    const { data } = await getTables()
    if (data) setTables(data)
  }

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleAddItem = (item) => {
    cart.addItem({
      id: item.id,
      name: item.name,
      variant: item.variant,
      price: parseFloat(item.price)
    })
  }

  const selectedTable = tables.find((tb) => tb.id === cart.tableId)

  const validateCart = () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty!')
      return false
    }
    if (cart.orderType === 'DINE_IN') {
      if (tables.length > 0 && !cart.tableId && !editing) {
        toast.error(t('selectTable'))
        return false
      }
      if (tables.length === 0 && !cart.tableNumber && !editing) {
        toast.error('Please enter table number!')
        return false
      }
    }
    if (!online) {
      toast.error(t('offlineBanner'))
      return false
    }
    return true
  }

  const finishSaved = async (order, duplicate) => {
    if (duplicate) {
      toast(language === 'ta' ? `இந்த பில் ஏற்கனவே சேமிக்கப்பட்டது (${order.order_number})` : `This bill was already saved (${order.order_number})`, { icon: 'ℹ️' })
    } else {
      toast.success(`Order ${order.order_number} placed successfully!`)
    }
    const completeOrder = { ...order, order_items: [...(order.order_items || [])] }
    setLastOrder(completeOrder)
    cart.clearCart()
    refreshTables()

    // Auto-print if enabled in settings
    const config = loadPrinterConfig()
    if (config.autoPrint) {
      try {
        const result = await printReceipt(completeOrder, settings)
        if (result.success) {
          toast.success('🖨️ Receipt printed automatically!')
        }
      } catch (printError) {
        console.error('Auto-print error:', printError)
      }
    } else {
      // Show receipt modal for manual print
      setShowReceipt(true)
    }
  }

  // payments: [] = pay later; otherwise [{id, method, amount, reference}]
  const submitOrder = async (payments) => {
    if (busy.current) return
    busy.current = true
    setPlacingOrder(true)
    try {
      const orderData = {
        id: cart.orderId,
        order_type: cart.orderType,
        table_id: cart.orderType === 'DINE_IN' ? cart.tableId : null,
        table_number: cart.orderType === 'DINE_IN' ? (cart.tableNumber || null) : null,
        customer_name: cart.customerName || null,
        customer_phone: cart.customerPhone || null,
        customer_address: cart.customerAddress || null,
        discount_type: cart.discountAmount > 0 ? cart.discountType : null,
        discount_value: cart.discountAmount > 0 ? cart.discountValue : 0,
        notes: cart.notes || null,
      }
      const items = cart.items.map(item => ({ menu_item_id: item.id, quantity: item.quantity }))
      const { data, error } = await placeOrder(orderData, items, payments)
      if (error) throw error
      setShowPayment(false)
      await finishSaved(data, data.duplicate)
    } catch (error) {
      console.error('Error placing order:', error)
      toast.error(dbErrorMessage(error, language))
      if (/TABLE_OCCUPIED/.test(error?.message || '')) refreshTables()
      throw error
    } finally {
      busy.current = false
      setPlacingOrder(false)
    }
  }

  // Existing one-tap flow: full payment with the selected method.
  const handlePlaceOrder = async () => {
    if (!validateCart()) return
    try {
      await submitOrder([{ id: cart.quickPaymentId, method: cart.paymentMethod, amount: cart.total, full: true }])
    } catch { /* toast already shown */ }
  }

  const handlePayLater = async () => {
    if (!validateCart()) return
    try { await submitOrder([]) } catch { /* toast already shown */ }
  }

  const handleSplit = () => {
    if (!validateCart()) return
    setShowPayment(true)
  }

  const handleUpdateOrder = async () => {
    if (!validateCart() || busy.current) return
    busy.current = true
    setPlacingOrder(true)
    try {
      const items = cart.items.map(item => ({ menu_item_id: item.id, quantity: item.quantity }))
      const extra = {
        customer_name: cart.customerName || '',
        customer_phone: cart.customerPhone || '',
        notes: cart.notes || '',
        discount_type: cart.discountAmount > 0 ? cart.discountType : '',
        discount_value: cart.discountAmount > 0 ? cart.discountValue : 0,
      }
      const { data, error } = await updateOrderItems(editing.id, editing.version, items, extra)
      if (error) throw error
      toast.success(`${data.order_number} ✓`)
      setLastOrder(data)
      cart.clearCart()
      navigate('/tables')
    } catch (error) {
      toast.error(dbErrorMessage(error, language))
    } finally {
      busy.current = false
      setPlacingOrder(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-gold mx-auto mb-4" />
          <p className="text-muted">Loading menu...</p>
        </div>
      </div>
    )
  }

  const disabled = cart.items.length === 0 || placingOrder || !online

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-120px)]">
      {/* LEFT SIDE - Menu Section (scrollable independently) */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Search */}
        <div className="relative mb-3 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder={t('searchMenu')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-search pl-11"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 shrink-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all text-sm ${
                selectedCategory === cat.id
                  ? 'bg-brand-gold text-dark-primary font-semibold'
                  : 'bg-dark-secondary/50 text-cream hover:bg-dark-secondary'
              }`}
            >
              <span className="text-sm">{cat.icon || '🍽️'}</span>
              <span>{language === 'ta' && cat.name_ta ? cat.name_ta : cat.name}</span>
            </button>
          ))}
        </div>

        {/* Menu Grid - scrollable */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>{t('noItemsFound')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="card-menu-item p-3"
                >
                  <div className="text-2xl mb-1">
                    {item.categories?.icon || '🍽️'}
                  </div>
                  <h4 className="text-cream font-medium text-xs leading-tight">
                    {language === 'ta' && item.name_ta ? item.name_ta : item.name}
                  </h4>
                  {item.variant && (
                    <p className="text-muted text-[10px]">{item.variant}</p>
                  )}
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="price-badge text-xs px-2 py-0.5">₹{parseFloat(item.price).toFixed(0)}</span>
                    <Plus className="text-accent-amber" size={16} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Cart/Order Section (sticky, independently scrollable) */}
      <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 h-full overflow-y-auto card p-3 flex flex-col">
        {/* Editing a running order */}
        {editing && (
          <div className="mb-3 flex items-center justify-between p-2 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-300 text-sm">
            <span>{t('editingOrder')} <b className="font-mono">{editing.order_number}</b>{cart.tableNumber ? ` · ${cart.tableNumber}` : ''}</span>
            <button type="button" onClick={() => cart.clearCart()} className="flex items-center gap-1 text-xs hover:text-cream">
              <X size={14} /> {t('exitEdit')}
            </button>
          </div>
        )}

        {/* Order Type */}
        <div className="mb-4">
          <p className="text-muted text-sm mb-2">{t('orderType')}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'DINE_IN', icon: UtensilsCrossed, labelKey: 'dineIn' },
              { value: 'TAKEAWAY', icon: Package, labelKey: 'takeaway' },
              { value: 'DELIVERY', icon: Truck, labelKey: 'delivery' },
            ].map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                onClick={() => !editing && cart.setOrderType(value)}
                disabled={!!editing}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all min-h-[60px] ${
                  cart.orderType === value
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                    : 'border-brand-gold/20 text-muted hover:border-brand-gold/40'
                } ${editing ? 'cursor-not-allowed' : ''}`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-medium whitespace-nowrap">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table (Dine In): pick from tables if set up, else type the number as before */}
        {cart.orderType === 'DINE_IN' && !editing && (
          tables.length > 0 ? (
            <div className="mb-3">
              <label className="text-muted text-sm mb-1 block">{t('selectTable')} *</label>
              <div className="grid grid-cols-5 gap-1.5 max-h-[120px] overflow-y-auto">
                {tables.map((tb) => {
                  const busyTable = !isClosed(tb.active_order)
                  const selected = cart.tableId === tb.id
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      disabled={busyTable}
                      onClick={() => { cart.setTableId(tb.id); cart.setTableNumber(tb.name) }}
                      title={busyTable ? `${t('occupied')} · ${tb.active_order?.order_number}` : t('free')}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        selected
                          ? 'bg-brand-gold text-dark-primary border-brand-gold'
                          : busyTable
                            ? 'bg-red-500/10 text-red-400/70 border-red-500/30 cursor-not-allowed'
                            : 'bg-green-500/10 text-green-300 border-green-500/30 hover:bg-green-500/20'
                      }`}
                    >
                      {tb.name}
                    </button>
                  )
                })}
              </div>
              {selectedTable && <p className="text-brand-gold text-xs mt-1">{t('table')}: {selectedTable.name}</p>}
            </div>
          ) : (
            <div className="mb-3">
              <label className="text-muted text-sm mb-1 block">{t('tableNumber')} *</label>
              <input
                type="number"
                value={cart.tableNumber}
                onChange={(e) => cart.setTableNumber(e.target.value)}
                className="input"
                placeholder={t('enterTableNumber')}
              />
            </div>
          )
        )}

        {/* Customer Info - Shown for ALL order types */}
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-muted text-xs mb-1 block">📱 {t('phoneNumber')}</label>
              <input
                type="tel"
                value={cart.customerPhone}
                onChange={(e) => cart.setCustomerPhone(e.target.value)}
                className="input text-sm py-2"
                placeholder="9894092449"
              />
            </div>
            <div>
              <label className="text-muted text-xs mb-1 block">👤 {t('customerName')}</label>
              <input
                type="text"
                value={cart.customerName}
                onChange={(e) => cart.setCustomerName(e.target.value)}
                className="input text-sm py-2"
                placeholder={t('customerName')}
              />
            </div>
          </div>

          {/* Address - Only for Delivery */}
          {cart.orderType === 'DELIVERY' && (
            <div>
              <label className="text-muted text-xs mb-1 block">📍 {t('address')}</label>
              <textarea
                value={cart.customerAddress}
                onChange={(e) => cart.setCustomerAddress(e.target.value)}
                className="input text-sm py-2"
                rows={2}
                placeholder={t('deliveryAddress')}
              />
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="min-h-[150px] max-h-[300px] overflow-y-auto mb-4">
          <h3 className="text-cream font-semibold mb-3">{t('cartItems')} ({cart.itemCount})</h3>
          {cart.items.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p>{t('cartEmpty')}</p>
              <p className="text-sm">{t('clickToAdd')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.items.map((item, index) => (
                <div
                  key={`${item.id}-${item.variant}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-primary/50 border border-brand-gold/10"
                >
                  <div className="flex-1">
                    <p className="text-cream text-sm">{item.name}</p>
                    {item.variant && <p className="text-muted text-xs">{item.variant}</p>}
                    <p className="text-brand-gold font-mono text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        cart.updateQuantity(item.id, item.variant, item.quantity - 1)
                      }}
                      className="w-7 h-7 rounded bg-dark-secondary flex items-center justify-center text-cream hover:bg-brand-gold/20"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-cream w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        cart.updateQuantity(item.id, item.variant, item.quantity + 1)
                      }}
                      className="w-7 h-7 rounded bg-dark-secondary flex items-center justify-center text-cream hover:bg-brand-gold/20"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        cart.removeItem(item.id, item.variant)
                      }}
                      className="w-7 h-7 rounded flex items-center justify-center text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discount (admins, or cashiers when allowed in Settings) */}
        {canDiscount && cart.items.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-muted text-xs">{t('discountLabel')}</span>
            {[{ v: null, l: '—' }, { v: 'PERCENTAGE', l: t('percent') }, { v: 'FIXED', l: t('flat') }].map(({ v, l }) => (
              <button
                key={l}
                type="button"
                onClick={() => { cart.setDiscountType(v); if (!v) cart.setDiscountValue(0) }}
                className={`px-2 py-1 rounded text-xs ${cart.discountType === v ? 'bg-brand-gold text-dark-primary' : 'bg-dark-secondary text-cream'}`}
              >
                {l}
              </button>
            ))}
            {cart.discountType && (
              <input
                type="number"
                min="0"
                step="0.01"
                value={cart.discountValue || ''}
                onChange={(e) => cart.setDiscountValue(Math.max(parseFloat(e.target.value) || 0, 0))}
                className="input py-1 px-2 text-sm w-20 font-mono"
                aria-label={t('discountLabel')}
              />
            )}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-brand-gold/20 pt-4 space-y-2">
          <div className="flex justify-between text-muted">
            <span>{t('subtotal')}</span>
            <span className="font-mono">₹{cart.subtotal.toFixed(2)}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>{t('discount')}</span>
              <span className="font-mono">-₹{cart.discountAmount.toFixed(2)}</span>
            </div>
          )}
          {cart.parcelCharge > 0 && (
            <div className="flex justify-between text-muted">
              <span>{t('parcelCharge')}</span>
              <span className="font-mono">₹{cart.parcelCharge.toFixed(2)}</span>
            </div>
          )}
          {cart.roundOff !== 0 && (
            <div className="flex justify-between text-muted text-sm">
              <span>{t('roundOff')}</span>
              <span className="font-mono">{cart.roundOff > 0 ? '+' : '-'}₹{Math.abs(cart.roundOff).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-cream text-lg font-semibold pt-2 border-t border-brand-gold/20">
            <span>{t('total')}</span>
            <span className="font-mono text-brand-gold">₹{cart.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment & Place Order */}
        <div className="mt-4 space-y-3">
          {editing ? (
            <button
              onClick={handleUpdateOrder}
              disabled={disabled}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {placingOrder && <Loader2 className="animate-spin" size={20} />}
              {t('updateOrder')}
            </button>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'CARD', 'UPI'].map((method) => (
                  <button
                    key={method}
                    onClick={() => cart.setPaymentMethod(method)}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      cart.paymentMethod === method
                        ? 'bg-brand-gold text-dark-primary'
                        : 'bg-dark-secondary text-cream hover:bg-brand-gold/20'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={disabled}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placingOrder && <Loader2 className="animate-spin" size={20} />}
                {placingOrder ? t('placingOrder') : t('placeOrder')}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSplit}
                  disabled={disabled}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium bg-dark-secondary text-cream hover:bg-brand-gold/20 disabled:opacity-50"
                >
                  <SplitSquareHorizontal size={14} /> {t('splitPayment')}
                </button>
                <button
                  onClick={handlePayLater}
                  disabled={disabled}
                  className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium bg-dark-secondary text-cream hover:bg-brand-gold/20 disabled:opacity-50"
                >
                  <Clock size={14} /> {t('payLater')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {showPayment && (
      <PaymentModal
        due={cart.total}
        defaultMethod={cart.paymentMethod}
        onConfirm={(rows) => submitOrder(rows)}
        onClose={() => setShowPayment(false)}
      />
    )}

    {/* Receipt Modal - Shows after order placement */}
    {showReceipt && lastOrder && (
      <ReceiptModal
        order={lastOrder}
        settings={settings}
        onClose={() => {
          setShowReceipt(false)
          setLastOrder(null)
        }}
      />
    )}
    </>
  )
}
