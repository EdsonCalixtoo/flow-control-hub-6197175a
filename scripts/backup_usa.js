
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const URL = 'https://gqpwofnmdgkqchnecdmr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcHdvZm5tZGdrcWNobmVjZG1yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUyNjA3OSwiZXhwIjoyMDg4MTAyMDc5fQ.pqePfRfW42pyX9JSTKy_niMzp0fGxEgCNLrU46xdxNE';

const supabase = createClient(URL, KEY);

async function dump() {
    const tables = ['categories', 'subcategories', 'clients', 'products', 'orders', 'barcode_scans', 'delivery_pickups', 'financial_entries', 'warranties', 'order_returns', 'production_errors', 'delay_reports', 'chat_messages', 'rewards', 'installations'];
    const backup = {};
    
    console.log('\n--- 📥 INICIANDO MIGRAÇÃO DOS EUA ---');
    
    for (const t of tables) {
        console.log(`[DUMP] 📡 Coletando tabela: ${t}...`);
        try {
            const { data, error } = await supabase.from(t).select('*');
            if (error) {
                console.log(`[DUMP] ❌ Erro em ${t}: ${error.message}`);
            } else {
                backup[t] = data || [];
                console.log(`[DUMP] ✅ ${t} coletada: ${backup[t].length} linhas.`);
            }
        } catch (e) {
            console.log(`[DUMP] 🚨 Falha crítica em ${t}`);
        }
    }
    
    fs.writeFileSync('backup_usa_completo.json', JSON.stringify(backup, null, 2));
    console.log('\n--- 🏁 BACKUP TOTAL CONCLUÍDO! ---');
}

dump();
