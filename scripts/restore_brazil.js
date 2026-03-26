
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const URL = 'https://wezxkgeaaddmpmijudjt.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenhrZ2VhYWRkbXBtaWp1ZGp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDExMTE1NSwiZXhwIjoyMDg5Njg3MTU1fQ.RBXTzQlMqj32tmBpa8ElJcplkpTdrfvyBeNVB2DSY3A';

const supabase = createClient(URL, KEY);

async function restore() {
    console.log('\n--- 🇧🇷 INICIANDO INJEÇÃO EM SÃO PAULO ---');
    
    if (!fs.existsSync('backup_usa_completo.json')) {
        console.error('❌ Aquivo backup_usa_completo.json não encontrado!');
        return;
    }

    const backup = JSON.parse(fs.readFileSync('backup_usa_completo.json', 'utf-8'));
    const tables = ['users', 'categories', 'subcategories', 'clients', 'products', 'orders', 'barcode_scans', 'delivery_pickups', 'financial_entries', 'warranties', 'delay_reports', 'installations', 'chat_messages', 'rewards'];

    for (const t of tables) {
        const rows = backup[t];
        if (!rows || rows.length === 0) {
            console.log(`[RESTORE] 📭 Tabela ${t} vazia no backup. Pulando.`);
            continue;
        }

        console.log(`[RESTORE] 📤 Injetando ${rows.length} linhas em: ${t}...`);
        
        // Inserir em lotes de 100 para não estourar payload
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const { error } = await supabase.from(t).insert(batch);
            if (error) {
                console.log(`[RESTORE] ❌ Erro ao inserir lote em ${t}: ${error.message}`);
                // Tentativa de um por um se o lote der erro (conflitos, etc)
                console.log(`[RESTORE] 🔄 Tentando modo trator unidade-a-unidade para o lote em ${t}...`);
                for (const row of batch) {
                    const { error: e2 } = await supabase.from(t).insert(row);
                    if (e2 && !e2.message.includes('duplicate key')) {
                        console.log(`   🔸 Erro na linha ID ${row.id}: ${e2.message}`);
                    }
                }
            }
        }
        console.log(`[RESTORE] ✅ Tabela ${t} finalizada!`);
    }

    console.log('\n--- 🏁 MIGRAÇÃO CONCLUÍDA EM SÃO PAULO! ---');
}

restore();
