import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCarriers() {
  console.log("Updating carriers: CLEYTON -> KLEYTON...");
  const { data, error, count } = await supabase
    .from('orders')
    .update({ carrier: 'KLEYTON' })
    .eq('carrier', 'CLEYTON')
    .select();

  if (error) {
    console.error("Error updating carriers:", error);
  } else {
    console.log(`Updated ${data?.length || 0} orders.`);
  }
}

fixCarriers();
