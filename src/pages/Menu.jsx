import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, Loader2, X, Save } from 'lucide-react'
import { getCategories, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useLanguage } from '../context/LanguageContext'

const emptyItem = {
  name: '',
  variant: '',
  price: '',
  category_id: '',
  is_available: true,
  is_vegetarian: false
}

export default function Menu() {
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState(emptyItem)
  const [saving, setSaving] = useState(false)
  const { t, language } = useLanguage()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [catResult, menuResult] = await Promise.all([
        getCategories(),
        getMenuItems(null, true) // Include unavailable items for management
      ])
      if (catResult.data) setCategories(catResult.data)
      if (menuResult.data) setMenuItems(menuResult.data)
    } catch (error) {
      console.error('Error fetching menu data:', error)
    }
    setLoading(false)
  }

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = categories.find(c => c.id === item.category_id)
    const catName = cat?.name || 'Uncategorized'
    if (!acc[catName]) acc[catName] = []
    acc[catName].push(item)
    return acc
  }, {})

  const handleAdd = () => {
    setEditingItem(null)
    setFormData(emptyItem)
    setShowModal(true)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      variant: item.variant || '',
      price: item.price.toString(),
      category_id: item.category_id || '',
      is_available: item.is_available,
      is_vegetarian: item.is_vegetarian
    })
    setShowModal(true)
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await deleteMenuItem(item.id)
    if (error) {
      toast.error('Failed to delete')
    } else {
      toast.success('Item deleted')
      fetchData()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required')
      return
    }

    setSaving(true)
    const data = {
      name: formData.name,
      variant: formData.variant || null,
      price: parseFloat(formData.price),
      category_id: formData.category_id || null,
      is_available: formData.is_available,
      is_vegetarian: formData.is_vegetarian
    }

    if (editingItem) {
      const { error } = await updateMenuItem(editingItem.id, data)
      if (error) {
        toast.error('Failed to update')
      } else {
        toast.success('Item updated')
        setShowModal(false)
        fetchData()
      }
    } else {
      const { error } = await createMenuItem(data)
      if (error) {
        toast.error('Failed to create')
      } else {
        toast.success('Item created')
        setShowModal(false)
        fetchData()
      }
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <h1 className="text-2xl font-semibold text-cream">{t('menuManagement')}</h1>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus size={20} />
          {t('addItem')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-search pl-11"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input max-w-xs"
        >
          <option value="all">{language === 'ta' ? 'அனைத்து வகைகள்' : 'All Categories'}</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stats-card">
          <p className="text-muted text-sm">{t('totalItems')}</p>
          <p className="text-2xl font-bold text-cream">{menuItems.length}</p>
        </div>
        <div className="stats-card">
          <p className="text-muted text-sm">{t('categories')}</p>
          <p className="text-2xl font-bold text-cream">{categories.length}</p>
        </div>
        <div className="stats-card">
          <p className="text-muted text-sm">{t('available')}</p>
          <p className="text-2xl font-bold text-green-400">{menuItems.filter(i => i.is_available).length}</p>
        </div>
        <div className="stats-card">
          <p className="text-muted text-sm">{t('unavailable')}</p>
          <p className="text-2xl font-bold text-red-400">{menuItems.filter(i => !i.is_available).length}</p>
        </div>
      </div>

      {/* Menu List by Category */}
      {Object.keys(groupedItems).length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted">No items found</p>
        </div>
      ) : (
        Object.entries(groupedItems).map(([catName, items]) => (
          <div key={catName} className="card">
            <h3 className="text-lg font-semibold text-brand-gold mb-4">{catName}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-muted text-sm border-b border-brand-gold/20">
                    <th className="pb-3">{language === 'ta' ? 'பொருள்' : 'Item'}</th>
                    <th className="pb-3">{t('variant')}</th>
                    <th className="pb-3">{t('price')}</th>
                    <th className="pb-3">{language === 'ta' ? 'நிலை' : 'Status'}</th>
                    <th className="pb-3 text-right">{language === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-brand-gold/10 last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {item.is_vegetarian && <span className="text-green-500">🟢</span>}
                          <span className="text-cream">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted">{item.variant || '-'}</td>
                      <td className="py-3">
                        <span className="font-mono text-brand-gold">₹{parseFloat(item.price).toFixed(0)}</span>
                      </td>
                      <td className="py-3">
                        <span className={`badge ${item.is_available ? 'badge-ready' : 'badge-pending'}`}>
                          {item.is_available ? t('available') : t('unavailable')}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded hover:bg-brand-gold/10 text-brand-gold mr-2"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded hover:bg-red-500/10 text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-cream">
                {editingItem ? t('editItem') : t('addNewItem')}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-cream">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-muted text-sm mb-1 block">{t('itemName')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input"
                  placeholder="e.g., Chicken Mandi"
                />
              </div>

              <div>
                <label className="text-muted text-sm mb-1 block">{t('variant')}</label>
                <input
                  type="text"
                  value={formData.variant}
                  onChange={(e) => setFormData({...formData, variant: e.target.value})}
                  className="input"
                  placeholder="e.g., Single, Couple, Family"
                />
              </div>

              <div>
                <label className="text-muted text-sm mb-1 block">{t('price')} (₹) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="input"
                  placeholder="150"
                />
              </div>

              <div>
                <label className="text-muted text-sm mb-1 block">{t('category')}</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  className="input"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
                    className="w-4 h-4 accent-brand-gold"
                  />
                  <span className="text-cream">{t('available')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_vegetarian}
                    onChange={(e) => setFormData({...formData, is_vegetarian: e.target.checked})}
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="text-cream">{t('vegetarian')}</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {saving ? (language === 'ta' ? 'சேமிக்கிறது...' : 'Saving...') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
