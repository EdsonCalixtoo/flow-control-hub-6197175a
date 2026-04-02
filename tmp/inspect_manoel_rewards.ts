import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function run() {
  const clientName = 'Manoel Hamilton da Silva';
  const out = [];
  out.push(`Searching for client: ${clientName}...`);
  
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', `%${clientName}%`);

  if (clientError) {
    out.push(`Error searching for client: ${JSON.stringify(clientError)}`);
    fs.writeFileSync('tmp/rewards_output.txt', out.join('\n'));
    return;
  }

  if (!clients || clients.length === 0) {
    out.push('Client not found.');
    fs.writeFileSync('tmp/rewards_output.txt', out.join('\n'));
    return;
  }

  const client = clients[0];
  out.push(`Found client: ${client.name} (ID: ${client.id})`);

  const { data: rewards, error: rewardError } = await supabase
    .from('client_rewards')
    .select('*')
    .eq('client_id', client.id);

  if (rewardError) {
    out.push(`Error fetching rewards: ${JSON.stringify(rewardError)}`);
    fs.writeFileSync('tmp/rewards_output.txt', out.join('\n'));
    return;
  }

  out.push('Current rewards:');
  out.push(JSON.stringify(rewards, null, 2));
  
  fs.writeFileSync('tmp/rewards_output.txt', out.join('\n'));
  console.log('Results written to tmp/rewards_output.txt');
}

run();
