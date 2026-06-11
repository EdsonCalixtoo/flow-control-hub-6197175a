const { Client } = require('pg');

const newDbUrl = 'postgresql://postgres.kugqvgktumkebcyuymcx:lICANTROPOS1324@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function fixPermissions() {
  const client = new Client({ connectionString: newDbUrl });
  await client.connect();

  console.log('Connected. Fixing permissions for schema public...');

  const queries = [
    `GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;`,
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;`,
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;`,
    `GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;`
  ];

  for (let q of queries) {
    try {
      await client.query(q);
      console.log('Success:', q);
    } catch (e) {
      console.log('Error running:', q, '->', e.message);
    }
  }

  await client.end();
  console.log('Permissions fixed!');
}

fixPermissions().catch(console.error);
