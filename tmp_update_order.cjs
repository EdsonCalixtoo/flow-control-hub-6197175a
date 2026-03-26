
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOrder() {
    console.log('--- Updating order D.3157 ---');
    const now = new Date().toISOString();
    
    // 1. Update the order
    const { data: orders, error: orderLoadError } = await supabase
        .from('orders')
        .select('*')
        .eq('number', 'D.3157')
        .single();
    
    if (orderLoadError) {
        console.error('Error finding order:', orderLoadError);
    } else {
        const historyEntry = {
            status: 'retirado_entregador',
            timestamp: now,
            user: 'Antigravity AI',
            note: 'Retirado pelo entregador informado pelo usuario via chat'
        };
        
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'retirado_entregador',
                updated_at: now,
                status_history: [...(orders.status_history || []), historyEntry]
            })
            .eq('id', orders.id);
        
        if (updateError) console.error('Error updating order:', updateError);
        else console.log('✅ Order updated successfully');
    }

    // 2. Update the warranty
    const { data: warranties, error: warrantyLoadError } = await supabase
        .from('warranties')
        .select('*')
        .eq('order_number', 'D.3157')
        .single();
    
    if (warrantyLoadError) {
        console.warn('Warranty not found for D.3157 (not necessarily an error if it was just a regular order)');
    } else {
        const historyEntry = {
            status: 'Garantia finalizada',
            timestamp: now,
            user: 'Antigravity AI',
            note: 'Retirado pelo entregador - Finalizado automaticamente'
        };
        
        const { error: updateWarrantyError } = await supabase
            .from('warranties')
            .update({
                status: 'Garantia finalizada',
                updated_at: now,
                history: [...(warranties.history || []), historyEntry]
            })
            .eq('id', warranties.id);
        
        if (updateWarrantyError) console.error('Error updating warranty:', updateWarrantyError);
        else console.log('✅ Warranty updated successfully');
    }
}

updateOrder();
