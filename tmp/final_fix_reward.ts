import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const REWARD_ID = 'c8ed22c3-4f9e-4f51-b956-628d097940e4';

async function fix() {
  const { data: rev } = await supabase.from('client_rewards').select('*').eq('id', REWARD_ID).single();
  if (rev && rev.reward_status === 'resgatado') {
    console.log('Restaurando prêmio:', REWARD_ID);
    const { error } = await supabase.from('client_rewards').update({
      reward_status: 'liberado',
      reward_redeemed_at: null,
      kits_consumed: Math.max(0, (rev.kits_consumed || 0) - rev.kits_required),
      updated_at: new Date().toISOString()
    }).eq('id', REWARD_ID);
    if (error) console.error(error); else console.log('Sucesso!');
  } else {
    console.log('Reward não encontrado ou já corrigido.', rev?.reward_status);
  }
}
fix();
