import { useState, useEffect } from 'react'
import {
  Gift, Plus, Trash2, Edit3, MessageCircle, Users, Calendar,
  Percent, IndianRupee, Loader2, X, Send, CheckSquare, Square,
  Search, Clock, Tag, Phone
} from 'lucide-react'
import { getOffers, createOffer, updateOffer, deleteOffer, getCustomers } from '../lib/supabase'
import { useLanguage } from '../context/LanguageContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function Offers() {
  const { language } = useLanguage()
  const [offers, setOffers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [activeTab, setActiveTab] = useState('offers') // 'offers' | 'customers'
  const [sending, setSending] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState(null)

  // Form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [offersResult, customersResult] = await Promise.all([
      getOffers(),
      getCustomers()
    ])
    if (offersResult.data) setOffers(offersResult.data)
    if (customersResult.data) setCustomers(customersResult.data)
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true,
    })
    setEditingOffer(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error(language === 'ta' ? 'தலைப்பு தேவை' : 'Title is required')
      return
    }

    try {
      if (editingOffer) {
        const { error } = await updateOffer(editingOffer.id, form)
        if (error) throw error
        toast.success(language === 'ta' ? 'சலுகை புதுப்பிக்கப்பட்டது!' : 'Offer updated!')
      } else {
        const { error } = await createOffer(form)
        if (error) throw error
        toast.success(language === 'ta' ? 'சலுகை உருவாக்கப்பட்டது!' : 'Offer created!')
      }
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Failed to save offer')
    }
  }

  const handleEdit = (offer) => {
    setForm({
      title: offer.title,
      description: offer.description || '',
      discount_type: offer.discount_type || 'percentage',
      discount_value: offer.discount_value || '',
      valid_from: offer.valid_from ? offer.valid_from.split('T')[0] : '',
      valid_until: offer.valid_until ? offer.valid_until.split('T')[0] : '',
      is_active: offer.is_active,
    })
    setEditingOffer(offer)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm(language === 'ta' ? 'நிச்சயமா நீக்க வேண்டுமா?' : 'Are you sure you want to delete this offer?')) return
    try {
      await deleteOffer(id)
      toast.success(language === 'ta' ? 'சலுகை நீக்கப்பட்டது' : 'Offer deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete offer')
    }
  }

  const handleToggleActive = async (offer) => {
    try {
      await updateOffer(offer.id, { is_active: !offer.is_active })
      fetchData()
      toast.success(offer.is_active
        ? (language === 'ta' ? 'சலுகை முடக்கப்பட்டது' : 'Offer deactivated')
        : (language === 'ta' ? 'சலுகை செயல்படுத்தப்பட்டது' : 'Offer activated'))
    } catch (error) {
      toast.error('Failed to update offer')
    }
  }

  // Customer selection
  const toggleCustomer = (phone) => {
    setSelectedCustomers(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    )
  }

  const selectAllCustomers = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.customer_phone))
    }
  }

  const filteredCustomers = customers.filter(c => {
    const query = customerSearch.toLowerCase()
    return (
      c.customer_phone?.toLowerCase().includes(query) ||
      c.customer_name?.toLowerCase().includes(query)
    )
  })

  // Generate WhatsApp message for an offer
  const generateOfferMessage = (offer) => {
    const discountText = offer.discount_type === 'percentage'
      ? `${offer.discount_value}% OFF`
      : `₹${offer.discount_value} OFF`

    const validDates = offer.valid_until
      ? `📅 Valid: ${format(new Date(offer.valid_from), 'dd MMM')} - ${format(new Date(offer.valid_until), 'dd MMM yyyy')}`
      : `📅 Starting: ${format(new Date(offer.valid_from), 'dd MMM yyyy')}`

    return `
🎉 *Arabian Bismi Mandi Restaurant*
━━━━━━━━━━━━━━━
🔥 *${offer.title}*
${offer.description ? `\n${offer.description}\n` : ''}
💰 *${discountText}*

${validDates}
📍 Near Kovilady Bus Stand, Chakkarapalli
📞 9894092449 | 9025499668

Visit us today! 🙏
_"Good Food Brings People Together"_
    `.trim()
  }

  // Send offer to a single customer
  const sendToCustomer = (phone, offer) => {
    const message = encodeURIComponent(generateOfferMessage(offer))
    const cleanPhone = phone.replace(/\D/g, '')
    const whatsappPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, '_blank')
  }

  // Send offer to selected customers (opens WhatsApp for each)
  const sendToSelected = (offer) => {
    if (selectedCustomers.length === 0) {
      toast.error(language === 'ta' ? 'வாடிக்கையாளர்களை தேர்வு செய்யவும்' : 'Please select customers first')
      return
    }

    setSending(true)
    let count = 0

    // Open WhatsApp for each customer with a small delay
    selectedCustomers.forEach((phone, index) => {
      setTimeout(() => {
        sendToCustomer(phone, offer)
        count++
        if (count === selectedCustomers.length) {
          setSending(false)
          toast.success(
            language === 'ta'
              ? `${count} வாடிக்கையாளர்களுக்கு அனுப்பப்பட்டது!`
              : `Sent to ${count} customers!`
          )
        }
      }, index * 1500) // 1.5 sec delay between each
    })
  }

  // Labels
  const l = {
    pageTitle: language === 'ta' ? '🎉 சலுகைகள் & அறிவிப்புகள்' : '🎉 Offers & Notifications',
    activeOffers: language === 'ta' ? 'செயலில் உள்ள சலுகைகள்' : 'Active Offers',
    allOffers: language === 'ta' ? 'அனைத்து சலுகைகள்' : 'All Offers',
    customers: language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers',
    newOffer: language === 'ta' ? '+ புதிய சலுகை' : '+ New Offer',
    offerTitle: language === 'ta' ? 'சலுகை தலைப்பு' : 'Offer Title',
    description: language === 'ta' ? 'விளக்கம்' : 'Description',
    discountType: language === 'ta' ? 'தள்ளுபடி வகை' : 'Discount Type',
    discountValue: language === 'ta' ? 'தள்ளுபடி மதிப்பு' : 'Discount Value',
    validFrom: language === 'ta' ? 'தொடக்க தேதி' : 'Valid From',
    validUntil: language === 'ta' ? 'கடைசி தேதி' : 'Valid Until',
    save: language === 'ta' ? 'சேமி' : 'Save Offer',
    saveAndSend: language === 'ta' ? 'சேமி & WhatsApp அனுப்பு' : 'Save & Send WhatsApp',
    cancel: language === 'ta' ? 'ரத்து' : 'Cancel',
    noOffers: language === 'ta' ? 'சலுகைகள் இல்லை' : 'No offers yet',
    createFirst: language === 'ta' ? 'முதல் சலுகையை உருவாக்கவும்' : 'Create your first offer!',
    sendToAll: language === 'ta' ? 'அனைவருக்கும் அனுப்பு' : 'Send to All',
    sendSelected: language === 'ta' ? 'தேர்ந்தவர்களுக்கு அனுப்பு' : 'Send to Selected',
    searchCustomers: language === 'ta' ? 'வாடிக்கையாளர் தேடு...' : 'Search customers...',
    noCustomers: language === 'ta' ? 'வாடிக்கையாளர்கள் இல்லை' : 'No customers found',
    customerNote: language === 'ta' ? 'POS இல் ஆர்டர் செய்யும்போது தொலைபேசி எண் சேர்த்தால் வாடிக்கையாளர்கள் தானாக சேர்க்கப்படுவார்கள்' : 'Customers are auto-collected from POS orders when phone number is entered',
    selectOffer: language === 'ta' ? 'சலுகையை தேர்வு செய்யவும்' : 'Select an offer first',
    expired: language === 'ta' ? 'காலாவதி' : 'Expired',
    active: language === 'ta' ? 'செயலில்' : 'Active',
    inactive: language === 'ta' ? 'செயலற்றது' : 'Inactive',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand-gold mx-auto mb-4" />
          <p className="text-muted">{language === 'ta' ? 'ஏற்றுகிறது...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }

  const activeOffers = offers.filter(o => o.is_active)
  const isExpired = (offer) => offer.valid_until && new Date(offer.valid_until) < new Date()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cream">{l.pageTitle}</h1>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          {l.newOffer}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('offers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'offers'
              ? 'bg-brand-gold text-dark-primary font-semibold'
              : 'bg-dark-secondary text-cream hover:bg-dark-secondary/80'
          }`}
        >
          <Gift size={18} />
          {l.allOffers} ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            activeTab === 'customers'
              ? 'bg-brand-gold text-dark-primary font-semibold'
              : 'bg-dark-secondary text-cream hover:bg-dark-secondary/80'
          }`}
        >
          <Users size={18} />
          {l.customers} ({customers.length})
        </button>
      </div>

      {/* ============================================ */}
      {/* OFFERS TAB */}
      {/* ============================================ */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          {offers.length === 0 ? (
            <div className="card p-12 text-center">
              <Gift className="w-16 h-16 text-brand-gold/30 mx-auto mb-4" />
              <h3 className="text-cream text-lg font-semibold">{l.noOffers}</h3>
              <p className="text-muted mt-2">{l.createFirst}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`card p-4 border-2 transition-all ${
                    offer.is_active && !isExpired(offer)
                      ? 'border-brand-gold/30 hover:border-brand-gold/60'
                      : 'border-muted/20 opacity-70'
                  } ${selectedOffer?.id === offer.id ? 'ring-2 ring-brand-gold' : ''}`}
                >
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="text-brand-gold" size={18} />
                      {offer.discount_value > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold">
                          {offer.discount_type === 'percentage'
                            ? `${offer.discount_value}% OFF`
                            : `₹${offer.discount_value} OFF`
                          }
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isExpired(offer)
                        ? 'bg-red-500/20 text-red-400'
                        : offer.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-muted/20 text-muted'
                    }`}>
                      {isExpired(offer) ? l.expired : offer.is_active ? l.active : l.inactive}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-cream font-bold text-base mb-1">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-muted text-sm mb-3 line-clamp-2">{offer.description}</p>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-2 text-muted text-xs mb-4">
                    <Calendar size={12} />
                    <span>
                      {offer.valid_from ? format(new Date(offer.valid_from), 'dd MMM') : ''}
                      {offer.valid_until ? ` - ${format(new Date(offer.valid_until), 'dd MMM yyyy')}` : ' onwards'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedOffer(selectedOffer?.id === offer.id ? null : offer)}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        selectedOffer?.id === offer.id
                          ? 'bg-green-600 text-white'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      <MessageCircle size={14} />
                      {selectedOffer?.id === offer.id ? '✓ Selected' : 'WhatsApp'}
                    </button>
                    <button
                      onClick={() => handleEdit(offer)}
                      className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-all"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(offer)}
                      className={`p-2 rounded-lg transition-all ${
                        offer.is_active
                          ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      {offer.is_active ? <Clock size={14} /> : <Gift size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id)}
                      className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* CUSTOMERS TAB */}
      {/* ============================================ */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Selected offer badge */}
          {selectedOffer ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-3">
                <Gift className="text-green-400" size={20} />
                <div>
                  <p className="text-cream font-medium text-sm">{language === 'ta' ? 'அனுப்ப தேர்ந்தெடுக்கப்பட்ட சலுகை:' : 'Sending offer:'} <span className="text-green-400">{selectedOffer.title}</span></p>
                  <p className="text-muted text-xs">{language === 'ta' ? 'கீழே வாடிக்கையாளர்களை தேர்வு செய்து அனுப்பவும்' : 'Select customers below and click Send'}</p>
                </div>
              </div>
              <button
                onClick={() => sendToSelected(selectedOffer)}
                disabled={selectedCustomers.length === 0 || sending}
                className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
              >
                {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                {l.sendSelected} ({selectedCustomers.length})
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-yellow-400 text-sm flex items-center gap-2">
                <Gift size={16} />
                {l.selectOffer}
                <button
                  onClick={() => setActiveTab('offers')}
                  className="underline hover:text-yellow-300"
                >
                  {language === 'ta' ? 'சலுகைகள் பக்கம் செல்' : 'Go to Offers tab'}
                </button>
              </p>
            </div>
          )}

          {/* Search & Select All */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input
                type="text"
                placeholder={l.searchCustomers}
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <button
              onClick={selectAllCustomers}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-secondary text-cream hover:bg-brand-gold/20 transition-all text-sm"
            >
              {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                <CheckSquare size={16} className="text-brand-gold" />
              ) : (
                <Square size={16} />
              )}
              {language === 'ta' ? 'அனைத்தையும் தேர்வு' : 'Select All'}
            </button>
          </div>

          {/* Info note */}
          <p className="text-muted text-xs flex items-center gap-1">
            <Phone size={12} />
            {l.customerNote}
          </p>

          {/* Customer List */}
          {filteredCustomers.length === 0 ? (
            <div className="card p-12 text-center">
              <Users className="w-16 h-16 text-brand-gold/30 mx-auto mb-4" />
              <h3 className="text-cream text-lg font-semibold">{l.noCustomers}</h3>
              <p className="text-muted mt-2 text-sm">{l.customerNote}</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-dark-primary/50 text-muted text-xs font-semibold border-b border-brand-gold/10">
                <div className="col-span-1">☑</div>
                <div className="col-span-3">{language === 'ta' ? 'பெயர்' : 'Name'}</div>
                <div className="col-span-3">{language === 'ta' ? 'தொலைபேசி' : 'Phone'}</div>
                <div className="col-span-2 text-center">{language === 'ta' ? 'ஆர்டர்கள்' : 'Orders'}</div>
                <div className="col-span-2">{language === 'ta' ? 'கடைசி வருகை' : 'Last Visit'}</div>
                <div className="col-span-1 text-center">📱</div>
              </div>

              {/* Customer Rows */}
              <div className="max-h-[400px] overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.customer_phone}
                    onClick={() => toggleCustomer(customer.customer_phone)}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-all border-b border-brand-gold/5 ${
                      selectedCustomers.includes(customer.customer_phone)
                        ? 'bg-brand-gold/10'
                        : 'hover:bg-dark-primary/30'
                    }`}
                  >
                    <div className="col-span-1">
                      {selectedCustomers.includes(customer.customer_phone) ? (
                        <CheckSquare size={16} className="text-brand-gold" />
                      ) : (
                        <Square size={16} className="text-muted" />
                      )}
                    </div>
                    <div className="col-span-3 text-cream text-sm truncate">
                      {customer.customer_name || '—'}
                    </div>
                    <div className="col-span-3 text-cream font-mono text-sm">
                      {customer.customer_phone}
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold">
                        {customer.order_count}
                      </span>
                    </div>
                    <div className="col-span-2 text-muted text-xs">
                      {format(new Date(customer.last_visit), 'dd MMM yy')}
                    </div>
                    <div className="col-span-1 text-center">
                      {selectedOffer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            sendToCustomer(customer.customer_phone, selectedOffer)
                          }}
                          className="p-1 rounded hover:bg-green-600/20 text-green-400"
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-dark-primary/50 flex items-center justify-between text-xs">
                <span className="text-muted">
                  {language === 'ta'
                    ? `${filteredCustomers.length} வாடிக்கையாளர்கள் | ${selectedCustomers.length} தேர்ந்தெடுக்கப்பட்டவை`
                    : `${filteredCustomers.length} customers | ${selectedCustomers.length} selected`
                  }
                </span>
                {selectedOffer && selectedCustomers.length > 0 && (
                  <button
                    onClick={() => sendToSelected(selectedOffer)}
                    disabled={sending}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-all disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="animate-spin" size={12} /> : <Send size={12} />}
                    {l.sendSelected} ({selectedCustomers.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* CREATE/EDIT OFFER MODAL */}
      {/* ============================================ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-secondary rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-brand-gold/20">
              <h2 className="text-lg font-bold text-cream flex items-center gap-2">
                <Gift className="text-brand-gold" size={20} />
                {editingOffer
                  ? (language === 'ta' ? 'சலுகை திருத்து' : 'Edit Offer')
                  : (language === 'ta' ? 'புதிய சலுகை' : 'New Offer')
                }
              </h2>
              <button onClick={resetForm} className="p-2 text-muted hover:text-cream rounded-lg hover:bg-dark-primary">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-muted text-sm mb-1 block">{l.offerTitle} *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input"
                  placeholder="e.g., Mandi Combo Deal!"
                />
              </div>

              <div>
                <label className="text-muted text-sm mb-1 block">{l.description}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows={3}
                  placeholder="e.g., Buy 2 Chicken Mandi, Get 1 FREE!"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted text-sm mb-1 block">{l.discountType}</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm(prev => ({ ...prev, discount_type: e.target.value }))}
                    className="input"
                  >
                    <option value="percentage">% Percentage</option>
                    <option value="fixed">₹ Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted text-sm mb-1 block">{l.discountValue}</label>
                  <div className="relative">
                    {form.discount_type === 'percentage' ? (
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    ) : (
                      <IndianRupee className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                    )}
                    <input
                      type="number"
                      value={form.discount_value}
                      onChange={(e) => setForm(prev => ({ ...prev, discount_value: e.target.value }))}
                      className="input pr-10"
                      placeholder={form.discount_type === 'percentage' ? '20' : '50'}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted text-sm mb-1 block">{l.validFrom}</label>
                  <input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm(prev => ({ ...prev, valid_from: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-muted text-sm mb-1 block">{l.validUntil}</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm(prev => ({ ...prev, valid_until: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={resetForm} className="btn-secondary flex-1">{l.cancel}</button>
                <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Gift size={16} />
                  {l.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
