const { Client } = require('pg');

const targetUrl = 'postgresql://postgres.glcgtnopotluvppsygyl:lICANTROPOS1324%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function migrate() {
  const client = new Client({
    connectionString: targetUrl,
  });

  try {
    await client.connect();
    console.log('Connected to target database.');

    console.log('Creating reward_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
        settings JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        CONSTRAINT unique_client_reward_settings UNIQUE (client_id)
      );
    `);

    // Inserir configuração Global Padrão (onde client_id é nulo) se não existir
    const defaultSettings = {
        tier_1: { required_kits: 5, min_price: 0, max_price: 999999 },
        tier_2: { required_kits: 7, min_price: 1450, max_price: 2000 },
        tier_3: { required_kits: 10, min_price: 1100, max_price: 1449 }
    };

    const res = await client.query(`SELECT id FROM reward_settings WHERE client_id IS NULL`);
    if (res.rowCount === 0) {
        console.log('Inserting default global reward settings...');
        await client.query(`
            INSERT INTO reward_settings (client_id, settings) 
            VALUES (NULL, $1::jsonb)
        `, [JSON.stringify(defaultSettings)]);
    } else {
        console.log('Global reward settings already exist.');
    }

    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
