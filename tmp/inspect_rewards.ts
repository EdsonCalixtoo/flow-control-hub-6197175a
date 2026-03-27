import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%Leonardo Fernandes%');
  if (clients && clients.length > 0) {
    const { data: rewards } = await supabase.from('client_rewards').select('*').eq('client_id', clients[0].id);
    console.log(JSON.stringify(rewards, null, 2));
  }
}
run();
