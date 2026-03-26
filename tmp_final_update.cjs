
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAll() {
    const now = new Date().toISOString();
    
    // Update ORDER
    const { data: order } = await supabase.from('orders').select('*').eq('number', 'D.3157').maybeSingle();
    if (order) {
        const historyEntry = {
            status: 'retirado_entregador',
            timestamp: now,
            user: 'Antigravity AI',
            note: 'Retirado pelo entregador confirmado via chat'
        };
        await supabase.from('orders').update({
            status: 'retirado_entregador',
            updated_at: now,
            status_history: [...(order.status_history || []), historyEntry]
        }).eq('id', order.id);
        console.log('✅ Order D.3157 set to retirado_entregador');
    }

    // Update WARRANTY
    const { data: warranty } = await supabase.from('warranties').select('*').eq('order_number', 'D.3157').maybeSingle();
    if (warranty) {
        const historyEntry = {
            status: 'Garantia finalizada',
            timestamp: now,
            user: 'Antigravity AI',
            note: 'Retirado pelo entregador (Finalizado)'
        };
        await supabase.from('warranties').update({
            status: 'Garantia finalizada',
            updated_at: now,
            history: [...(warranty.history || []), historyEntry]
        }).eq('id', warranty.id);
        console.log('✅ Warranty D.3157 set to Garantia finalizada');
    }
}
updateAll();
