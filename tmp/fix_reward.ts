import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: clients } = await supabase.from('clients').select('id, name').ilike('name', '%Leonardo Fernandes%');
  console.log('Clients:', clients);
  if (clients && clients.length > 0) {
    const clientId = clients[0].id;
    const { data: rewards } = await supabase.from('client_rewards').select('*').eq('client_id', clientId).eq('reward_status', 'resgatado');
    console.log('Resgatados:', rewards);
    
    if (rewards && rewards.length > 0) {
      for (const r of rewards) {
        console.log('Estornando prêmio:', r.id);
        await supabase.from('client_rewards').update({
          reward_status: 'liberado',
          reward_redeemed_at: null,
          kits_consumed: Math.max(0, (r.kits_consumed || 0) - r.kits_required),
          updated_at: new Date().toISOString()
        }).eq('id', r.id);
      }
      console.log('Concluído!');
    }
  }
}
run();
