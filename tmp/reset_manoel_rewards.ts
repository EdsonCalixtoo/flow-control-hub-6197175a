import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const clientId = '8025360d-56e1-4f4b-a987-bf5e1551c3ad'; // Manoel Hamilton da Silva
  const rewardId = '75d96ec3-b51d-4aaf-907a-b5d52f782d55'; // Tier 1 Reward ID
  
  console.log(`Resetting reward for client ID: ${clientId}, reward ID: ${rewardId}...`);
  
  // Set adjustment to -40 to cancel out currently earned kits (40)
  const { data, error } = await supabase
    .from('client_rewards')
    .update({
      kits_adjustment: -40,
      kits_completed: 0,
      reward_status: 'pendente',
      updated_at: new Date().toISOString()
    })
    .eq('id', rewardId)
    .select();

  if (error) {
    console.error('Error updating reward:', error);
    return;
  }

  console.log('Update successful:', JSON.stringify(data, null, 2));
}

run();
