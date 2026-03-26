/**
 * migrate_to_r2_complete.ts 🛸
 * Migração total: Pedidos, Financeiro e ENTREGADORES (Assinaturas/Fotos)
 * 🚜 MODO ESCAVADEIRA (Processamento por lotes)
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
  console.log('🚀 Iniciando Migração Total (🚜 MODO ESCAVADEIRA)...');

  const BATCH_SIZE = 5;
  let offset = 0;
  let hasMore = true;

  // --- PEDIDOS ---
  console.log('\n📦 Processando PEDIDOS...');
  while (hasMore) {
    const { data: items, error } = await supabase.from('orders').select('id, number, receipt_url, receipt_urls').or('receipt_url.not.is.null,receipt_urls.not.is.null').range(offset, offset + BATCH_SIZE - 1);
    if (error || !items || items.length === 0) { hasMore = false; break; }
    console.log(`  Lote ${offset}-${offset + items.length}`);
    for (const item of items) {
      let updated = false; const updates: any = {};
      const newUrl = await migrateUrl(item.receipt_url, `ord-${item.number}`);
      if (newUrl) { updates.receipt_url = newUrl; updated = true; }
      if (item.receipt_urls) {
        const newUrls = await Promise.all(item.receipt_urls.map((u: string) => migrateUrl(u, `ord-${item.number}`)));
        if (newUrls.some(u => !!u)) { updates.receipt_urls = item.receipt_urls.map((u: string, i: number) => newUrls[i] || u); updated = true; }
      }
      if (updated) await supabase.from('orders').update(updates).eq('id', item.id);
    }
    offset += BATCH_SIZE;
  }

  // --- FINANCEIRO ---
  console.log('\n💰 Processando FINANCEIRO...');
  offset = 0; hasMore = true;
  while (hasMore) {
    const { data: items, error } = await supabase.from('financial_entries').select('id, description, receipt_url, receipt_urls').or('receipt_url.not.is.null,receipt_urls.not.is.null').range(offset, offset + BATCH_SIZE - 1);
    if (error || !items || items.length === 0) { hasMore = false; break; }
    console.log(`  Lote ${offset}-${offset + items.length}`);
    for (const item of items) {
      let updated = false; const updates: any = {};
      const newUrl = await migrateUrl(item.receipt_url, 'fin');
      if (newUrl) { updates.receipt_url = newUrl; updated = true; }
      if (item.receipt_urls) {
        const newUrls = await Promise.all(item.receipt_urls.map((u: string) => migrateUrl(u, 'fin')));
        if (newUrls.some(u => !!u)) { updates.receipt_urls = item.receipt_urls.map((u: string, i: number) => newUrls[i] || u); updated = true; }
      }
      if (updated) await supabase.from('financial_entries').update(updates).eq('id', item.id);
    }
    offset += BATCH_SIZE;
  }

  // --- ENTREGADORES (NOVIDADE) ---
  console.log('\n🚛 Processando ENTREGADORES (Fotos/Assinaturas)...');
  offset = 0; hasMore = true;
  while (hasMore) {
    const { data: items, error } = await supabase.from('delivery_pickups').select('id, deliverer_name, photo_url, signature_url').or('photo_url.not.is.null,signature_url.not.is.null').range(offset, offset + BATCH_SIZE - 1);
    if (error || !items || items.length === 0) { hasMore = false; break; }
    console.log(`  Lote ${offset}-${offset + items.length}`);
    for (const item of items) {
      let updated = false; const updates: any = {};
      const newPhoto = await migrateUrl(item.photo_url, `del-photo-${item.deliverer_name}`);
      if (newPhoto) { updates.photo_url = newPhoto; updated = true; }
      const newSig = await migrateUrl(item.signature_url, `del-sig-${item.deliverer_name}`);
      if (newSig) { updates.signature_url = newSig; updated = true; }
      if (updated) await supabase.from('delivery_pickups').update(updates).eq('id', item.id);
    }
    offset += BATCH_SIZE;
  }

  console.log('\n✨ Migração total finalizada!');
}

startMigration().catch(console.error);
