/**
 * gerar_sql_final_v3.ts 🏁🛰️
 * SCANNER DEFINITIVO v3.4: Limpa Base64 com ou sem etiqueta (Imagens e PDFs).
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY!,
  },
});

const isB64Suspect = (s: string) => {
  if (!s) return false;
  const val = s.trim();
  if (val.toLowerCase().startsWith('http')) return false;
  if (val.length > 50) return true; // Texto longo que não é link = Suspeito
  return false;
};

async function migrate(raw: string, num: string) {
  try {
    let b64Data = '';
    let contentType = 'image/jpeg';
    
    if (raw.includes(';base64,')) {
      const parts = raw.split(';base64,');
      contentType = parts[0].split(':')[1] || 'image/jpeg';
      b64Data = parts[1];
    } else {
      // Base64 Puro
      b64Data = raw;
      if (b64Data.startsWith('JVBERi')) contentType = 'application/pdf';
    }

    const binary = Buffer.from(b64Data, 'base64');
    if (binary.length < 10) return null;

    const ext = contentType.includes('pdf') ? 'pdf' : 'jpg';
    const path = `comprovantes/${num}-${Date.now()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
      Body: binary,
      ContentType: contentType,
    }));

    return `https://pub-037e6299da09481393cce24f5ee99014.r2.dev/${path}`;
  } catch (err: any) {
    console.error(`  ❌ [R2 ERROR] #${num}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('🏁 Scanner "SOMBRA" v3.6 Iniciado (Lendo em Lotes)...');
  
  let allOrders: any[] = [];
  let from = 0;
  const step = 20; // Lote de 20 por vez

  while (true) {
    console.log(`📡 Buscando lote: ${from} até ${from + step}...`);
    const { data, error } = await supabase.from('orders')
      .select('number, receipt_url, receipt_urls')
      .order('number', { ascending: true })
      .range(from, from + step);

    if (error) {
      console.error('❌ ERRO NO LOTE:', error.message);
      break;
    }

    if (!data || data.length === 0) break;
    
    allOrders = [...allOrders, ...data];
    if (data.length < step + 1) break;
    from += step + 1;
  }

  console.log(`📊 TOTAL LIDO: ${allOrders.length} pedidos. Iniciando Limpeza...`);

  let sql = '-- SQL DE LIMPEZA FINAL R2 v3.6 (SOMBRA)\n\n';
  let totalFound = 0;

  for (const o of allOrders) {
    const list: string[] = [];
    if (o.receipt_url && isB64Suspect(o.receipt_url)) list.push(o.receipt_url);
    if (o.receipt_urls && Array.isArray(o.receipt_urls)) {
      for (const u of o.receipt_urls) {
        if (u && isB64Suspect(u)) list.push(u);
      }
    }

    if (list.length === 0) continue;

    console.log(`📦 #PED-${o.number}: Base64 detectado! Migrando...`);
    
    const newUrls: string[] = [];
    for (const raw of list) {
      const url = await migrate(raw, o.number);
      if (url) newUrls.push(url);
    }

    if (newUrls.length > 0) {
      totalFound++;
      const primary = newUrls[0];
      const jsonUrls = JSON.stringify(newUrls);
      sql += `UPDATE orders SET receipt_url = '${primary}', receipt_urls = '${jsonUrls}'::jsonb, migrado_r2 = true WHERE number = '${o.number}';\n`;
      console.log(`  ✅ #${o.number} OK.`);
    }
  }

  fs.writeFileSync('sql_limpeza_final.sql', sql);
  console.log(`\n✅ CONCLUÍDO! Registros agora no arquivo SQL: ${totalFound} 🏆`);
}

run().catch(console.error);
