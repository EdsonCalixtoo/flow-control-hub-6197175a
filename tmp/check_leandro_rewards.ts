import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkClientRewards() {
  const name = "Leandro Junior Frediani";
  console.log(`Searching for client: ${name}...`);
  
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', `%${name}%`);

  if (clientError) {
    console.error('Error finding client:', clientError);
    return;
  }

  if (!clients || clients.length === 0) {
    console.log('Client not found.');
    return;
  }

  const clientId = clients[0].id;
  console.log(`Found client: ${clients[0].name} (ID: ${clientId})`);

  const { data: rewards, error: rewardError } = await supabase
    .from('client_rewards')
    .select('*')
    .eq('client_id', clientId);

  if (rewardError) {
    console.error('Error fetching rewards:', rewardError);
    return;
  }

  if (!rewards || rewards.length === 0) {
    console.log('No rewards found for this client.');
  } else {
    console.log(`Found ${rewards.length} rewards.`);
    const fs = await import('fs');
    fs.writeFileSync('tmp_leandro_rewards_result.json', JSON.stringify(rewards, null, 2));
    console.log('Results saved to tmp_leandro_rewards_result.json');
  }
}

checkClientRewards();
