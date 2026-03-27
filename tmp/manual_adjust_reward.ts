import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const REWARD_ID = '8ee4ac10-ff2a-449c-b077-b0eb5ecbde77';

async function adjust() {
  console.log('Ajsutando prêmio para 10/5...');
  // Para aparecer 10/5 com total de 20 kits e required de 5, o consumed deve ser 10. (20 - 10 = 10)
  const { error } = await supabase.from('client_rewards').update({
    kits_consumed: 10,
    kits_completed: 10,
    reward_status: 'liberado',
    updated_at: new Date().toISOString()
  }).eq('id', REWARD_ID);
  
  if (error) console.error(error); else console.log('Prêmio ajustado com sucesso!');
}
adjust();
