
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    const { data: o } = await supabase.from('orders').select('id, number, status').eq('number', 'D.3157');
    const { data: w } = await supabase.from('warranties').select('id, order_number, status').eq('order_number', 'D.3157');
    
    console.log('PEDIDOS:', o.map(x => `${x.number} (${x.id}): ${x.status}`).join(', '));
    console.log('GARANTIAS:', w.map(x => `${x.order_number} (${x.id}): ${x.status}`).join(', '));
}
checkStatus();
