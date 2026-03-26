
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const URL = 'https://wezxkgeaaddmpmijudjt.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenhrZ2VhYWRkbXBtaWp1ZGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTExNTUsImV4cCI6MjA4OTY4NzE1NX0.CZt1RvZ-rp9MNwYrDseZZHUlN0uxJ8O8ZWQI1GeXyIg';

const supabase = createClient(URL, KEY);

async function audit() {
    process.stdout.write('\n--- 📊 AUDITORIA FINAL: EUA vs BRASIL ---\n');
    
    const backup = JSON.parse(fs.readFileSync('backup_usa_completo.json', 'utf-8'));
    
    for (const t in backup) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        const countBR = count || 0;
        const countUSA = backup[t].length;
        
        const status = countUSA === countBR ? '✅ 100% OK' : (countBR > 0 ? '⚠️ Incompleto' : '❌ Vazio');
        console.log(`[${t}]: USA (${countUSA}) -> BRASIL (${countBR}) | ${status}`);
    }
    
    process.stdout.write('\n--- 🏁 FIM DA AUDITORIA ---\n');
}

audit();
