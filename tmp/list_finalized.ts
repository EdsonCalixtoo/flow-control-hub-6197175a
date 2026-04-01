
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAll() {
  const { data, error } = await supabase
    .from('warranties')
    .select('order_number, status')
    .ilike('status', '%finalizada%');
    
  if (error) console.error(error);
  else {
    console.log('Warranties Finalized:');
    data.forEach(w => console.log(`- ${w.order_number}`));
  }
}

checkAll();
