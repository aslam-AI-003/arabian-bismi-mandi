import { createContext, useContext, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

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

  const TAX_PERCENTAGE = 5 // GST 5%

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
  }, [])

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const discountAmount = discountType === 'PERCENTAGE' 
    ? (subtotal * discountValue / 100)
    : (discountType === 'FIXED' ? discountValue : 0)
  
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (TAX_PERCENTAGE / 100)
  const total = taxableAmount + taxAmount

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
    taxPercentage: TAX_PERCENTAGE,
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
