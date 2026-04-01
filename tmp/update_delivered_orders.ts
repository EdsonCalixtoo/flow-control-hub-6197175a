
import { createClient } from '@supabase/supabase-js';

// PEGAR AS VARIÁVEIS DO .env DO PROJETO SE POSSÍVEL
// OU USAR HARDCODED SE O USUÁRIO PERMITIR
// COMO SOU UM ASSISTENTE, VOU CRIAR O SCRIPT E O USUÁRIO PODE RODAR

const supabaseUrl = 'SUA_URL_AQUI'; 
const supabaseAnonKey = 'SUA_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const orderNumbers = [
  'PED-027', 'PED-046', 'PED-054', 'PED-058', 
  'PED-5774', 'PED-5782', 'PED-5818', 'PED-5826', 
  'PED-5828', 'PED-5829', 'PED-5846', 'PED-5856', 
  'PED-5860', 'PED-5873', 'PED-5877', 'PED-8617', 
  'PED-8622', 'PED-8787', 'PED-8793', 'PED-8810', 'PED-8823'
];

async function updateOrders() {
  console.log('Iniciando atualização de pedidos...');
  
  for (const num of orderNumbers) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: 'retirado_entregador',
        updated_at: new Date().toISOString() 
      })
      .eq('number', num)
      .select();

    if (error) {
      console.error(`Erro ao atualizar ${num}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✅ Pedido ${num} atualizado para 'retirado_entregador'.`);
    } else {
      console.log(`⚠️ Pedido ${num} não encontrado.`);
    }
  }
}

updateOrders();
