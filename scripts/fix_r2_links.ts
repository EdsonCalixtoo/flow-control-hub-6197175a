/**
 * fix_r2_links.ts 🛠️
 * Corrige as URLs do R2 no banco de dados: de API Privada para URL Pública (r2.dev)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

const OLD_ROOT = 'https://comprovantes.0b65e60c3f1e7ee7d159206a8b869d9a.r2.cloudflarestorage.com/';
const NEW_ROOT = 'https://pub-037e6299da09481393cce24f5ee99014.r2.dev/';

async function fixLinks() {
  console.log('🔄 Corrigindo links: API Privada -> URL Pública R2...');

  // 1. Corrigir Pedidos
  const { data: orders } = await supabase.from('orders').select('id, number, receipt_url, receipt_urls');
  if (orders) {
    for (const order of orders) {
      let changed = false;
      let newUrl = order.receipt_url;
      let newUrls = order.receipt_urls;

      if (newUrl?.includes(OLD_ROOT)) {
        newUrl = newUrl.replace(OLD_ROOT, NEW_ROOT);
        changed = true;
      }

      if (Array.isArray(newUrls)) {
        newUrls = newUrls.map((u: string) => {
          if (u.includes(OLD_ROOT)) {
            changed = true;
            return u.replace(OLD_ROOT, NEW_ROOT);
          }
          return u;
        });
      }

      if (changed) {
        await supabase.from('orders').update({ receipt_url: newUrl, receipt_urls: newUrls }).eq('id', order.id);
        console.log(`[OK] Pedido #${order.number} corrigido.`);
      }
    }
  }

  // 2. Corrigir Financeiro
  const { data: entries } = await supabase.from('financial_entries').select('id, description, receipt_url, receipt_urls');
  if (entries) {
    for (const entry of entries) {
      let changed = false;
      let newUrl = entry.receipt_url;
      let newUrls = entry.receipt_urls;

      if (newUrl?.includes(OLD_ROOT)) {
        newUrl = newUrl.replace(OLD_ROOT, NEW_ROOT);
        changed = true;
      }

      if (Array.isArray(newUrls)) {
        newUrls = newUrls.map((u: string) => {
          if (u.includes(OLD_ROOT)) {
            changed = true;
            return u.replace(OLD_ROOT, NEW_ROOT);
          }
          return u;
        });
      }

      if (changed) {
        await supabase.from('financial_entries').update({ receipt_url: newUrl, receipt_urls: newUrls }).eq('id', entry.id);
        console.log(`[OK] Entrada ${entry.description} corrigida.`);
      }
    }
  }

  console.log('\n✨ Todos os links foram atualizados para a nova URL pública!');
}

fixLinks().catch(console.error);
