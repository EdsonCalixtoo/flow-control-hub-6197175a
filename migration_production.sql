ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS production_media JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS production_daily_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  photo_url TEXT,
  signature_url TEXT,
  order_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
