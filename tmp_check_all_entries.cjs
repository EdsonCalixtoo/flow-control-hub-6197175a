
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
    console.log('--- Orders ---');
    const { data: orders } = await supabase.from('orders').select('*').eq('number', 'D.3157');
    console.log(JSON.stringify(orders, null, 2));

    console.log('\n--- Warranties ---');
    const { data: warranties } = await supabase.from('warranties').select('*').eq('order_number', 'D.3157');
    console.log(JSON.stringify(warranties, null, 2));
}
checkAll();
