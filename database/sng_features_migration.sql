-- ============================================================================
-- ARABIAN BISMI MANDI - FEATURE MIGRATION (features ported from SIP N' GOSSIP)
--
-- Adds: staff & roles, dining tables, split payments + payment ledger,
-- pending balances, refunds, expenses, parcel charge, round off, safe order
-- numbers, duplicate-bill protection, first-time setup flag.
--
-- HOW TO RUN
--   1. Supabase Dashboard -> Database -> Backups: confirm a recent backup
--      exists (or export the tables) before running.
--   2. Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--
-- SAFE TO RE-RUN: every step is idempotent. Existing orders, menu, offers and
-- settlements are kept. Columns are only ADDED. Existing logins become admins
-- so nobody loses access.
--
-- Table names are prefixed (pos_staff, pos_payments, pos_expenses) so they
-- don't clash with other tables in the same Supabase project.
--
-- Run the earlier files first (schema.sql, offers_schema.sql,
-- settlement_schema.sql, add_tamil_names.sql) if they were never run.
-- ============================================================================

BEGIN;

-- Pre-flight: stop with a clear message if a table name this script needs is
-- already used by some other table (nothing is changed in that case).
DO $$
DECLARE
  chk RECORD;
BEGIN
  FOR chk IN SELECT * FROM (VALUES
      ('pos_staff', 'user_id'), ('dining_tables', 'active_order_id'), ('pos_payments', 'kind'),
      ('pos_expenses', 'expense_date'), ('order_counters', 'last_value')) AS t(tbl, col)
  LOOP
    IF to_regclass('public.' || chk.tbl) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = chk.tbl AND column_name = chk.col) THEN
      RAISE EXCEPTION 'A different table named "%" already exists. Rename it or tell the developer; nothing was changed.', chk.tbl;
    END IF;
  END LOOP;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. STAFF & ROLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_staff (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT '',
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- First run only: every login that already exists becomes an admin, so the
-- owners keep the full access they have today.
INSERT INTO pos_staff (user_id, name, phone, role)
SELECT u.id, '', split_part(u.email, '@', 1), 'admin'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM pos_staff)
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION current_staff_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM pos_staff WHERE user_id = auth.uid() AND is_active
$$;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_staff_role() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(current_staff_role() = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION app_setting(p_key TEXT, p_default TEXT)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value FROM settings WHERE key = p_key), p_default)
$$;

CREATE OR REPLACE FUNCTION _require_staff()
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'NOT_STAFF: This login has no active staff profile.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION _require_admin()
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'ADMIN_ONLY: Only an admin can do this.';
  END IF;
END $$;

-- ============================================================================
-- 2. NEW SETTINGS (defaults keep today's billing exactly the same)
-- ============================================================================
INSERT INTO settings (key, value) VALUES
  ('setup_done', 'false'),
  ('parcel_charge', '0'),
  ('parcel_mode', 'per_item'),
  ('parcel_order_types', 'TAKEAWAY,DELIVERY'),
  ('round_off', 'false'),
  ('cashier_can_discount', 'false'),
  ('cashier_can_cancel', 'true'),
  ('expense_categories', '["Raw materials","Meat & chicken","Vegetables","Gas","Packaging","Electricity","Rent","Staff salaries","Maintenance","Other"]')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. DINING TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS dining_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE,
  seats INTEGER DEFAULT 4,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  active_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ORDERS: new columns (all have defaults, old rows stay valid)
-- ============================================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES dining_tables(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parcel_charge DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS round_off DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by UUID;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Widen the payment CHECK constraints: add PARTIAL status and SPLIT method.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) ILIKE '%payment_status%' OR pg_get_constraintdef(oid) ILIKE '%payment_method%')
  LOOP
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED'));
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'WALLET', 'SPLIT'));

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);

-- ============================================================================
-- 5. PAYMENT LEDGER (append-only; written only by the functions below)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_payments (
  id UUID PRIMARY KEY,                       -- generated by the app: retries never double-charge
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('PAYMENT', 'REFUND')),
  method VARCHAR(10) NOT NULL CHECK (method IN ('CASH', 'CARD', 'UPI', 'WALLET')),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reference VARCHAR(60),
  reason TEXT,
  created_by UUID,
  created_by_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_payments_order ON pos_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_created_at ON pos_payments(created_at);

-- Back-fill the ledger for existing paid orders so reports cover old bills too.
INSERT INTO pos_payments (id, order_id, kind, method, amount, created_by_name, created_at)
SELECT gen_random_uuid(), o.id, 'PAYMENT',
       CASE WHEN o.payment_method IN ('CASH', 'CARD', 'UPI', 'WALLET') THEN o.payment_method ELSE 'CASH' END,
       o.total_amount, 'migrated', o.created_at
