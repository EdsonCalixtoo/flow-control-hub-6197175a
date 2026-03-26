/**
 * gerar_sql_final_v2.ts 🏁🛰️
 * Suporta IMAGENS e PDFs em Base64 nas duas colunas do banco.
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
    
    // Detecta o tipo de conteúdo (image/jpeg, application/pdf, etc)
    const contentType = parts[0].split(':')[1] || 'image/jpeg';
    const ext = contentType.includes('pdf') ? 'pdf' : 'jpg';
    
    const b64Data = parts[1];
    const binary = Buffer.from(b64Data, 'base64');
    
    const path = `comprovantes/${num}-${Date.now()}.${ext}`;

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: path,
      Body: binary,
      ContentType: contentType,
    }));

    return `https://pub-037e6299da09481393cce24f5ee99014.r2.dev/${path}`;
  } catch (err: any) {
    console.error(`  [ERRO] Migrando ${num}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('🏁 Iniciando Scanner de Precisão Máxima (100% dos Pedidos)...');
  
  // Pegamos todos os pedidos para não haver erro de filtro no banco
  const { data } = await supabase.from('orders')
    .select('number, receipt_url, receipt_urls');
  
  let sql = '-- SQL DE LIMPEZA FINAL R2 v2.1 (PRECISÃO TOTAL)\n\n';

  if (!data || data.length === 0) {
    console.log('❌ Erro ao acessar a tabela de pedidos!');
    return;
  }

  let foundCount = 0;
  for (const o of data) {
    // Procura por qualquer traço de Base64 (data:)
    const b64InPrimary = o.receipt_url?.startsWith('data:');
    const b64InList = o.receipt_urls?.some((u: string) => u.startsWith('data:'));

    if (!b64InPrimary && !b64InList) continue;

    console.log(`📦 #PED-${o.number}: Lixo detectado! Limpando...`);
    foundCount++;
    
    const candidates: string[] = [];
    if (b64InPrimary) candidates.push(o.receipt_url);
    if (o.receipt_urls) {
      for (const u of o.receipt_urls) {
        if (u.startsWith('data:') && !candidates.includes(u)) candidates.push(u);
      }
    }

    if (candidates.length === 0) continue;

    const newUrls = [];
    for (const b64 of candidates) {
      const url = await migrate(b64, o.number);
      if (url) newUrls.push(url);
    }

    if (newUrls.length > 0) {
      const primaryUrl = newUrls[0];
      sql += `UPDATE orders SET receipt_url = '${primaryUrl}', receipt_urls = ARRAY[${newUrls.map(u => `'${u}'`).join(',')}], migrado_r2 = true WHERE number = '${o.number}';\n`;
      console.log(`  ✅ #${o.number} migrado.`);
    }
  }

  fs.writeFileSync('sql_limpeza_final.sql', sql);
  console.log('\n✅ ARQUIVO ATUALIZADO: sql_limpeza_final.sql 🏆');
}

run().catch(console.error);
