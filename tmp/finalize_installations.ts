
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'SUA_URL_AQUI'; 
const supabaseAnonKey = 'SUA_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function finalizeAllInstallations() {
  const now = new Date().toISOString();
  console.log('Finalizando todas as instalações em produção...');
  
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status: 'produto_liberado',
      production_status: 'finalizado',
      updated_at: now,
      finished_at: now,
      released_at: now 
    })
    .match({ 
      order_type: 'instalacao',
      status: 'em_producao' // Apenas os que estão ativamente em produção
    })
    .select();

  if (error) {
    console.error('Erro ao finalizar:', error.message);
  } else if (data && data.length > 0) {
    console.log(`✅ ${data.length} pedidos de instalação foram finalizados com sucesso.`);
    data.forEach(o => {
      console.log(`- Finalizado: ${o.number}`);
    });
  } else {
    console.log('Nenhum pedido de instalação em status "em_producao" foi encontrado.');
  }
}

finalizeAllInstallations();
