import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: revs } = await supabase.from('client_rewards').select('*, clients(name)').eq('reward_status', 'resgatado');
  if (revs) {
    revs.forEach(r => console.log(`[R] ID:${r.id} CLIENT:${r.clients?.name} TYPE:${r.reward_type}`));
  }
}
run();
