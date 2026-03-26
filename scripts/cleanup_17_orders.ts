/**
 * cleanup_17_orders.ts 🧹🚀
 * Foca exclusivamente nos 17 pedidos remanescentes em Base64
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function migrateBase64(b64String: string, id: string, number: string) {
  try {
    const parts = b64String.split(';base64,');
    if (parts.length < 2) return null;
    const contentType = parts[0].split(':')[1];
    const rawData = atob(parts[1]);
    const bytes = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);

    const ext = contentType.split('/')[1] || 'jpg';
    const path = `comprovantes/${number}-${Date.now()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
      Body: bytes,
      ContentType: contentType,
    }));

    return `https://pub-037e6299da09481393cce24f5ee99014.r2.dev/${path}`;
  } catch (err: any) {
    console.error(`  [ERRO] Migrando ${number}:`, err.message);
    return null;
  }
}

async function startCleanup() {
  console.log('🧹 Iniciando limpeza final dos 17 pedidos xeretas...');

  const { data: orders, error } = await supabase.from('orders')
    .select('id, number, receipt_url')
    .ilike('receipt_url', 'data:%');

  if (error) throw error;
  if (!orders || orders.length === 0) {
    console.log('✅ Nenhum pedido pendente encontrado!');
    return;
  }

  console.log(`🚀 Forçando migração de ${orders.length} pedidos...`);

  for (const order of orders) {
    console.log(`📦 Processando #${order.number}...`);
    const newUrl = await migrateBase64(order.receipt_url, order.id, order.number);

    if (newUrl) {
      const { error: upError } = await supabase.from('orders')
        .update({ receipt_url: newUrl, receipt_urls: [newUrl], migrado_r2: true })
        .eq('id', order.id);

      if (upError) console.error(`  [ERRO BANCO] #${order.number}:`, upError.message);
      else console.log(`  ✅ PEDIDO #${order.number} LIMPO!`);
    }
  }

  console.log('\n🏁 Limpeza concluída!');
}

startCleanup();
