import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listUsers() {
  const { data, error } = await supabase.from('users').select('id, name, email, role');
  if (error) console.error(error.message);
  else console.log('All Users:', JSON.stringify(data, null, 2));
}

listUsers();