FROM orders o
WHERE o.payment_status IN ('PAID', 'REFUNDED') AND o.total_amount > 0
  AND NOT EXISTS (SELECT 1 FROM pos_payments p WHERE p.order_id = o.id);

INSERT INTO pos_payments (id, order_id, kind, method, amount, created_by_name, created_at)
SELECT gen_random_uuid(), o.id, 'REFUND',
       CASE WHEN o.payment_method IN ('CASH', 'CARD', 'UPI', 'WALLET') THEN o.payment_method ELSE 'CASH' END,
       o.total_amount, 'migrated', COALESCE(o.updated_at, o.created_at)
FROM orders o
WHERE o.payment_status = 'REFUNDED' AND o.total_amount > 0
  AND NOT EXISTS (SELECT 1 FROM pos_payments p WHERE p.order_id = o.id AND p.kind = 'REFUND');

UPDATE orders o SET
  paid_amount = COALESCE((SELECT SUM(amount) FROM pos_payments p WHERE p.order_id = o.id AND p.kind = 'PAYMENT'), 0),
  refunded_amount = COALESCE((SELECT SUM(amount) FROM pos_payments p WHERE p.order_id = o.id AND p.kind = 'REFUND'), 0)
WHERE o.paid_amount = 0 AND EXISTS (SELECT 1 FROM pos_payments p WHERE p.order_id = o.id AND p.created_by_name = 'migrated');

-- ============================================================================
-- 6. EXPENSES
-- ============================================================================
CREATE TABLE IF NOT EXISTS pos_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Other',
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(10) NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK')),
  description TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_expenses_date ON pos_expenses(expense_date);

-- ============================================================================
-- 7. ORDER NUMBERS: daily counter instead of COUNT(*)+1 (no duplicates when
--    two devices bill at the same moment). Same "ORD-YYMMDD-NNN" format.
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_counters (
  day DATE PRIMARY KEY,
  last_value INTEGER NOT NULL
);

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d DATE := CURRENT_DATE;
  n INTEGER;
  candidate TEXT;
BEGIN
  LOOP
    INSERT INTO order_counters (day, last_value)
    VALUES (d, (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = d) + 1)
    ON CONFLICT (day) DO UPDATE SET last_value = order_counters.last_value + 1
    RETURNING last_value INTO n;
    candidate := 'ORD-' || TO_CHAR(d, 'YYMMDD') || '-' || LPAD(n::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM orders WHERE order_number = candidate);
  END LOOP;
  RETURN candidate;
END $$;

-- ============================================================================
-- 8. BILLING HELPERS
-- ============================================================================
CREATE OR REPLACE FUNCTION _payment_status(p_total NUMERIC, p_paid NUMERIC, p_refunded NUMERIC)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_paid > 0 AND p_refunded >= p_paid THEN 'REFUNDED'
    WHEN p_paid >= p_total THEN 'PAID'
    WHEN p_paid > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END
$$;

-- An order is "closed" (its table can be reused) when cancelled, or when it is
-- completed and nothing is left to collect.
CREATE OR REPLACE FUNCTION _order_is_closed(p_status TEXT, p_payment_status TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_status = 'CANCELLED' OR (p_status = 'COMPLETED' AND p_payment_status IN ('PAID', 'REFUNDED'))
$$;

CREATE OR REPLACE FUNCTION _order_json(p_order_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(o) || jsonb_build_object(
    'order_items', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order, i.created_at)
                             FROM order_items i WHERE i.order_id = o.id), '[]'::jsonb),
    'payments', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at)
                          FROM pos_payments p WHERE p.order_id = o.id), '[]'::jsonb))
  FROM orders o WHERE o.id = p_order_id
$$;

