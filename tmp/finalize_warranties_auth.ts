
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function tryAuthAndUpdate() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'automatizavans@gmail.com',
    password: '123456'
  });
  
  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }
  
  console.log('--- AUTH SUCCESSFUL ---');
  
  const orderNumbers = [
    'PED-5811', 'D-2947', 'D-0000', 'D-3205', 'G-3210', 
    'PED-8813', 'D-3108', '0001', '0002', '0003', 
    'PED-9793', 'D-2989', 'PED-9801', '0004', '0005'
  ];

  for (const num of orderNumbers) {
    const { data, error } = await supabase
      .from('warranties')
      .select('id, status, history')
      .eq('order_number', num);
      
    if (error) {
      console.log(`Error searching ${num}:`, error.message);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`⚠️ ${num} not found.`);
      continue;
    }
    
    for (const w of data) {
       const { error: upError } = await supabase
        .from('warranties')
        .update({ 
          status: 'Garantia finalizada', 
          updated_at: new Date().toISOString(),
          history: [
            ...(w.history || []),
            {
              status: 'Garantia finalizada',
              timestamp: new Date().toISOString(),
              user: 'Edson Calixto (Sistema Script)',
              note: 'Finalizado conforme solicitação: Já produzido e retirado.'
            }
          ]
        })
        .eq('id', w.id);
        
       if (upError) {
         console.log(`❌ FAIL ${num}: ${upError.message}`);
       } else {
         console.log(`✅ OK ${num}`);
       }
    }
  }
  console.log('--- CLEANUP FINISHED ---');
}

tryAuthAndUpdate();
