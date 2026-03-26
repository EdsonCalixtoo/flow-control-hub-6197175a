
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const warrantyId = '45c8ae05-f12e-4cf2-a577-0443a86837fe';
    const { data: warranty } = await supabase.from('warranties').select('*').eq('id', warrantyId).maybeSingle();
    
    if (warranty) {
        console.log('--- Warranty Found ---');
        console.log('ID:', warranty.id);
        console.log('Number:', warranty.order_number);
        console.log('Status:', warranty.status);
        console.log('OrderId:', warranty.order_id);
        
        const { data: order } = await supabase.from('orders').select('*').eq('id', warranty.order_id).maybeSingle();
        if (order) {
            console.log('--- Order Found ---');
            console.log('Order Number:', order.number);
            console.log('Order Status:', order.status);
        } else {
            console.log('--- Order NOT Found ---');
        }
    } else {
        console.log('--- Warranty NOT Found ---');
    }
}
check();
