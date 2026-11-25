import { createContext, useContext, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { computeBill, newId } from '../lib/billing'
import { useAppSettings } from './SettingsContext'

const CartContext = createContext({})

export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [orderType, setOrderType] = useState('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [discountType, setDiscountType] = useState(null)
  const [discountValue, setDiscountValue] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [tableId, setTableId] = useState(null)
  // One id per cart: retrying "Place order" returns the same bill instead of
  // creating a duplicate. A new id is made only when the cart is cleared.
  const [orderId, setOrderId] = useState(newId)
  const [quickPaymentId, setQuickPaymentId] = useState(newId)
  // Set when a running (unpaid) order is opened to add more items.
  const [editingOrder, setEditingOrder] = useState(null)
  const { billConfig } = useAppSettings()

  const addItem = useCallback((item) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(
        i => i.id === item.id && i.variant === item.variant
      )
      
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex].quantity += 1
        toast.success(`${item.name} quantity updated`)
        return updated
      }
      
      toast.success(`${item.name} added to cart`)
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeItem = useCallback((itemId, variant) => {
    setItems(prev => prev.filter(i => !(i.id === itemId && i.variant === variant)))
    toast.success('Item removed')
  }, [])

  const updateQuantity = useCallback((itemId, variant, quantity) => {
    if (quantity < 1) {
      removeItem(itemId, variant)
      return
    }
    setItems(prev => prev.map(item => 
      item.id === itemId && item.variant === variant
        ? { ...item, quantity }
        : item
    ))
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    setTableNumber('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerAddress('')
    setDiscountType(null)
    setDiscountValue(0)
    setNotes('')
    setTableId(null)
    setEditingOrder(null)
    setOrderId(newId())
    setQuickPaymentId(newId())
  }, [])

  // Load a running order into the cart so more items can be added.
  const loadOrder = useCallback((order) => {
    setItems((order.order_items || []).map((i) => ({
      id: i.menu_item_id,
      name: i.item_name,
      variant: i.variant,
      price: parseFloat(i.unit_price),
      quantity: i.quantity,
    })))
    setOrderType(order.order_type)
    setTableId(order.table_id || null)
    setTableNumber(order.table_number || '')
    setCustomerName(order.customer_name || '')
    setCustomerPhone(order.customer_phone || '')
    setCustomerAddress(order.customer_address || '')
    setDiscountType(order.discount_type || null)
    setDiscountValue(parseFloat(order.discount_value) || 0)
    setNotes(order.notes || '')
    setEditingOrder({ id: order.id, version: order.version, order_number: order.order_number })
  }, [])

  // Calculations
  const bill = computeBill(items, { type: discountType, value: discountValue }, orderType, billConfig)
  const subtotal = bill.subtotal
  const discountAmount = bill.discount
  const parcelCharge = bill.parcelCharge
  const roundOff = bill.roundOff
  const taxPercentage = 0
  const taxAmount = 0
  const total = bill.total

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const value = {
    items,
    orderType,
    tableNumber,
    customerName,
    customerPhone,
    customerAddress,
    discountType,
    discountValue,
    paymentMethod,
    notes,
    subtotal,
    discountAmount,
    parcelCharge,
    roundOff,
    tableId,
    setTableId,
    orderId,
    quickPaymentId,
    editingOrder,
    loadOrder,
    taxPercentage,
    taxAmount,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setOrderType,
    setTableNumber,
    setCustomerName,
    setCustomerPhone,
    setCustomerAddress,
    setDiscountType,
    setDiscountValue,
    setPaymentMethod,
    setNotes,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}
