import { useState } from 'react'
import { Search, Plus, Minus, Trash2, UtensilsCrossed, Package, Truck } from 'lucide-react'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'

// Sample menu data (will come from Supabase later)
const categories = [
  { id: 'all', name: 'All', icon: '🍽️' },
  { id: 'mandi', name: 'Mandi', icon: '🍚' },
  { id: 'shawarma', name: 'Shawarma', icon: '🌯' },
  { id: 'biriyani', name: 'Biriyani', icon: '🍛' },
  { id: 'grill', name: 'Grill', icon: '🔥' },
  { id: 'snacks', name: 'Snacks', icon: '🍟' },
]

const menuItems = [
  { id: 1, name: 'Chicken Mandi', variant: 'Single', price: 150, category: 'mandi' },
  { id: 2, name: 'Chicken Mandi', variant: 'Couple', price: 500, category: 'mandi' },
  { id: 3, name: 'Mutton Mandi', variant: 'Single', price: 400, category: 'mandi' },
  { id: 4, name: 'Beef Mandi', variant: 'Single', price: 350, category: 'mandi' },
  { id: 5, name: 'Chicken Shawarma', variant: null, price: 80, category: 'shawarma' },
  { id: 6, name: 'Beef Shawarma', variant: null, price: 80, category: 'shawarma' },
  { id: 7, name: 'Chicken Biriyani', variant: null, price: 120, category: 'biriyani' },
  { id: 8, name: 'Grill Chicken', variant: 'Half', price: 220, category: 'grill' },
  { id: 9, name: 'French Fries', variant: null, price: 60, category: 'snacks' },
  { id: 10, name: 'Chicken Burger', variant: null, price: 90, category: 'snacks' },
]

export default function POS() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const cart = useCart()

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handlePlaceOrder = () => {
    if (cart.items.length === 0) {
      toast.error('Cart is empty!')
      return
    }
    toast.success('Order placed successfully!')
    cart.clearCart()
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)]">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-search pl-11"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-brand-gold text-dark-primary font-semibold'
                  : 'bg-dark-secondary/50 text-cream hover:bg-dark-secondary'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <div
                key={`${item.id}-${item.variant}`}
                onClick={() => cart.addItem(item)}
                className="card-menu-item"
              >
                <div className="text-3xl mb-2">🍽️</div>
                <h4 className="text-cream font-medium text-sm">{item.name}</h4>
                {item.variant && (
                  <p className="text-muted text-xs">{item.variant}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="price-badge">₹{item.price}</span>
                  <Plus className="text-accent-amber" size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 flex flex-col card">
        {/* Order Type */}
        <div className="mb-4">
          <p className="text-muted text-sm mb-2">Order Type</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'DINE_IN', icon: UtensilsCrossed, label: 'Dine In' },
              { value: 'TAKEAWAY', icon: Package, label: 'Takeaway' },
              { value: 'DELIVERY', icon: Truck, label: 'Delivery' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => cart.setOrderType(value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  cart.orderType === value
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold'
                    : 'border-brand-gold/20 text-muted hover:border-brand-gold/40'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {cart.orderType === 'DINE_IN' && (
          <div className="mb-4">
            <label className="text-muted text-sm mb-2 block">Table Number</label>
            <input
              type="number"
              value={cart.tableNumber}
              onChange={(e) => cart.setTableNumber(e.target.value)}
              className="input"
              placeholder="Enter table number"
            />
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto mb-4">
          <h3 className="text-cream font-semibold mb-3">Cart Items ({cart.itemCount})</h3>
          {cart.items.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <p>Cart is empty</p>
              <p className="text-sm">Click on items to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.items.map((item) => (
                <div
                  key={`${item.id}-${item.variant}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-dark-primary/50 border border-brand-gold/10"
                >
                  <div className="flex-1">
                    <p className="text-cream text-sm">{item.name}</p>
                    {item.variant && <p className="text-muted text-xs">{item.variant}</p>}
                    <p className="text-brand-gold font-mono text-sm">₹{item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.variant, item.quantity - 1)}
                      className="w-7 h-7 rounded bg-dark-secondary flex items-center justify-center text-cream hover:bg-brand-gold/20"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-cream w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.variant, item.quantity + 1)}
                      className="w-7 h-7 rounded bg-dark-secondary flex items-center justify-center text-cream hover:bg-brand-gold/20"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => cart.removeItem(item.id, item.variant)}
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

        {/* Totals */}
        <div className="border-t border-brand-gold/20 pt-4 space-y-2">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="font-mono">₹{cart.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>GST ({cart.taxPercentage}%)</span>
            <span className="font-mono">₹{cart.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-cream text-lg font-semibold pt-2 border-t border-brand-gold/20">
            <span>Total</span>
            <span className="font-mono text-brand-gold">₹{cart.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment & Place Order */}
        <div className="mt-4 space-y-3">
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
            disabled={cart.items.length === 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  )
}
