
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

const orderNumbers = [
  'PED-5811', 'D-2947', 'D-0000', 'D-3205', 'G-3210', 
  'PED-8813', 'D-3108', '0001', '0002', '0003', 
  'PED-9793', 'D-2989', 'PED-9801', '0004', '0005'
];

async function run() {
  console.log('--- STARTING CLEANUP ---');
  for (const num of orderNumbers) {
    // Tenta busca exata
    const { data, error } = await supabase
      .from('warranties')
      .select('id, order_number, status, history')
      .eq('order_number', num);
      
    if (error) {
      console.log(`Error searching ${num}:`, error.message);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ ${num} not found by exact match.`);
      continue;
    }
    
    for (const w of data) {
      console.log(`Found ${num} (ID: ${w.id}, Current Status: ${w.status})`);
      
      const newHistory = [
        ...(w.history || []),
        {
          status: 'Garantia finalizada',
          timestamp: new Date().toISOString(),
          user: 'Sistema',
          note: 'Finalizado conforme solicitação do gestor (Já retirado)'
        }
      ];
      
      const { error: upError } = await supabase
        .from('warranties')
        .update({ 
          status: 'Garantia finalizada', 
          updated_at: new Date().toISOString(),
          history: newHistory
        })
        .eq('id', w.id);
        
      if (upError) {
        console.log(`❌ FAILED to update ${num}:`, upError.message);
      } else {
        console.log(`✅ SUCCESS: ${num} is now finalized.`);
      }
    }
  }
  console.log('--- FINISHED ---');
}

run();
