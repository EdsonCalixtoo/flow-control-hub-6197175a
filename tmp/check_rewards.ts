import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%LECO%');
  console.log('Clients found:', clients);
  if (clients && clients.length > 0) {
    const clientId = clients[0].id;
    const { data: rewards } = await supabase.from('client_rewards').select('*').eq('client_id', clientId);
    console.log('Rewards for', clients[0].name, ':', rewards);
  }
}
check();
