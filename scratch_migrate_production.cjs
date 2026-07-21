const { Client } = require('pg');

const targetUrl = 'postgresql://postgres:lICANTROPOS1324%40@db.kugqvgktumkebcyuymcx.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({
    connectionString: targetUrl,
  });

  try {
    await client.connect();
    console.log('Connected to target database.');

    // 1. Add production_media to orders table
    console.log('Adding production_media column to orders table...');
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS production_media JSONB DEFAULT '[]'::jsonb;
    `);

    // 2. Create production_daily_closures table
    console.log('Creating production_daily_closures table...');
    await client.query(`
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
    `);

    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