-- Prices always come from the menu (or, when editing a running order, from
-- the price already on that order), never from the browser.
CREATE OR REPLACE FUNCTION _build_bill(
  p_items JSONB, p_order_type TEXT, p_discount_type TEXT, p_discount_value NUMERIC, p_existing_order UUID
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_line JSONB;
  v_lines JSONB := '[]'::jsonb;
  v_mi RECORD;
  v_qty INTEGER;
  v_price NUMERIC;
  v_sub NUMERIC := 0;
  v_units INTEGER := 0;
  v_disc NUMERIC := 0;
  v_disc_type TEXT := NULLIF(UPPER(COALESCE(p_discount_type, '')), '');
  v_disc_value NUMERIC := GREATEST(COALESCE(p_discount_value, 0), 0);
  v_parcel NUMERIC := 0;
  v_charge NUMERIC;
  v_raw NUMERIC;
  v_total NUMERIC;
  v_round NUMERIC := 0;
  v_idx INTEGER := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_ORDER: Add at least one item.';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_idx := v_idx + 1;
    v_qty := (v_line->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 1000 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY: Invalid quantity.';
    END IF;
    SELECT id, name, variant, price INTO v_mi FROM menu_items WHERE id = (v_line->>'menu_item_id')::UUID;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ITEM_NOT_FOUND: A menu item in the cart no longer exists. Reload the menu.';
    END IF;
    v_price := NULL;
    IF p_existing_order IS NOT NULL THEN
      SELECT unit_price INTO v_price FROM order_items
      WHERE order_id = p_existing_order AND menu_item_id = v_mi.id LIMIT 1;
    END IF;
    v_price := ROUND(COALESCE(v_price, v_mi.price), 2);
    v_sub := v_sub + v_price * v_qty;
    v_units := v_units + v_qty;
    v_lines := v_lines || jsonb_build_object(
      'menu_item_id', v_mi.id, 'item_name', v_mi.name, 'variant', v_mi.variant,
      'quantity', v_qty, 'unit_price', v_price, 'total_price', v_price * v_qty,
      'notes', LEFT(NULLIF(v_line->>'notes', ''), 200), 'sort_order', v_idx);
  END LOOP;

  IF v_disc_type = 'PERCENTAGE' THEN
    v_disc := ROUND(v_sub * LEAST(v_disc_value, 100) / 100, 2);
  ELSIF v_disc_type = 'FIXED' THEN
    v_disc := ROUND(v_disc_value, 2);
  ELSE
    v_disc_type := NULL;
    v_disc_value := 0;
  END IF;
  v_disc := LEAST(GREATEST(v_disc, 0), v_sub);
  IF v_disc = 0 THEN v_disc_type := NULL; v_disc_value := 0; END IF;

  IF v_disc > 0 AND NOT is_admin() AND app_setting('cashier_can_discount', 'false') <> 'true' THEN
    RAISE EXCEPTION 'DISCOUNT_NOT_ALLOWED: Only an admin can give discounts.';
  END IF;

  v_charge := COALESCE(NULLIF(app_setting('parcel_charge', '0'), '')::NUMERIC, 0);
  IF v_charge > 0 AND p_order_type = ANY (string_to_array(app_setting('parcel_order_types', 'TAKEAWAY,DELIVERY'), ',')) THEN
    v_parcel := CASE WHEN app_setting('parcel_mode', 'per_item') = 'per_order' THEN v_charge ELSE v_charge * v_units END;
  END IF;

  v_raw := v_sub - v_disc + v_parcel;
  v_total := v_raw;
  IF app_setting('round_off', 'false') = 'true' THEN
    v_total := ROUND(v_raw, 0);
    v_round := v_total - v_raw;
  END IF;

  RETURN jsonb_build_object(
    'lines', v_lines, 'subtotal', v_sub, 'discount_type', v_disc_type, 'discount_value', v_disc_value,
    'discount_amount', v_disc, 'parcel_charge', v_parcel, 'round_off', v_round, 'total', v_total);
END $$;

-- Records new payment rows for an order (rows whose id already exists are
-- skipped, so a retried click never charges twice).
CREATE OR REPLACE FUNCTION _apply_payments(p_order_id UUID, p_payments JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
  p JSONB;
  v_id UUID;
  v_method TEXT;
  v_amt NUMERIC;
  v_new NUMERIC := 0;
  v_any BOOLEAN := false;
  v_name TEXT := (SELECT name FROM pos_staff WHERE user_id = auth.uid());
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF p_payments IS NULL OR jsonb_typeof(p_payments) <> 'array' THEN RETURN false; END IF;

  FOR p IN SELECT value FROM jsonb_array_elements(p_payments) LOOP
    v_id := (p->>'id')::UUID;
    IF v_id IS NULL THEN RAISE EXCEPTION 'INVALID_PAYMENT: Payment id missing.'; END IF;
    IF EXISTS (SELECT 1 FROM pos_payments WHERE id = v_id) THEN CONTINUE; END IF;
    v_method := UPPER(p->>'method');
    IF v_method NOT IN ('CASH', 'CARD', 'UPI') THEN
      RAISE EXCEPTION 'INVALID_PAYMENT: Invalid payment method.';
    END IF;
    IF COALESCE((p->>'full')::BOOLEAN, false) THEN
      -- "pay the full bill": amount is whatever is still due, as computed here
      v_amt := o.total_amount - o.paid_amount - v_new;
      IF v_amt <= 0 THEN CONTINUE; END IF;
    ELSE
      v_amt := ROUND((p->>'amount')::NUMERIC, 2);
    END IF;
    IF v_amt IS NULL OR v_amt <= 0 THEN
      RAISE EXCEPTION 'INVALID_PAYMENT: Each payment must be more than zero.';
    END IF;
    INSERT INTO pos_payments (id, order_id, kind, method, amount, reference, created_by, created_by_name)
    VALUES (v_id, p_order_id, 'PAYMENT', v_method, v_amt, LEFT(NULLIF(p->>'reference', ''), 60), auth.uid(), v_name);
    v_new := v_new + v_amt;
    v_any := true;
  END LOOP;

  IF NOT v_any THEN RETURN false; END IF;
  IF o.paid_amount + v_new > o.total_amount THEN
    RAISE EXCEPTION 'PAYMENT_EXCEEDS_TOTAL: Payments are more than the bill total.';
  END IF;

  UPDATE orders SET
    paid_amount = o.paid_amount + v_new,
    payment_status = _payment_status(o.total_amount, o.paid_amount + v_new, o.refunded_amount),
    payment_method = (SELECT CASE WHEN COUNT(DISTINCT method) = 1 THEN MAX(method) ELSE 'SPLIT' END
                      FROM pos_payments WHERE order_id = p_order_id AND kind = 'PAYMENT'),
    version = o.version + 1,
    updated_at = NOW()
  WHERE id = p_order_id;
  RETURN true;
END $$;

-- ============================================================================
-- 9. ORDER FUNCTIONS (called from the app with supabase.rpc)
-- ============================================================================

-- Create an order + items + optional payments in one transaction.
-- p_order.id is generated by the app per cart: a retried click returns the
-- same order instead of creating a second bill.
CREATE OR REPLACE FUNCTION place_order(p_order JSONB, p_items JSONB, p_payments JSONB DEFAULT '[]'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID := (p_order->>'id')::UUID;
  v_type TEXT := UPPER(COALESCE(p_order->>'order_type', ''));
  v_table_id UUID := NULLIF(p_order->>'table_id', '')::UUID;
  v_table_name TEXT := NULLIF(TRIM(COALESCE(p_order->>'table_number', '')), '');
  v_table RECORD;
  v_bill JSONB;
  v_inserted UUID;
BEGIN
  PERFORM _require_staff();
  IF v_id IS NULL THEN RAISE EXCEPTION 'INVALID_ORDER: Order id missing.'; END IF;
  IF EXISTS (SELECT 1 FROM orders WHERE id = v_id) THEN
    RETURN _order_json(v_id) || '{"duplicate": true}'::jsonb;
  END IF;
  IF v_type NOT IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY') THEN
    RAISE EXCEPTION 'INVALID_ORDER: Invalid order type.';
  END IF;

  IF v_type = 'DINE_IN' THEN
    IF v_table_id IS NOT NULL THEN
      SELECT t.*, o.order_status AS cur_status, o.payment_status AS cur_pay
        INTO v_table
      FROM dining_tables t LEFT JOIN orders o ON o.id = t.active_order_id
      WHERE t.id = v_table_id AND t.is_active
      FOR UPDATE OF t;
      IF NOT FOUND THEN RAISE EXCEPTION 'TABLE_NOT_FOUND: That table no longer exists.'; END IF;
      IF v_table.active_order_id IS NOT NULL AND NOT _order_is_closed(v_table.cur_status, v_table.cur_pay) THEN
        RAISE EXCEPTION 'TABLE_OCCUPIED: % already has a running order.', v_table.name;
      END IF;
      v_table_name := v_table.name;
    ELSIF v_table_name IS NULL THEN
      RAISE EXCEPTION 'TABLE_REQUIRED: Select a table for dine-in.';
    END IF;
  ELSE
    v_table_id := NULL;
    v_table_name := NULL;
  END IF;

  v_bill := _build_bill(p_items, v_type, p_order->>'discount_type', (p_order->>'discount_value')::NUMERIC, NULL);

  INSERT INTO orders (
    id, order_number, order_type, order_status, table_number, table_id,
    customer_name, customer_phone, customer_address,
    subtotal, discount_type, discount_value, discount_amount, tax_percentage, tax_amount,
    parcel_charge, round_off, total_amount, payment_method, payment_status, paid_amount,
    notes, created_by, created_by_name)
  VALUES (
    v_id, '', v_type, 'PENDING', v_table_name, v_table_id,
    LEFT(NULLIF(TRIM(p_order->>'customer_name'), ''), 100),
    LEFT(NULLIF(regexp_replace(COALESCE(p_order->>'customer_phone', ''), '[^0-9+]', '', 'g'), ''), 20),
    NULLIF(TRIM(p_order->>'customer_address'), ''),
    (v_bill->>'subtotal')::NUMERIC, v_bill->>'discount_type', (v_bill->>'discount_value')::NUMERIC,
    (v_bill->>'discount_amount')::NUMERIC, 0, 0,
    (v_bill->>'parcel_charge')::NUMERIC, (v_bill->>'round_off')::NUMERIC, (v_bill->>'total')::NUMERIC,
    NULL, CASE WHEN (v_bill->>'total')::NUMERIC = 0 THEN 'PAID' ELSE 'PENDING' END, 0,
    LEFT(NULLIF(TRIM(p_order->>'notes'), ''), 300), auth.uid(),
    (SELECT name FROM pos_staff WHERE user_id = auth.uid()))
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN  -- the same cart was submitted twice at the same moment
    RETURN _order_json(v_id) || '{"duplicate": true}'::jsonb;
  END IF;

  INSERT INTO order_items (order_id, menu_item_id, item_name, variant, quantity, unit_price, total_price, notes, sort_order)
  SELECT v_id, l.menu_item_id, l.item_name, l.variant, l.quantity, l.unit_price, l.total_price, l.notes, l.sort_order
  FROM jsonb_to_recordset(v_bill->'lines') AS l(
    menu_item_id UUID, item_name TEXT, variant TEXT, quantity INTEGER,
    unit_price NUMERIC, total_price NUMERIC, notes TEXT, sort_order INTEGER);

  PERFORM _apply_payments(v_id, p_payments);

  IF v_table_id IS NOT NULL THEN
    UPDATE dining_tables SET active_order_id = v_id, updated_at = NOW() WHERE id = v_table_id;
  END IF;

  RETURN _order_json(v_id) || '{"duplicate": false}'::jsonb;
END $$;

-- Replace the items of a running (unpaid) order, e.g. a table orders more.
CREATE OR REPLACE FUNCTION update_order_items(
  p_order_id UUID, p_expected_version INTEGER, p_items JSONB, p_extra JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
  v_bill JSONB;
BEGIN
  PERFORM _require_staff();
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.'; END IF;
  IF o.order_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'ORDER_CLOSED: This order is already %.', LOWER(o.order_status);
  END IF;
  IF o.paid_amount > 0 THEN
    RAISE EXCEPTION 'ORDER_HAS_PAYMENTS: This order already has payments, so its items cannot be changed.';
  END IF;
  IF p_expected_version IS NOT NULL AND o.version <> p_expected_version THEN
    RAISE EXCEPTION 'CONFLICT: This order was changed on another device. Reload it and try again.';
  END IF;

  v_bill := _build_bill(p_items, o.order_type,
    COALESCE(p_extra->>'discount_type', o.discount_type),
    COALESCE((p_extra->>'discount_value')::NUMERIC, o.discount_value), p_order_id);

  DELETE FROM order_items WHERE order_id = p_order_id;
  INSERT INTO order_items (order_id, menu_item_id, item_name, variant, quantity, unit_price, total_price, notes, sort_order)
  SELECT p_order_id, l.menu_item_id, l.item_name, l.variant, l.quantity, l.unit_price, l.total_price, l.notes, l.sort_order
  FROM jsonb_to_recordset(v_bill->'lines') AS l(
    menu_item_id UUID, item_name TEXT, variant TEXT, quantity INTEGER,
    unit_price NUMERIC, total_price NUMERIC, notes TEXT, sort_order INTEGER);

  UPDATE orders SET
    subtotal = (v_bill->>'subtotal')::NUMERIC,
    discount_type = v_bill->>'discount_type',
    discount_value = (v_bill->>'discount_value')::NUMERIC,
    discount_amount = (v_bill->>'discount_amount')::NUMERIC,
    parcel_charge = (v_bill->>'parcel_charge')::NUMERIC,
    round_off = (v_bill->>'round_off')::NUMERIC,
    total_amount = (v_bill->>'total')::NUMERIC,
    payment_status = _payment_status((v_bill->>'total')::NUMERIC, 0, 0),
    customer_name = CASE WHEN p_extra ? 'customer_name' THEN LEFT(NULLIF(TRIM(p_extra->>'customer_name'), ''), 100) ELSE customer_name END,
    customer_phone = CASE WHEN p_extra ? 'customer_phone'
      THEN LEFT(NULLIF(regexp_replace(COALESCE(p_extra->>'customer_phone', ''), '[^0-9+]', '', 'g'), ''), 20) ELSE customer_phone END,
    notes = CASE WHEN p_extra ? 'notes' THEN LEFT(NULLIF(TRIM(p_extra->>'notes'), ''), 300) ELSE notes END,
    version = o.version + 1,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN _order_json(p_order_id);
END $$;

-- Collect a payment / pending balance (split payments allowed).
CREATE OR REPLACE FUNCTION add_payments(p_order_id UUID, p_payments JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
  v_new BOOLEAN;
BEGIN
  PERFORM _require_staff();
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.'; END IF;
  IF o.order_status = 'CANCELLED' THEN RAISE EXCEPTION 'ORDER_CLOSED: This order is cancelled.'; END IF;
  v_new := _apply_payments(p_order_id, p_payments);
  RETURN _order_json(p_order_id) || jsonb_build_object('duplicate', NOT v_new);
END $$;

-- Admin only. Refund cannot be more than what was paid minus earlier refunds.
CREATE OR REPLACE FUNCTION record_refund(p_order_id UUID, p_refund JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
  v_id UUID := (p_refund->>'id')::UUID;
  v_amt NUMERIC := ROUND((p_refund->>'amount')::NUMERIC, 2);
  v_method TEXT := UPPER(p_refund->>'method');
BEGIN
  PERFORM _require_admin();
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.'; END IF;
  IF v_id IS NULL THEN RAISE EXCEPTION 'INVALID_REFUND: Refund id missing.'; END IF;
  IF EXISTS (SELECT 1 FROM pos_payments WHERE id = v_id) THEN
    RETURN _order_json(p_order_id) || '{"duplicate": true}'::jsonb;
  END IF;
  IF v_method NOT IN ('CASH', 'CARD', 'UPI') THEN RAISE EXCEPTION 'INVALID_REFUND: Invalid refund method.'; END IF;
  IF v_amt IS NULL OR v_amt <= 0 THEN RAISE EXCEPTION 'INVALID_REFUND: Refund must be more than zero.'; END IF;
  IF v_amt > o.paid_amount - o.refunded_amount THEN
    RAISE EXCEPTION 'REFUND_TOO_LARGE: Refund cannot be more than Rs.% paid.', o.paid_amount - o.refunded_amount;
  END IF;

  INSERT INTO pos_payments (id, order_id, kind, method, amount, reason, created_by, created_by_name)
  VALUES (v_id, p_order_id, 'REFUND', v_method, v_amt, LEFT(NULLIF(TRIM(p_refund->>'reason'), ''), 200),
          auth.uid(), (SELECT name FROM pos_staff WHERE user_id = auth.uid()));

  UPDATE orders SET
    refunded_amount = o.refunded_amount + v_amt,
    payment_status = _payment_status(o.total_amount, o.paid_amount, o.refunded_amount + v_amt),
    version = o.version + 1,
    updated_at = NOW()
  WHERE id = p_order_id;
  RETURN _order_json(p_order_id) || '{"duplicate": false}'::jsonb;
END $$;

-- Cancel an order that is not completed. Cashiers need the setting turned on.
CREATE OR REPLACE FUNCTION cancel_order(p_order_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
BEGIN
  PERFORM _require_staff();
  IF NOT is_admin() AND app_setting('cashier_can_cancel', 'true') <> 'true' THEN
    RAISE EXCEPTION 'CANCEL_NOT_ALLOWED: Only an admin can cancel orders.';
  END IF;
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.'; END IF;
  IF o.order_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'ORDER_CLOSED: This order is already %.', LOWER(o.order_status);
  END IF;
  UPDATE orders SET
    order_status = 'CANCELLED',
    cancel_reason = LEFT(NULLIF(TRIM(p_reason), ''), 200),
    cancelled_at = NOW(),
    cancelled_by = auth.uid(),
    version = o.version + 1,
    updated_at = NOW()
  WHERE id = p_order_id;
  RETURN _order_json(p_order_id);
END $$;

-- ============================================================================
-- 10. TRIGGERS
-- ============================================================================

-- The app may change only order_status directly (Pending -> Preparing ->
-- Ready -> Completed). Money, items and cancellation go through the functions
-- above. SQL Editor / service role are not affected.
CREATE OR REPLACE FUNCTION orders_guard_direct_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF OLD.order_status = 'CANCELLED' THEN
      RAISE EXCEPTION 'ORDER_CLOSED: This order is cancelled.';
    END IF;
    IF NEW.order_status = 'CANCELLED' THEN
      RAISE EXCEPTION 'USE_CANCEL: Use the Cancel button to cancel an order.';
    END IF;
    IF (to_jsonb(NEW) - ARRAY['order_status', 'updated_at']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['order_status', 'updated_at']) THEN
      RAISE EXCEPTION 'ORDER_LOCKED: Only the order status can be changed directly.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_orders_guard ON orders;
CREATE TRIGGER trigger_orders_guard
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_guard_direct_update();

-- Free the table when its order is closed.
CREATE OR REPLACE FUNCTION orders_release_table()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.table_id IS NOT NULL AND _order_is_closed(NEW.order_status, NEW.payment_status) THEN
    UPDATE dining_tables SET active_order_id = NULL, updated_at = NOW()
    WHERE id = NEW.table_id AND active_order_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_orders_release_table ON orders;
CREATE TRIGGER trigger_orders_release_table
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_release_table();

-- ============================================================================
-- 11. STAFF FUNCTIONS
-- ============================================================================

-- Used by the first-time setup screen on a brand-new install.
CREATE OR REPLACE FUNCTION staff_bootstrap_status()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'has_admin', EXISTS (SELECT 1 FROM pos_staff WHERE role = 'admin' AND is_active),
    'setup_done', app_setting('setup_done', 'false') = 'true')
$$;

-- The first signed-in user of a new install becomes the admin. Does nothing
-- once any active admin exists.
CREATE OR REPLACE FUNCTION claim_first_admin(p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN: Sign in first.'; END IF;
  LOCK TABLE pos_staff IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM pos_staff WHERE role = 'admin' AND is_active) THEN
    RAISE EXCEPTION 'ADMIN_EXISTS: An admin already exists. Ask them to add you.';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO pos_staff (user_id, name, phone, role, is_active)
  VALUES (auth.uid(), LEFT(COALESCE(TRIM(p_name), ''), 100), split_part(v_email, '@', 1), 'admin', true)
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin', is_active = true, name = EXCLUDED.name, updated_at = NOW();
  RETURN (SELECT to_jsonb(s) FROM pos_staff s WHERE user_id = auth.uid());
END $$;

-- Admin creates a phone-number login (or links an existing one) and sets the
-- role. Logins use the same "<digits>@staff.arabianbismimandi.app" email that
-- the login page uses. No email is sent.
CREATE OR REPLACE FUNCTION admin_create_staff(p_phone TEXT, p_password TEXT, p_name TEXT, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth AS $$
DECLARE
  v_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_email TEXT;
  v_uid UUID;
BEGIN
  PERFORM _require_admin();
  IF length(v_digits) < 10 OR length(v_digits) > 15 THEN
    RAISE EXCEPTION 'INVALID_PHONE: Enter a valid mobile number.';
  END IF;
  IF p_role NOT IN ('admin', 'cashier') THEN RAISE EXCEPTION 'INVALID_ROLE: Invalid role.'; END IF;
  v_email := v_digits || '@staff.arabianbismimandi.app';

  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;
  IF v_uid IS NULL THEN
    IF p_password IS NULL OR length(p_password) < 6 THEN
      RAISE EXCEPTION 'WEAK_PASSWORD: Password must be at least 6 characters.';
    END IF;
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      crypt(p_password, gen_salt('bf')), NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('name', COALESCE(p_name, ''), 'phone', v_digits), NOW(), NOW(), '', '', '', '');
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, v_uid::TEXT,
      jsonb_build_object('sub', v_uid::TEXT, 'email', v_email, 'email_verified', true),
      'email', NOW(), NOW(), NOW());
  ELSIF p_password IS NOT NULL AND p_password <> '' THEN
    IF length(p_password) < 6 THEN RAISE EXCEPTION 'WEAK_PASSWORD: Password must be at least 6 characters.'; END IF;
    UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = NOW() WHERE id = v_uid;
  END IF;

  INSERT INTO pos_staff (user_id, name, phone, role, is_active)
  VALUES (v_uid, LEFT(COALESCE(TRIM(p_name), ''), 100), v_digits, p_role, true)
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name, phone = EXCLUDED.phone, role = EXCLUDED.role, is_active = true, updated_at = NOW();
  RETURN (SELECT to_jsonb(s) FROM pos_staff s WHERE user_id = v_uid);
END $$;

CREATE OR REPLACE FUNCTION admin_update_staff(p_user_id UUID, p_name TEXT, p_role TEXT, p_active BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s pos_staff%ROWTYPE;
BEGIN
  PERFORM _require_admin();
  IF p_role NOT IN ('admin', 'cashier') THEN RAISE EXCEPTION 'INVALID_ROLE: Invalid role.'; END IF;
  LOCK TABLE pos_staff IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO s FROM pos_staff WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: Staff member not found.'; END IF;
  IF s.role = 'admin' AND s.is_active AND (p_role <> 'admin' OR NOT p_active)
     AND NOT EXISTS (SELECT 1 FROM pos_staff WHERE role = 'admin' AND is_active AND user_id <> p_user_id) THEN
    RAISE EXCEPTION 'LAST_ADMIN: Keep at least one active admin.';
  END IF;
  UPDATE pos_staff SET name = LEFT(COALESCE(TRIM(p_name), ''), 100), role = p_role, is_active = p_active, updated_at = NOW()
  WHERE user_id = p_user_id;
  RETURN (SELECT to_jsonb(x) FROM pos_staff x WHERE user_id = p_user_id);
END $$;

CREATE OR REPLACE FUNCTION admin_set_staff_password(p_user_id UUID, p_password TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth AS $$
BEGIN
  PERFORM _require_admin();
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'WEAK_PASSWORD: Password must be at least 6 characters.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pos_staff WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'NOT_FOUND: Staff member not found.';
  END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = NOW() WHERE id = p_user_id;
END $$;

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- The old policies allowed everything to everyone (USING (true)). They are
-- replaced with role checks. Menu and settings stay publicly readable as
-- before.
-- ============================================================================
DO $$
DECLARE
  t TEXT;
  pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories', 'menu_items', 'orders', 'order_items', 'settings',
                           'offers', 'settlements', 'cash_outs', 'pos_staff', 'dining_tables',
                           'pos_payments', 'pos_expenses', 'order_counters'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Menu: everyone can read, admins edit.
CREATE POLICY "read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "admin writes categories" ON categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "admin writes menu_items" ON menu_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Settings: everyone can read, admins edit.
CREATE POLICY "read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "admin writes settings" ON settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Orders: staff read and move the status. New orders, items, payments,
-- refunds and cancels go through the functions. No deletes.
CREATE POLICY "staff read orders" ON orders FOR SELECT USING (is_staff());
CREATE POLICY "staff update order status" ON orders FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "staff read order_items" ON order_items FOR SELECT USING (is_staff());
CREATE POLICY "staff read payments" ON pos_payments FOR SELECT USING (is_staff());

-- Tables: staff read, admins manage.
CREATE POLICY "staff read tables" ON dining_tables FOR SELECT USING (is_staff());
CREATE POLICY "admin writes tables" ON dining_tables FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Expenses: admins only.
CREATE POLICY "admin expenses" ON pos_expenses FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Staff list: you can see your own row, admins see everyone. Writes go
-- through the admin_* functions.
CREATE POLICY "read own or admin" ON pos_staff FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- Offers, day-end settlement and cash outs: any active staff (same as before
-- for existing logins).
DO $$
BEGIN
  IF to_regclass('public.offers') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "staff offers" ON offers FOR ALL USING (is_staff()) WITH CHECK (is_staff())';
  END IF;
  IF to_regclass('public.settlements') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "staff settlements" ON settlements FOR ALL USING (is_staff()) WITH CHECK (is_staff())';
  END IF;
  IF to_regclass('public.cash_outs') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY "staff cash_outs" ON cash_outs FOR ALL USING (is_staff()) WITH CHECK (is_staff())';
  END IF;
END $$;
-- order_counters: no policy = no direct access (only generate_order_number).

GRANT SELECT, UPDATE ON orders TO authenticated;
GRANT SELECT ON order_items, pos_payments, pos_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dining_tables, pos_expenses TO authenticated;

-- Internal helpers are not callable from the app.
REVOKE EXECUTE ON FUNCTION _build_bill(JSONB, TEXT, TEXT, NUMERIC, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _apply_payments(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _order_json(UUID) FROM PUBLIC;
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION _build_bill(JSONB, TEXT, TEXT, NUMERIC, UUID) FROM anon, authenticated;
  REVOKE EXECUTE ON FUNCTION _apply_payments(UUID, JSONB) FROM anon, authenticated;
  REVOKE EXECUTE ON FUNCTION _order_json(UUID) FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Live updates for the Tables screen (ignored if realtime is not set up).
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE dining_tables;
EXCEPTION WHEN undefined_object OR duplicate_object THEN NULL;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- DONE. Open the app, sign in, and finish the first-time setup screen.
-- ============================================================================
