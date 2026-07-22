const { Client } = require('pg');

const targetUrl = 'postgresql://postgres.glcgtnopotluvppsygyl:lICANTROPOS1324%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function migrate() {
  const client = new Client({
    connectionString: targetUrl,
  });

  try {
    await client.connect();
    console.log('Connected to target database.');

    console.log('Adding custom_delivery_address to orders table...');
    await client.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS custom_delivery_address TEXT;
    `);

    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
