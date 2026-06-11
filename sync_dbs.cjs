const { Client } = require('pg');

const oldDbUrl = 'postgresql://postgres.glcgtnopotluvppsygyl:lICANTROPOS1324%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';
const newDbUrl = 'postgresql://postgres:230e243405ffb5e5d703cfa8631018e081e56846896cfa39@localhost:5432/postgres';

async function main() {
  const oldClient = new Client({ connectionString: oldDbUrl });
  const newClient = new Client({ connectionString: newDbUrl });

  await oldClient.connect();
  await newClient.connect();

  console.log('Connected to both databases.');

  const res = await oldClient.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const tables = res.rows.map(r => r.table_name);
  console.log(`Found ${tables.length} tables in public schema.`);

  // Focus on all tables
  for (const table of tables) {
    if (!tables.includes(table)) continue;
    console.log(`\n--- Processing table: ${table} ---`);
    
    const pkRes = await oldClient.query(`
      SELECT a.attname
      FROM   pg_index i
      JOIN   pg_attribute a ON a.attrelid = i.indrelid
                           AND a.attnum = ANY(i.indkey)
      WHERE  i.indrelid = $1::regclass
      AND    i.indisprimary;
    `, [table]);

    const pks = pkRes.rows.map(r => r.attname);
    
    if (pks.length === 0) continue;

    const colRes = await oldClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
    `, [table]);
    
    const columns = colRes.rows.map(r => r.column_name);
    const jsonCols = colRes.rows.filter(r => r.data_type === 'json' || r.data_type === 'jsonb').map(r => r.column_name);

    try {
      const rowsRes = await oldClient.query(`SELECT * FROM "${table}"`);
      const rows = rowsRes.rows;
      
      console.log(`Found ${rows.length} rows in old DB for ${table}.`);
      
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;
      let errors = 0;

      for (const row of rows) {
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = columns.map(c => `"${c}"`).join(', ');
        
        const nonPkCols = columns.filter(c => !pks.includes(c));
        const updateSets = nonPkCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
        
        const conflictClause = pks.map(c => `"${c}"`).join(', ');
        
        let query;
        if (nonPkCols.length > 0) {
          query = `
            INSERT INTO "${table}" (${colNames}) 
            VALUES (${placeholders}) 
            ON CONFLICT (${conflictClause}) 
            DO UPDATE SET ${updateSets}
            RETURNING xmax;
          `;
        } else {
          query = `
            INSERT INTO "${table}" (${colNames}) 
            VALUES (${placeholders}) 
            ON CONFLICT (${conflictClause}) 
            DO NOTHING
            RETURNING xmax;
          `;
        }

        const values = columns.map(c => {
          let val = row[c];
          if (jsonCols.includes(c) && val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });
        
        try {
          const insertRes = await newClient.query(query, values);
          if (insertRes.rows.length === 0) {
            unchanged++;
          } else {
            const xmax = insertRes.rows[0].xmax;
            if (xmax == 0) inserted++;
            else updated++;
          }
        } catch (e) {
          errors++;
          console.error(e.message);
        }
      }
      
      console.log(`Table ${table} stats: Inserted: ${inserted}, Updated: ${updated}, Unchanged: ${unchanged}, Errors: ${errors}`);
    } catch (e) {
      console.error(`Error processing table ${table}:`, e.message);
    }
  }

  await oldClient.end();
  await newClient.end();
  console.log('\nDone synchronizing remaining data!');
}

main().catch(console.error);
