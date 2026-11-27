import { useState } from 'react'
import { BarChart3, Calculator } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import SalesReport from '../components/SalesReport'
import DayClose from '../components/DayClose'

// Two tabs: Sales Report (SIP N' GOSSIP style, any period, exports) and
// Day Close (one day's numbers, cash drawer settlement, day-end slip).
const TABS = [
  { id: 'sales', key: 'salesReportTab', icon: BarChart3 },
  { id: 'dayclose', key: 'dayCloseTab', icon: Calculator },
]

export default function Reports() {
  const { t } = useLanguage()
  const [tab, setTab] = useState('sales')
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-decorative text-brand-gold">{t('reports')}</h1>
        <div className="flex rounded-full bg-dark-secondary/60 border border-brand-gold/20 p-1">
          {TABS.map(({ id, key, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm ${tab === id ? 'bg-brand-gold text-dark-primary font-semibold' : 'text-cream hover:text-brand-gold'}`}
            >
              <Icon size={16} /> {t(key)}
            </button>
          ))}
        </div>
      </div>
      {tab === 'sales' ? <SalesReport /> : <DayClose />}
    </div>
  )
}
