import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'dce55c12-c0fe-4494-b32e-bd98b80a20ff';

async function checkUser() {
  console.log('Searching for user:', userId);
  
  const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', userId);
  console.log('Table "users":', userData || userError?.message);

  const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId);
  console.log('Table "profiles":', profileData || profileError?.message);
}

checkUser();
