import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%Leonardo Fernandes%');
  if (clients && clients.length > 0) {
    const { data: rewards } = await supabase.from('client_rewards').select('*').eq('client_id', clients[0].id);
    if (rewards) {
      rewards.forEach(r => {
        console.log(`[REWARD] ID:${r.id} TYPE:${r.reward_type} STATUS:${r.reward_status} COMPLETED:${r.kits_completed} CONSUMED:${r.kits_consumed} REQUIRED:${r.kits_required}`);
      });
    }
  }
}
run();
