
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

async function checkStatus() {
  const { data, error } = await supabase
    .from('warranties')
    .select('order_number, status')
    .in('order_number', orderNumbers);
    
  if (error) console.error(error);
  else {
    console.log('Resultados atuais:');
    orderNumbers.forEach(num => {
       const found = data.find(w => w.order_number === num);
       if (found) {
         console.log(`${num}: ${found.status}`);
       } else {
         console.log(`${num}: ❌ NÃO ENCONTRADO`);
       }
    });
  }
}

checkStatus();
