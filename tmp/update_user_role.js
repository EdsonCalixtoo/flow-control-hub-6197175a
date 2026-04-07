import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'dce55c12-c0fe-4494-b32e-bd98b80a20ff';
const newRole = 'producao_carenagem';

async function updateRole() {
  console.log(`Updating user ${userId} to role ${newRole}...`);
  
  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('Error updating role:', error.message);
    process.exit(1);
  }

  console.log('Success! User updated:', data);
}

updateRole();
