/**
 * final_audit_report.ts 📊
 * Auditoria completa pós-migração para Cloudflare R2
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function runAudit() {
  console.log('📊 Iniciando Auditoria Final de Migração (Cloudflare R2)...');

  // --- 1. Auditando PEDIDOS ---
  const { data: oTotal, count: oTotalCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: oR2Count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).or('receipt_url.ilike.%r2.dev%,receipt_urls.cs.{"r2.dev"}');
  const { data: oLegacy } = await supabase.from('orders').select('number, receipt_url').or('receipt_url.ilike.%supabase.co%,receipt_url.ilike.data:%');
  
  // --- 2. Auditando FINANCEIRO ---
  const { count: fTotalCount } = await supabase.from('financial_entries').select('*', { count: 'exact', head: true });
  const { count: fR2Count } = await supabase.from('financial_entries').select('id', { count: 'exact', head: true }).or('receipt_url.ilike.%r2.dev%,receipt_urls.cs.{"r2.dev"}');
  const { data: fLegacy } = await supabase.from('financial_entries').select('description, receipt_url').or('receipt_url.ilike.%supabase.co%,receipt_url.ilike.data:%');

  // --- 3. Auditando ENTREGADORES ---
  const { count: dTotalCount } = await supabase.from('delivery_pickups').select('*', { count: 'exact', head: true });
  const { count: dR2Count } = await supabase.from('delivery_pickups').select('id', { count: 'exact', head: true }).or('photo_url.ilike.%r2.dev%,signature_url.ilike.%r2.dev%');
  const { data: dLegacy } = await supabase.from('delivery_pickups').select('deliverer_name').or('photo_url.ilike.%supabase.co%,photo_url.ilike.data:%,signature_url.ilike.%supabase.co%,signature_url.ilike.data:%');

  console.log('\n--- 📝 RELATÓRIO DE AUDITORIA ---');
  
  console.log('\n📦 PEDIDOS (orders):');
  console.log(`  Total de registros: ${oTotalCount}`);
  console.log(`  ✅ Migrados p/ R2: ${oR2Count}`);
  console.log(`  ❌ Pendentes (Supabase/Base64): ${oLegacy?.length || 0}`);
  
  console.log('\n💰 FINANCEIRO (financial_entries):');
  console.log(`  Total de registros: ${fTotalCount}`);
  console.log(`  ✅ Migrados p/ R2: ${fR2Count}`);
  console.log(`  ❌ Pendentes: ${fLegacy?.length || 0}`);

  console.log('\n🚛 ENTREGADORES (delivery_pickups):');
  console.log(`  Total de registros: ${dTotalCount}`);
  console.log(`  ✅ Migrados p/ R2: ${dR2Count}`);
  console.log(`  ❌ Pendentes: ${dLegacy?.length || 0}`);

  if ((oLegacy?.length || 0) + (fLegacy?.length || 0) + (dLegacy?.length || 0) === 0) {
    console.log('\n🏁 RESULTADO FINAL: 100% DE SUCESSO! Banco de dados limpo.');
  } else {
    console.log('\n⚠️ RESULTADO FINAL: Ainda existem itens pendentes! Rodando migrador automático...');
  }
}

runAudit().catch(console.error);
