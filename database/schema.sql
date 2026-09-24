-- ============================================
-- ARABIAN BISMI MANDI - DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENU ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  description TEXT,
  variant VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  is_available BOOLEAN DEFAULT true,
  is_vegetarian BOOLEAN DEFAULT false,
  preparation_time INTEGER DEFAULT 15,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')),
  order_status VARCHAR(20) DEFAULT 'PENDING' CHECK (order_status IN ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
  table_number VARCHAR(10),
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  customer_address TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type VARCHAR(20),
  discount_value DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 5.00,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'WALLET')),
  payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'REFUNDED')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name VARCHAR(200) NOT NULL,
  variant VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- ORDER NUMBER SEQUENCE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  today_date TEXT;
  seq_num INTEGER;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYMMDD');
  
  SELECT COUNT(*) + 1 INTO seq_num
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'ORD-' || today_date || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER FOR AUTO ORDER NUMBER
-- ============================================
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access for categories and menu items
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Public can read settings" ON settings FOR SELECT USING (true);

-- Authenticated users can do everything
CREATE POLICY "Authenticated can manage categories" ON categories FOR ALL USING (true);
CREATE POLICY "Authenticated can manage menu_items" ON menu_items FOR ALL USING (true);
CREATE POLICY "Authenticated can manage orders" ON orders FOR ALL USING (true);
CREATE POLICY "Authenticated can manage order_items" ON order_items FOR ALL USING (true);
CREATE POLICY "Authenticated can manage settings" ON settings FOR ALL USING (true);

-- ============================================
-- INSERT CATEGORIES
-- ============================================
INSERT INTO categories (name, name_ar, icon, display_order) VALUES
('Mandi', 'مندي', '🍚', 1),
('Majboos', 'مجبوس', '🍚', 2),
('Biriyani & Ghee Rice', 'برياني', '🍛', 3),
('Smoked Chicken', 'دجاج مدخن', '🍗', 4),
('Grill', 'مشويات', '🔥', 5),
('BBQ', 'باربيكيو', '🍖', 6),
('Tandoori', 'تندوري', '🍢', 7),
('Shawarma', 'شاورما', '🌯', 8),
('Momos', 'موموز', '🥟', 9),
('Burgers', 'برجر', '🍔', 10),
('Fries & Snacks', 'بطاطس ووجبات خفيفة', '🍟', 11),
('Dosa', 'دوسا', '🥞', 12),
('Rice & Noodles', 'أرز ونودلز', '🍜', 13),
('Parotta', 'باروتا', '🫓', 14),
('Ice Cream', 'آيس كريم', '🍨', 15);

-- ============================================
-- INSERT MENU ITEMS (Sample - Complete menu)
-- ============================================

-- Mandi Items
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Chicken Mandi', 'Single', 150, id FROM categories WHERE name = 'Mandi';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Chicken Mandi', 'Couple', 500, id FROM categories WHERE name = 'Mandi';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Chicken Mandi', 'Family', 1000, id FROM categories WHERE name = 'Mandi';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Mutton Mandi', 'Single', 400, id FROM categories WHERE name = 'Mandi';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Mutton Mandi', 'Couple', 800, id FROM categories WHERE name = 'Mandi';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Beef Mandi', 'Single', 350, id FROM categories WHERE name = 'Mandi';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Beef Mandi', 'Couple', 700, id FROM categories WHERE name = 'Mandi';

-- Shawarma Items
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Shawarma', 80, id FROM categories WHERE name = 'Shawarma';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Beef Shawarma', 80, id FROM categories WHERE name = 'Shawarma';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Peri Peri Shawarma', 90, id FROM categories WHERE name = 'Shawarma';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Beef Peri Peri Shawarma', 90, id FROM categories WHERE name = 'Shawarma';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Spl Shawarma', 100, id FROM categories WHERE name = 'Shawarma';

-- Biriyani Items
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Thokku Biriyani', 120, id FROM categories WHERE name = 'Biriyani & Ghee Rice';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken 65 Biriyani', 130, id FROM categories WHERE name = 'Biriyani & Ghee Rice';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Beef Thokku Biriyani', 120, id FROM categories WHERE name = 'Biriyani & Ghee Rice';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Ghee Rice + Chicken Gravy', 130, id FROM categories WHERE name = 'Biriyani & Ghee Rice';

-- Grill Items
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Grill Chicken', 'Quarter', 110, id FROM categories WHERE name = 'Grill';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Grill Chicken', 'Half', 220, id FROM categories WHERE name = 'Grill';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Grill Chicken', 'Full', 400, id FROM categories WHERE name = 'Grill';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Shawaya Chicken', 'Quarter', 120, id FROM categories WHERE name = 'Grill';
INSERT INTO menu_items (name, variant, price, category_id) 
SELECT 'Shawaya Chicken', 'Half', 240, id FROM categories WHERE name = 'Grill';

-- Burgers
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Burger', 90, id FROM categories WHERE name = 'Burgers';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Cheese Burger', 100, id FROM categories WHERE name = 'Burgers';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Beef Burger', 100, id FROM categories WHERE name = 'Burgers';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Beef Cheese Burger', 110, id FROM categories WHERE name = 'Burgers';

-- Fries
INSERT INTO menu_items (name, price, category_id) 
SELECT 'French Fries', 60, id FROM categories WHERE name = 'Fries & Snacks';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Peri Peri Fries', 70, id FROM categories WHERE name = 'Fries & Snacks';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Cheesy Fries', 80, id FROM categories WHERE name = 'Fries & Snacks';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chicken Loaded Fries', 130, id FROM categories WHERE name = 'Fries & Snacks';

-- Ice Cream
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Vanilla Ice Cream', 40, id FROM categories WHERE name = 'Ice Cream';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Chocolate Ice Cream', 50, id FROM categories WHERE name = 'Ice Cream';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Strawberry Ice Cream', 50, id FROM categories WHERE name = 'Ice Cream';
INSERT INTO menu_items (name, price, category_id) 
SELECT 'Butter Scotch Ice Cream', 60, id FROM categories WHERE name = 'Ice Cream';

-- ============================================
-- INSERT SETTINGS
-- ============================================
INSERT INTO settings (key, value) VALUES
('restaurant_name', 'Arabian Bismi Mandi Restaurant'),
('restaurant_address', 'Near Kovilady Bus Stand, Main Road, Chakkarapalli'),
('restaurant_phone', '9894092449 | 9025499668 | 9600827837'),
('tax_percentage', '5'),
('currency', 'INR'),
('currency_symbol', '₹');

-- ============================================
-- DONE! ✅
-- ============================================
