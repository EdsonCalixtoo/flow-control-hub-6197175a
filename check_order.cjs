const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('orders').select('*').ilike('number', '%8629%');
  if (error) {
    console.error('Order error:', error);
  } else {
    for (const d of data) {
      console.log('Order:', d.number, d.status, d.carrier, d.releasedBy);
      const { data: pickups } = await supabase.from('delivery_pickups').select('*').eq('orderId', d.id);
      console.log('Pickups:', pickups);
      const { data: history } = await supabase.from('status_history').select('*').eq('orderId', d.id).order('createdAt', { ascending: false });
      console.log('History:', history.map(h => `${h.status} by ${h.updatedBy}`));
    }
  }
}

check();
