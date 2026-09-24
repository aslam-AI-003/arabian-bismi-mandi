import { TrendingUp, ShoppingBag, Clock, IndianRupee } from 'lucide-react'

const statsData = [
  { label: "Today's Sales", value: "₹45,250", icon: IndianRupee, change: "+12%", color: "text-green-400" },
  { label: "Total Orders", value: "127", icon: ShoppingBag, change: "+5%", color: "text-green-400" },
  { label: "Pending Orders", value: "8", icon: Clock, change: "", color: "text-yellow-400" },
  { label: "Avg Order", value: "₹356", icon: TrendingUp, change: "+3%", color: "text-green-400" },
]

const recentOrders = [
  { id: 'ORD-045', type: 'DINE_IN', table: 5, amount: 520, status: 'PREPARING', time: '2m ago' },
  { id: 'ORD-044', type: 'TAKEAWAY', table: null, amount: 280, status: 'READY', time: '5m ago' },
  { id: 'ORD-043', type: 'DELIVERY', table: null, amount: 650, status: 'PREPARING', time: '8m ago' },
  { id: 'ORD-042', type: 'DINE_IN', table: 3, amount: 890, status: 'COMPLETED', time: '15m ago' },
]

const topItems = [
  { name: 'Chicken Mandi Full', qty: 45 },
  { name: 'Mutton Mandi Half', qty: 32 },
  { name: 'Chicken Shawarma', qty: 28 },
  { name: 'Beef Biriyani', qty: 25 },
  { name: 'Lemon Mint', qty: 20 },
]

const statusColors = {
  PENDING: 'badge-pending',
  PREPARING: 'badge-preparing',
  READY: 'badge-ready',
  COMPLETED: 'badge-completed',
}

const typeIcons = {
  DINE_IN: '🍽️',
  TAKEAWAY: '📦',
  DELIVERY: '🛵',
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <div key={stat.label} className="stats-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-cream mt-1">{stat.value}</p>
                {stat.change && (
                  <p className={`text-sm mt-1 ${stat.color}`}>{stat.change}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
                <stat.icon className="text-brand-gold" size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold text-cream mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div 
                key={order.id}
                className="flex items-center justify-between p-3 rounded-lg bg-dark-primary/50 border border-brand-gold/10"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{typeIcons[order.type]}</span>
                  <div>
                    <p className="text-cream font-medium">{order.id}</p>
                    <p className="text-muted text-sm">
                      {order.type === 'DINE_IN' ? `Table ${order.table}` : order.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-brand-gold font-mono font-semibold">₹{order.amount}</p>
                  <span className={`badge ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling */}
        <div className="card">
          <h3 className="text-lg font-semibold text-cream mb-4">🔥 Top Selling Today</h3>
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div 
                key={item.name}
                className="flex items-center justify-between p-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-gold/20 text-brand-gold text-sm flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="text-cream">{item.name}</span>
                </div>
                <span className="text-muted font-mono">{item.qty}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
