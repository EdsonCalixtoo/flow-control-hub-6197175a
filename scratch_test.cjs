const { Client } = require('pg');

const oldDbUrl = 'postgresql://postgres.glcgtnopotluvppsygyl:lICANTROPOS1324@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';
const newDbUrl = 'postgresql://postgres.kugqvgktumkebcyuymcx:lICANTROPOS1324@@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function test() {
  const oldClient = new Client({ connectionString: oldDbUrl });
  const newClient = new Client({ connectionString: newDbUrl });

  await oldClient.connect();
  await newClient.connect();

  const table = 'orders';
  const res = await oldClient.query(`SELECT * FROM "${table}" LIMIT 1`);
  if (res.rows.length === 0) return;
  const row = res.rows[0];

  const colRes = await oldClient.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = $1
  `, [table]);
  const columns = colRes.rows.map(r => r.column_name);
  const jsonCols = colRes.rows.filter(r => r.data_type === 'json' || r.data_type === 'jsonb').map(r => r.column_name);

  const pkRes = await oldClient.query(`
    SELECT a.attname
    FROM   pg_index i
    JOIN   pg_attribute a ON a.attrelid = i.indrelid
                         AND a.attnum = ANY(i.indkey)
    WHERE  i.indrelid = $1::regclass
    AND    i.indisprimary;
  `, [table]);
  const pks = pkRes.rows.map(r => r.attname);

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const colNames = columns.map(c => `"${c}"`).join(', ');
  
  const nonPkCols = columns.filter(c => !pks.includes(c));
  const updateSets = nonPkCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
  const conflictClause = pks.map(c => `"${c}"`).join(', ');
  
  const query = `
    INSERT INTO "${table}" (${colNames}) 
    VALUES (${placeholders}) 
    ON CONFLICT (${conflictClause}) 
    DO UPDATE SET ${updateSets}
    RETURNING id;
  `;

  const values = columns.map(c => {
    let val = row[c];
    if (jsonCols.includes(c) && val !== null && typeof val === 'object') {
      return JSON.stringify(val);
    }
    return val;
  });
  
  try {
    await newClient.query(query, values);
    console.log("Success!");
  } catch (e) {
    console.log("ERROR:", e.message);
  }

  await oldClient.end();
  await newClient.end();
}

test().catch(console.error);
