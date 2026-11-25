-- ============================================================================
-- RECEIPT: "Cash received / Change" lines
--
-- Run AFTER sng_features_migration.sql and orders_auto_complete_update.sql,
-- in the Supabase SQL Editor. Safe to re-run.
--
-- Stores the cash the customer handed over and the change given, with each
-- cash payment. Old payments simply have no value (receipt shows nothing).
-- ============================================================================

BEGIN;

ALTER TABLE pos_payments ADD COLUMN IF NOT EXISTS tendered DECIMAL(10,2);
ALTER TABLE pos_payments ADD COLUMN IF NOT EXISTS change_given DECIMAL(10,2);

CREATE OR REPLACE FUNCTION _apply_payments(p_order_id UUID, p_payments JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o orders%ROWTYPE;
  p JSONB;
  v_id UUID;
  v_method TEXT;
  v_amt NUMERIC;
  v_tendered NUMERIC;
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
    -- Cash handed over by the customer (for "Cash received / Change" on the receipt)
    v_tendered := CASE WHEN v_method = 'CASH' THEN ROUND(NULLIF(p->>'tendered', '')::NUMERIC, 2) END;
    IF v_tendered IS NOT NULL AND v_tendered < v_amt THEN v_tendered := NULL; END IF;
    INSERT INTO pos_payments (id, order_id, kind, method, amount, reference, tendered, change_given, created_by, created_by_name)
    VALUES (v_id, p_order_id, 'PAYMENT', v_method, v_amt, LEFT(NULLIF(p->>'reference', ''), 60),
            v_tendered, CASE WHEN v_tendered IS NOT NULL THEN v_tendered - v_amt END, auth.uid(), v_name);
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

REVOKE EXECUTE ON FUNCTION _apply_payments(UUID, JSONB) FROM PUBLIC;
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION _apply_payments(UUID, JSONB) FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
