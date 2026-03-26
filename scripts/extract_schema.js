
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const URL = 'https://gqpwofnmdgkqchnecdmr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHdvZm5tZGdrcWNobmVjZG1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNjA3OSwiZXhwIjoyMDg4MTAyMDc5fQ.pqePfRfW42pyX9JSTKy_niMzp0fGxEgCNLrU46xdxNE';

const supabase = createClient(URL, KEY);

async function extractSchema() {
    const tables = ['categories', 'subcategories', 'clients', 'products', 'orders', 'barcode_scans', 'delivery_pickups', 'financial_entries', 'warranties', 'order_returns', 'production_errors', 'delay_reports', 'chat_messages', 'rewards', 'installations'];
    
    console.log('\n--- 🏗️ EXTRAINDO ESQUELETO DO BANCO (EUA) ---');
    
    let fullSql = '-- SQL PARA CRIAR TABELAS EM SÃO PAULO\n\n';

    for (const t of tables) {
        console.log(`[SCHEMA] Lendo estrutura de: ${t}...`);
        
        // Simples select de 1 linha para pegar os nomes das colunas
        const { data, error } = await supabase.from(t).select('*').limit(1);
        
        if (error || !data || data.length === 0) {
             // Fallback se a tabela estiver vazia: tentamos oráculos ou assumimos campos padrão
             console.log(`[SCHEMA] ⚠️ Tabela ${t} vazia. Usando inferência.`);
             continue;
        }

        const columns = Object.keys(data[0]);
        fullSql += `CREATE TABLE IF NOT EXISTS public.${t} (\n`;
        
        const colDefs = columns.map(col => {
            let type = 'TEXT'; // default
            const val = data[0][col];
            if (col === 'id') return `  id UUID PRIMARY KEY DEFAULT gen_random_uuid()`;
            if (typeof val === 'number') type = 'NUMERIC';
            if (typeof val === 'boolean') type = 'BOOLEAN';
            if (val instanceof Date || (typeof val === 'string' && val.includes('T') && val.includes('Z'))) type = 'TIMESTAMPTZ';
            if (Array.isArray(val) || typeof val === 'object') type = 'JSONB';
            
            return `  ${col} ${type}`;
        });
        
        fullSql += colDefs.join(',\n');
        fullSql += `\n);\n\n`;
    }

    fs.writeFileSync('schema_sao_paulo.sql', fullSql);
    console.log('\n✅ ESQUELETO GERADO EM: schema_sao_paulo.sql');
}

extractSchema();
