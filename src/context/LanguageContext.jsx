import { createContext, useContext, useState, useEffect } from 'react'

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    pos: 'POS',
    orders: 'Orders',
    reports: 'Reports',
    menu: 'Menu',
    kitchen: 'Kitchen',
    settings: 'Settings',
    logout: 'Logout',
    
    // Common
    search: 'Search',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    refresh: 'Refresh',
    loading: 'Loading...',
    noData: 'No data found',
    
    // Dashboard
    todaysSales: "Today's Sales",
    totalOrders: 'Total Orders',
    activeOrders: 'Active Orders',
    avgOrder: 'Avg Order',
    recentOrders: 'Recent Orders',
    topSelling: 'Top Selling Today',
    noOrdersYet: 'No orders yet today',
    
    // POS
    searchMenu: 'Search menu items...',
    orderType: 'Order Type',
    dineIn: 'Dine In',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    tableNumber: 'Table Number',
    enterTableNumber: 'Enter table number',
    customerName: 'Customer Name',
    phoneNumber: 'Phone Number',
    address: 'Address',
    deliveryAddress: 'Delivery address',
    cartItems: 'Cart Items',
    cartEmpty: 'Cart is empty',
    clickToAdd: 'Click on items to add',
    subtotal: 'Subtotal',
    discount: 'Discount',
    gst: 'GST',
    total: 'Total',
    placeOrder: 'Place Order',
    placingOrder: 'Placing Order...',
    noItemsFound: 'No items found',
    
    // Orders
    allOrders: 'All',
    pending: 'Pending',
    preparing: 'Preparing',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noOrdersFound: 'No orders found',
    ordersAppearHere: 'Orders will appear here when placed from POS',
    markAs: 'Mark as',
    table: 'Table',
    
    // Kitchen
    kitchenDisplay: 'Kitchen Display',
    newOrders: 'NEW ORDERS',
    cooking: 'Cooking',
    startPreparing: 'Start Preparing',
    readyToServe: 'Ready to Serve',
    completeClose: 'Complete & Close',
    noNewOrders: 'No new orders',
    nothingCooking: 'Nothing cooking',
    noReadyOrders: 'No ready orders',
    
    // Menu
    menuManagement: 'Menu Management',
    addItem: 'Add Item',
    totalItems: 'Total Items',
    categories: 'Categories',
    available: 'Available',
    unavailable: 'Unavailable',
    itemName: 'Item Name',
    variant: 'Variant',
    price: 'Price',
    category: 'Category',
    selectCategory: 'Select Category',
    vegetarian: 'Vegetarian',
    addNewItem: 'Add New Item',
    editItem: 'Edit Item',
    
    // Reports
    salesReports: 'Sales Reports',
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Week',
    month: 'Month',
    cashSales: 'Cash Sales',
    paymentMethods: 'Payment Methods',
    orderTypes: 'Order Types',
    topSellingItems: 'Top Selling Items',
    qtySold: 'Qty Sold',
    revenue: 'Revenue',
    noSalesData: 'No sales data for this period',
    
    // Settings
    restaurantName: 'Restaurant Name',
    restaurantAddress: 'Restaurant Address',
    language: 'Language',
    english: 'English',
    tamil: 'Tamil',
    
    // Status messages
    orderPlacedSuccess: 'Order placed successfully!',
    failedToLoad: 'Failed to load',
    itemDeleted: 'Item deleted',
    itemCreated: 'Item created',
    itemUpdated: 'Item updated',
    cartIsEmpty: 'Cart is empty!',
    pleaseEnterTable: 'Please enter table number!',
  },
  
  ta: {
    // Navigation
    dashboard: 'டாஷ்போர்டு',
    pos: 'பில்லிங்',
    orders: 'ஆர்டர்கள்',
    reports: 'அறிக்கைகள்',
    menu: 'மெனு',
    kitchen: 'சமையலறை',
    settings: 'அமைப்புகள்',
    logout: 'வெளியேறு',
    
    // Common
    search: 'தேடு',
    save: 'சேமி',
    cancel: 'ரத்து',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    add: 'சேர்',
    refresh: 'புதுப்பி',
    loading: 'ஏற்றுகிறது...',
    noData: 'தரவு இல்லை',
    
    // Dashboard
    todaysSales: 'இன்றைய விற்பனை',
    totalOrders: 'மொத்த ஆர்டர்கள்',
    activeOrders: 'செயலில் உள்ள ஆர்டர்கள்',
    avgOrder: 'சராசரி ஆர்டர்',
    recentOrders: 'சமீபத்திய ஆர்டர்கள்',
    topSelling: 'இன்று அதிகம் விற்பனை',
    noOrdersYet: 'இன்று ஆர்டர்கள் இல்லை',
    
    // POS
    searchMenu: 'மெனு தேடு...',
    orderType: 'ஆர்டர் வகை',
    dineIn: 'இங்கே சாப்பிட',
    takeaway: 'பார்சல்',
    delivery: 'டெலிவரி',
    tableNumber: 'டேபிள் எண்',
    enterTableNumber: 'டேபிள் எண் உள்ளிடவும்',
    customerName: 'வாடிக்கையாளர் பெயர்',
    phoneNumber: 'தொலைபேசி எண்',
    address: 'முகவரி',
    deliveryAddress: 'டெலிவரி முகவரி',
    cartItems: 'கார்ட் பொருட்கள்',
    cartEmpty: 'கார்ட் காலியாக உள்ளது',
    clickToAdd: 'சேர்க்க பொருட்களை கிளிக் செய்யவும்',
    subtotal: 'துணை மொத்தம்',
    discount: 'தள்ளுபடி',
    gst: 'ஜிஎஸ்டி',
    total: 'மொத்தம்',
    placeOrder: 'ஆர்டர் செய்',
    placingOrder: 'ஆர்டர் செய்கிறது...',
    noItemsFound: 'பொருட்கள் இல்லை',
    
    // Orders
    allOrders: 'அனைத்தும்',
    pending: 'நிலுவையில்',
    preparing: 'தயாரிக்கிறது',
    ready: 'தயார்',
    completed: 'முடிந்தது',
    cancelled: 'ரத்து செய்யப்பட்டது',
    noOrdersFound: 'ஆர்டர்கள் இல்லை',
    ordersAppearHere: 'POS இல் இருந்து ஆர்டர் செய்யும்போது இங்கே தோன்றும்',
    markAs: 'ஆக மாற்று',
    table: 'டேபிள்',
    
    // Kitchen
    kitchenDisplay: 'சமையலறை காட்சி',
    newOrders: 'புதிய ஆர்டர்கள்',
    cooking: 'சமைக்கிறது',
    startPreparing: 'தயாரிக்க ஆரம்பி',
    readyToServe: 'பரிமாற தயார்',
    completeClose: 'முடிவு & மூடு',
    noNewOrders: 'புதிய ஆர்டர்கள் இல்லை',
    nothingCooking: 'எதுவும் சமைக்கவில்லை',
    noReadyOrders: 'தயார் ஆர்டர்கள் இல்லை',
    
    // Menu
    menuManagement: 'மெனு நிர்வாகம்',
    addItem: 'பொருள் சேர்',
    totalItems: 'மொத்த பொருட்கள்',
    categories: 'வகைகள்',
    available: 'கிடைக்கும்',
    unavailable: 'கிடைக்காது',
    itemName: 'பொருள் பெயர்',
    variant: 'வகை',
    price: 'விலை',
    category: 'வகை',
    selectCategory: 'வகை தேர்வு',
    vegetarian: 'சைவம்',
    addNewItem: 'புதிய பொருள் சேர்',
    editItem: 'பொருள் திருத்து',
    
    // Reports
    salesReports: 'விற்பனை அறிக்கைகள்',
    today: 'இன்று',
    yesterday: 'நேற்று',
    week: 'வாரம்',
    month: 'மாதம்',
    cashSales: 'பண விற்பனை',
    paymentMethods: 'கட்டண முறைகள்',
    orderTypes: 'ஆர்டர் வகைகள்',
    topSellingItems: 'அதிகம் விற்பனையான பொருட்கள்',
    qtySold: 'விற்ற அளவு',
    revenue: 'வருவாய்',
    noSalesData: 'இந்த காலத்திற்கு விற்பனை தரவு இல்லை',
    
    // Settings
    restaurantName: 'உணவகம் பெயர்',
    restaurantAddress: 'உணவகம் முகவரி',
    language: 'மொழி',
    english: 'ஆங்கிலம்',
    tamil: 'தமிழ்',
    
    // Status messages
    orderPlacedSuccess: 'ஆர்டர் வெற்றிகரமாக வைக்கப்பட்டது!',
    failedToLoad: 'ஏற்றுவதில் தோல்வி',
    itemDeleted: 'பொருள் நீக்கப்பட்டது',
    itemCreated: 'பொருள் உருவாக்கப்பட்டது',
    itemUpdated: 'பொருள் புதுப்பிக்கப்பட்டது',
    cartIsEmpty: 'கார்ட் காலியாக உள்ளது!',
    pleaseEnterTable: 'டேபிள் எண் உள்ளிடவும்!',
  }
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language')
    return saved || 'en'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const t = (key) => {
    return translations[language][key] || key
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ta' : 'en')
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
