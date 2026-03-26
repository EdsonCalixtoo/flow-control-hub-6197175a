/**
 * migrate_to_r2.ts 🛸
 * Script de migração de comprovantes: Base64/Supabase -> Cloudflare R2
 * Versão: 🚜 MODO ESCAVADEIRA (Processamento por lotes)
 */
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const R2_BUCKET = process.env.R2_BUCKET || 'comprovantes';
const R2_DOMAIN = 'https://pub-037e6299da09481393cce24f5ee99014.r2.dev';

async function migrateUrl(url: any, prefix: string = 'migrated'): Promise<string | null> {
  if (!url || typeof url !== 'string' || url.includes('r2.cloudflarestorage.com') || url.includes('.r2.dev')) {
    return null;
  }

  // 1. Caso: Base64
  if (url.startsWith('data:')) {
    try {
      console.log(`  [OK] Processando Base64 (${url.substring(0, 30)}...)`);
      const [header, data] = url.split(',');
      const contentType = header.split(':')[1].split(';')[0];
      const extension = contentType.split('/')[1] || 'jpg';
      const buffer = Buffer.from(data, 'base64');
      const filePath = `legacy-base64/${prefix}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;

      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filePath,
        Body: buffer,
        ContentType: contentType,
      }));

      return `${R2_DOMAIN}/${filePath}`;
    } catch (err: any) {
      console.error(`  [ERRO] Base64:`, err.message);
      return null;
    }
  }

  // 2. Caso: URL HTTP
  if (url.startsWith('http')) {
    try {
      console.log(`  [OK] Baixando URL: ${url.substring(0, 40)}...`);
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const contentType = response.headers['content-type'] || 'image/jpeg';
      const fileName = url.split('/').pop()?.split('?')[0] || `file-${Date.now()}`;
      const filePath = `migrated/${prefix}/${Date.now()}-${fileName}`;

      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: filePath,
        Body: buffer,
        ContentType: contentType,
      }));

      return `${R2_DOMAIN}/${filePath}`;
    } catch (err: any) {
      console.error(`  [ERRO] URL:`, err.message);
      return null;
    }
  }

  return null;
}

async function startMigration() {
  console.log('🚀 Iniciando Migração em Lotes (🚜 MODO ESCAVADEIRA)...');

  const BATCH_SIZE = 5;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    console.log(`\n📦 Lote: Pedidos ${offset} a ${offset + BATCH_SIZE}`);
    const { data: orders, error: oError } = await supabase
      .from('orders')
      .select('id, number, receipt_url, receipt_urls')
      .or('receipt_url.not.is.null,receipt_urls.not.is.null')
      .range(offset, offset + BATCH_SIZE - 1);

    if (oError) {
      console.error('Erro ao ler pedidos:', oError.message);
      break;
    }
    
    if (!orders || orders.length === 0) {
      hasMore = false;
      break;
    }

    for (const order of orders) {
      let updated = false;
      const updates: any = {};

      if (order.receipt_url) {
        const newUrl = await migrateUrl(order.receipt_url, `ord-${order.number}`);
        if (newUrl) { updates.receipt_url = newUrl; updated = true; }
      }

      if (order.receipt_urls && Array.isArray(order.receipt_urls)) {
        const newUrls: string[] = [];
        let arrayUpdated = false;
        for (const url of order.receipt_urls) {
          const newUrl = await migrateUrl(url, `ord-${order.number}`);
          if (newUrl) { newUrls.push(newUrl); arrayUpdated = true; }
          else { newUrls.push(url); }
        }
        if (arrayUpdated) { updates.receipt_urls = newUrls; updated = true; }
      }

      if (updated) {
        await supabase.from('orders').update(updates).eq('id', order.id);
        console.log(`  ➡ Pedido ${order.number} atualizado com links R2.`);
      }
    }
    
    offset += BATCH_SIZE;
  }

  console.log('\n✨ Migração concluída com sucesso!');
}

startMigration().catch(console.error);
