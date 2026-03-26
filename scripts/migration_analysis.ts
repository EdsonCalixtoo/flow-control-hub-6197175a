/**
 * migration_analysis.ts 📊
 * Analisa o estado atual dos comprovantes no banco de dados.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function analyze() {
  console.log('📊 Iniciando Análise de Comprovantes...\n');

  // 1. Pedidos
  const { data: orders } = await supabase.from('orders').select('receipt_url, receipt_urls');
  const totalOrders = orders?.length || 0;
  let base64Orders = 0;
  let r2Orders = 0;
  let emptyOrders = 0;
  let otherOrders = 0;

  orders?.forEach(o => {
    const urls = [o.receipt_url, ...(o.receipt_urls || [])].filter(u => !!u);
    if (urls.length === 0) emptyOrders++;
    else {
      if (urls.some(u => u.startsWith('data:'))) base64Orders++;
      else if (urls.some(u => u.includes('r2.dev') || u.includes('r2.cloudflarestorage.com'))) r2Orders++;
      else otherOrders++;
    }
  });

  // 2. Lançamentos Financeiros
  const { data: entries } = await supabase.from('financial_entries').select('receipt_url, receipt_urls');
  const totalEntries = entries?.length || 0;
  let base64Entries = 0;
  let r2Entries = 0;
  let emptyEntries = 0;
  let otherEntries = 0;

  entries?.forEach(e => {
    const urls = [e.receipt_url, ...(e.receipt_urls || [])].filter(u => !!u);
    if (urls.length === 0) emptyEntries++;
    else {
      if (urls.some(u => u.startsWith('data:'))) base64Entries++;
      else if (urls.some(u => u.includes('r2.dev') || u.includes('r2.cloudflarestorage.com'))) r2Entries++;
      else otherEntries++;
    }
  });

  console.log('--- RELATÓRIO DE PEDIDOS ---');
  console.log(`Total de Pedidos: ${totalOrders}`);
  console.log(`✅ No R2 (Migrados): ${r2Orders}`);
  console.log(`⚠️ Em Base64 (Pendentes): ${base64Orders}`);
  console.log(`⚪ Sem Comprovante: ${emptyOrders}`);
  console.log(`❓ Outros (Supabase/Links): ${otherOrders}`);

  console.log('\n--- RELATÓRIO FINANCEIRO ---');
  console.log(`Total de Lançamentos: ${totalEntries}`);
  console.log(`✅ No R2 (Migrados): ${r2Entries}`);
  console.log(`⚠️ Em Base64 (Pendentes): ${base64Entries}`);
  console.log(`⚪ Sem Comprovante: ${emptyEntries}`);
  console.log(`❓ Outros (Supabase/Links): ${otherEntries}`);

  console.log('\n💡 Conclusão:');
  if (base64Orders > 0 || base64Entries > 0) {
    console.log(`Ainda existem ${base64Orders + base64Entries} registros pesados em Base64 para migrar.`);
  } else {
    console.log('Parabéns! Todos os comprovantes pesados foram migrados ou removidos.');
  }
}

analyze().catch(console.error);
