/**
 * check_order_debug.ts 🔍
 * Verifica exatamente o que o banco de dados tem sobre um pedido específico
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrder(orderNumber: string) {
  console.log(`🔎 Analisando o pedido: ${orderNumber}`);
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, number, receipt_url, receipt_urls')
    .eq('number', orderNumber)
    .single();

  if (error) {
    console.error('Erro ao buscar pedido:', error);
    return;
  }

  console.log('✅ Dados encontrados no banco:');
  console.log(`- ID: ${order.id}`);
  console.log(`- receipt_url: ${order.receipt_url || 'Vazio'}`);
  console.log(`- receipt_urls: ${JSON.stringify(order.receipt_urls) || 'Vazio'}`);

  // Verifica pagamentos parciais vinculados
  const { data: entries } = await supabase
    .from('financial_entries')
    .select('id, description, receipt_url, receipt_urls')
    .eq('order_id', order.id);

  console.log(`\n💰 Pagamentos Parciais Vinculados: ${entries?.length || 0}`);
  entries?.forEach((p, i) => {
    console.log(`  [${i+1}] ${p.description || 'Pagamento'}:`);
    console.log(`      receipt_url: ${p.receipt_url || 'Vazio'}`);
    console.log(`      receipt_urls: ${JSON.stringify(p.receipt_urls) || 'Vazio'}`);
  });
}

checkOrder('#PED-8761').catch(console.error);
