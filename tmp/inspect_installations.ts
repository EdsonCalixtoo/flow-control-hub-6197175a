
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'SUA_URL_AQUI'; 
const supabaseAnonKey = 'SUA_KEY_AQUI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectInstallations() {
  console.log('--- Resumo das Instalações pendentes ---');
  
  const { data, error } = await supabase
    .from('orders')
    .select('number, status, order_type')
    .eq('order_type', 'instalacao')
    .in('status', ['aguardando_producao', 'em_producao', 'producao_finalizada']);

  if (error) {
    console.error('Erro na busca:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('Nenhuma instalação pendente encontrada.');
    return;
  }

  console.log(`Encontrados ${data.length} pedidos de instalação em produção:`);
  data.forEach(o => {
    console.log(`- ${o.number} (Status atual: ${o.status})`);
  });
}

inspectInstallations();
