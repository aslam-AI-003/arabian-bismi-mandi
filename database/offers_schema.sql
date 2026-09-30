-- Offers table for Arabian Bismi Mandi Restaurant
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value DECIMAL(10,2) DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated" ON offers
  FOR ALL USING (true) WITH CHECK (true);

-- Index for active offers
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active, valid_until);
