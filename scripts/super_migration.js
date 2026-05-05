
import { createClient } from '@supabase/supabase-js';

// ESTES VALORES SERÃO SUBSTITUÍDOS PELOS QUE VOCÊ PASSAR
const OLD_DB = {
    url: 'https://wezxkgeaaddmpmijudjt.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenhrZ2VhYWRkbXBtaWp1ZGp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDExMTE1NSwiZXhwIjoyMDg5Njg3MTU1fQ.RBXTzQlMqj32tmBpa8ElJcplkpTdrfvyBeNVB2DSY3A'
};

const NEW_DB = {
    url: 'https://iyjvaizmeimwxatdhnne.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5anZhaXptZWltd3hhdGRobm5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk0NTM2NSwiZXhwIjoyMDkzNTIxMzY1fQ.Hmv36Yv7o1UidYHLPHtq_ip0UpbptaRyUC9goOP-wgI'
};

const tables = [
    'users', 
    'categories', 
    'subcategories', 
    'clients', 
    'products', 
    'orders', 
    'barcode_scans', 
    'delivery_pickups', 
    'financial_entries', 
    'warranties', 
    'order_returns', 
    'production_errors', 
    'delay_reports', 
    'chat_messages', 
    'rewards', 
    'installations',
    'monthly_closings',
    'client_rewards'
];

async function migrate() {
    console.log('🚀 Iniciando Migração Total...');
    
    const oldClient = createClient(OLD_DB.url, OLD_DB.key);
    const newClient = createClient(NEW_DB.url, NEW_DB.key);

    for (const table of tables) {
        console.log(`\n📦 Migrando tabela: ${table}...`);
        
        // 1. Puxar dados do antigo
        const { data, error: fetchError } = await oldClient.from(table).select('*');
        
        if (fetchError) {
            console.error(`❌ Erro ao ler ${table}: ${fetchError.message}`);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`ℹ️ Tabela ${table} está vazia.`);
            continue;
        }

        console.log(`📥 Lendo ${data.length} registros...`);

        // 2. Inserir no novo em lotes
        const batchSize = 50;
        let successCount = 0;
        
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            const { error: insertError } = await newClient.from(table).upsert(batch);
            
            if (insertError) {
                console.error(`❌ Erro ao inserir lote em ${table}: ${insertError.message}`);
                // Tentativa unitária se o lote falhar
                for (const item of batch) {
                    const { error: e2 } = await newClient.from(table).upsert(item);
                    if (!e2) successCount++;
                }
            } else {
                successCount += batch.length;
            }
        }
        
        console.log(`✅ Tabela ${table} finalizada. (${successCount}/${data.length} migrados)`);
    }

    console.log('\n✨ MIGRAÇÃO CONCLUÍDA COM SUCESSO! ✨');
}

migrate();
