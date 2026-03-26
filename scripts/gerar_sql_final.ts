/**
 * gerar_sql_final.ts 🏁🛰️
 * Gera o SQL para limpar os 17 xeretas remanescentes no banco de dados.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';

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

async function migrate(b64: string, num: string) {
  try {
    const parts = b64.split(';base64,');
    if (parts.length < 2) return null;
    const rawData = atob(parts[1]);
    const bytes = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
    const path = `comprovantes/${num}-${Date.now()}.jpg`;

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
      Body: bytes,
      ContentType: 'image/jpeg',
    }));

    return `https://pub-037e6299da09481393cce24f5ee99014.r2.dev/${path}`;
  } catch (err: any) {
    return null;
  }
}

async function run() {
  console.log('🏁 Gerando SQL de Limpeza Final para os 17 xeretas...');
  
  const { data } = await supabase.from('orders')
    .select('number, receipt_url, receipt_urls')
    .or('receipt_url.ilike.data:%,receipt_urls.cs.{"data:image"}');
  
  let sql = '-- SQL DE LIMPEZA FINAL R2 (PROFUNDA)\n\n';

  for (const o of data || []) {
    console.log(`📦 Processando #${o.number}...`);
    // Pega o primeiro base64 que encontrar em qualquer uma das colunas
    const b64Candidate = o.receipt_url?.startsWith('data:') 
      ? o.receipt_url 
      : (o.receipt_urls?.find((u: string) => u.startsWith('data:')));

    if (!b64Candidate) continue;

    const url = await migrate(b64Candidate, o.number);
    if (url) {
      sql += `UPDATE orders SET receipt_url = '${url}', receipt_urls = ARRAY['${url}'], migrado_r2 = true WHERE number = '${o.number}';\n`;
    }
  }

  fs.writeFileSync('sql_limpeza_final.sql', sql);
  console.log('\n✅ ARQUIVO gerado com sucesso: sql_limpeza_final.sql 🏆');
}

run().catch(console.error);
