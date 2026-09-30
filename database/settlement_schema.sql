-- Day End Settlement tables for Arabian Bismi Mandi Restaurant
-- Run this in Supabase SQL Editor

-- Settlements table (one row per day)
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_date DATE NOT NULL UNIQUE,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  cash_sales DECIMAL(12,2) DEFAULT 0,
  card_sales DECIMAL(12,2) DEFAULT 0,
  upi_sales DECIMAL(12,2) DEFAULT 0,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  cash_out_total DECIMAL(12,2) DEFAULT 0,
  expected_cash DECIMAL(12,2) DEFAULT 0,
  actual_cash DECIMAL(12,2) DEFAULT 0,
  difference DECIMAL(12,2) DEFAULT 0,
  denomination JSONB DEFAULT '{}',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash out entries (expenses/withdrawals from drawer during the day)
CREATE TABLE IF NOT EXISTS cash_outs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_outs ENABLE ROW LEVEL SECURITY;

-- Allow all operations
CREATE POLICY "Allow all settlements" ON settlements
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all cash_outs" ON cash_outs
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_settlements_date ON settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_cash_outs_date ON cash_outs(settlement_date);
