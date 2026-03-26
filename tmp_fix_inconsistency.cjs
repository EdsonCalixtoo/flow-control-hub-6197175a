
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInconsistency() {
    const warrantyId = '45c8ae05-f12e-4cf2-a577-0443a86837fe';
    const now = new Date().toISOString();
    
    const { data: warranty } = await supabase.from('warranties').select('*').eq('id', warrantyId).maybeSingle();
    
    if (warranty) {
        // Update the warranty to reflect it's finalized/delivered
        const historyEntry = {
            status: 'Garantia finalizada',
            timestamp: now,
            user: 'Antigravity AI',
            note: 'Ajuste de status - Retirado pelo entregador'
        };
        
        await supabase.from('warranties').update({
            status: 'Garantia finalizada',
            updated_at: now,
            history: [...(warranty.history || []), historyEntry]
        }).eq('id', warranty.id);
        
        console.log('✅ Status da garantia atualizado para: Garantia finalizada');
    } else {
        console.log('❌ Garantia não encontrada');
    }
}
fixInconsistency();
