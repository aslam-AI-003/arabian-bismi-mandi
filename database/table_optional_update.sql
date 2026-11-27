-- ============================================================================
-- DINE IN: TABLE NUMBER OPTIONAL
--
-- Run in the Supabase SQL Editor (after the earlier update files).
-- Safe to re-run. Replaces place_order so a Dine In order can be saved
-- without a table number. Everything else in place_order is unchanged.
-- ============================================================================

BEGIN;

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
    END IF;  -- table number is optional for dine-in
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

COMMIT;

NOTIFY pgrst, 'reload schema';
