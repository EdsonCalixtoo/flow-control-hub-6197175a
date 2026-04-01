
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const orderNumbers = [
  'PED-5811', 'D-2947', 'D-0000', 'D-3205', 'G-3210', 
  'PED-8813', 'D-3108', '0001', '0002', '0003', 
  'PED-9793', 'D-2989', 'PED-9801', '0004', '0005'
];

async function finalizeWarranties() {
  console.log('Finalizing warranties for:', orderNumbers);
  
  for (const num of orderNumbers) {
    // Search by order_number
    const { data: warranties, error: findError } = await supabase
      .from('warranties')
      .select('id, order_number, status')
      .eq('order_number', num);
    
    if (findError) {
      console.error(`Error finding ${num}:`, findError.message);
      continue;
    }
    
    if (!warranties || warranties.length === 0) {
      console.log(`⚠️ Warranty not found for order: ${num}`);
      continue;
    }
    
    for (const w of warranties) {
      if (w.status === 'Garantia finalizada') {
        console.log(`✅ ${num} is already finalized.`);
        continue;
      }
      
      const { error: updateError } = await supabase
        .from('warranties')
        .update({ 
          status: 'Garantia finalizada',
          updated_at: new Date().toISOString(),
          history: [
            ...(w.history || []),
            {
              status: 'Garantia finalizada',
              timestamp: new Date().toISOString(),
              user: 'Sistema (Remoção sugerida pelo Gestor)',
              note: 'Pedido já concluído e retirado pelo entregador.'
            }
          ]
        })
        .eq('id', w.id);
        
      if (updateError) {
        console.error(`❌ Error finalizing ${num}:`, updateError.message);
      } else {
        console.log(`🚀 ${num} finalized successfully.`);
      }
    }
  }
}

finalizeWarranties();
