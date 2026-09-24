import { forwardRef } from 'react'
import { format } from 'date-fns'

const Receipt = forwardRef(({ order, settings = {} }, ref) => {
  const restaurantName = settings.restaurant_name || 'Arabian Bismi Mandi Restaurant'
  const restaurantAddress = settings.restaurant_address || 'Near Kovilady Bus Stand, Main Road, Chakkarapalli'
  const restaurantPhone = settings.restaurant_phone || '9894092449 | 9025499668'

  if (!order) return null

  return (
    <div ref={ref} className="bg-white text-black p-4 w-[300px] font-mono text-sm">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">{restaurantName}</h1>
        <p className="text-xs">{restaurantAddress}</p>
        <p className="text-xs">Ph: {restaurantPhone}</p>
        <div className="border-b border-dashed border-gray-400 my-2" />
      </div>

      {/* Order Info */}
      <div className="mb-3">
        <div className="flex justify-between">
          <span className="font-bold">{order.order_number}</span>
          <span>{format(new Date(order.created_at), 'dd/MM/yy HH:mm')}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>{order.order_type?.replace('_', ' ')}</span>
          {order.table_number && <span>Table: {order.table_number}</span>}
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      {/* Items */}
      <div className="mb-3">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span>Item</span>
          <span>Qty</span>
          <span>Price</span>
        </div>
        {order.order_items?.map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs mb-1">
            <span className="flex-1 truncate pr-2">
              {item.item_name}
              {item.variant && <span className="text-gray-500"> ({item.variant})</span>}
            </span>
            <span className="w-8 text-center">{item.quantity}</span>
            <span className="w-16 text-right">₹{parseFloat(item.total_price).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      {/* Totals */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{parseFloat(order.subtotal).toFixed(2)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>GST ({order.tax_percentage || 5}%)</span>
          <span>₹{parseFloat(order.tax_amount).toFixed(2)}</span>
        </div>
        <div className="border-b border-dashed border-gray-400 my-1" />
        <div className="flex justify-between font-bold text-base">
          <span>Total</span>
          <span>₹{parseFloat(order.total_amount).toFixed(2)}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-gray-400 my-2" />

      {/* Payment */}
      <div className="text-xs mb-3">
        <div className="flex justify-between">
          <span>Payment Method</span>
          <span>{order.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-bold">{order.payment_status}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs mt-4">
        <p>Thank you for dining with us!</p>
        <p className="text-gray-500 mt-1">"Good Food Brings People Together"</p>
        <div className="border-b border-dashed border-gray-400 my-2" />
        <p className="text-gray-400">Powered by Arabian Bismi POS</p>
      </div>
    </div>
  )
})

Receipt.displayName = 'Receipt'

export default Receipt
