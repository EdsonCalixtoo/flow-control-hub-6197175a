
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Edson/Documents/ERPLOVABLE/flow-control-hub-6197175a/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: order } = await supabase.from('orders').select('status').eq('number', 'D.3157').maybeSingle();
    const { data: warranty } = await supabase.from('warranties').select('status').eq('order_number', 'D.3157').maybeSingle();
    console.log(JSON.stringify({ orderStatus: order ? order.status : 'NOT_FOUND', warrantyStatus: warranty ? warranty.status : 'NOT_FOUND' }));
}
check();
