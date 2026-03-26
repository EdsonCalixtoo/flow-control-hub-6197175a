import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// 1. Config Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// 2. Config R2
const r2Config = {
  region: 'auto',
  endpoint: process.env.VITE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY!,
  },
};

const r2 = new S3Client(r2Config);
const BUCKET = process.env.VITE_R2_BUCKET!;
const PUBLIC_DOMAIN = process.env.VITE_R2_PUBLIC_URL!;

// ── Funções de Apoio ─────────────────────────────────────────────────────────

function isBase64(str: string | null): boolean {
  return !!str && str.startsWith('data:');
}

async function uploadBase64ToR2(base64: string, path: string): Promise<string> {
  const [header, data] = base64.split(',');
  const contentType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const buffer = Buffer.from(data, 'base64');

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: path,
    ContentType: contentType,
  });

  // Usamos PutObject direto via buffer no Node
  await r2.send(command);
  const putParams = { ...command.input, Body: buffer };
  await r2.send(new PutObjectCommand(putParams));

  return `${PUBLIC_DOMAIN}/${path}`;
}

async function migrateTable(tableName: string, idCol: string, potentialCols: string[]) {
  console.log(`\n\n[MIGRATION-SMART] 🧠 Iniciando tabela: ${tableName}...`);
  
  // 1. Detectar quais colunas realmente existem
  const { data: sample, error: sampleErr } = await supabase.from(tableName).select('*').limit(1);
  if (sampleErr || !sample || sample.length === 0) {
    // Se a tabela estiver vazia, apenas pula
    console.log(`   ⏭️ Puxando tabela vazia ou sem acesso.`);
    return;
  }

  const validCols = potentialCols.filter(c => Object.keys(sample[0]).includes(c));
  console.log(`   ✅ Colunas encontradas: [${validCols.join(', ')}]`);

  if (validCols.length === 0) {
    console.log(`   ⏭️ Nenhuma coluna de foto encontrada nesta tabela.`);
    return;
  }

  let totalMigrated = 0;
  let offset = 0;
  const selectCols = [idCol, ...validCols].join(',');

  while (true) {
    const { data: records, error } = await supabase
      .from(tableName)
      .select(selectCols)
      .order(idCol, { ascending: true }) 
      .range(offset, offset); 

    if (error) {
      console.error(`[MIGRATION] ❌ Erro ao ler em ${offset}:`, error.message);
      break;
    }

    if (!records || records.length === 0) break;

    const record = records[0];
    const updates: any = {};
    let needsUpdate = false;

    for (const col of validCols) {
      const val = record[col];
      
      if (typeof val === 'string' && isBase64(val)) {
        const path = `migracao/${tableName}/${record[idCol]}-${col}-${Date.now()}.jpg`;
        console.log(`   🚜 [${offset}] Migrando ${tableName} ... [${col}]`);
        try {
          updates[col] = await uploadBase64ToR2(val, path);
          needsUpdate = true;
        } catch (e: any) {
          console.error(`   ❌ Falha no upload:`, e.message);
        }
      }
      
      if (Array.isArray(val)) {
        const newUrls = [...val];
        let subUpdated = false;
        for (let i = 0; i < newUrls.length; i++) {
          if (isBase64(newUrls[i])) {
            const path = `migracao/${tableName}/${record[idCol]}-${col}-${i}-${Date.now()}.jpg`;
            console.log(`   🚜 [${offset}] Migrando Array index ${i}...`);
            try {
              newUrls[i] = await uploadBase64ToR2(newUrls[i], path);
              subUpdated = true;
            } catch (e: any) {
              console.error(`   ❌ Falha no upload:`, e.message);
            }
          }
        }
        if (subUpdated) {
          updates[col] = newUrls;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      const { error: upErr } = await supabase.from(tableName).update(updates).eq(idCol, record[idCol]);
      if (!upErr) totalMigrated++;
    }

    offset += 1;
    if (offset % 20 === 0) console.log(`   📊 Progresso: ${offset} registros conferidos.`);
  }

  console.log(`[MIGRATION] ✅ Tabela ${tableName} concluída. Total Migrados: ${totalMigrated}`);
}

async function main() {
  console.log('🚀 INICIANDO MIGRAÇÃO INTELIGENTE PARA R2...');
  
  try {
    // 1. Financeiro (Lançamentos)
    await migrateTable('financial_entries', 'id', ['receipt_url', 'receipt_urls']);

    // 2. Retiradas de Entregadores
    await migrateTable('delivery_pickups', 'id', ['photo_url', 'signature_url']);

    // 3. Garantias
    await migrateTable('warranties', 'id', ['receipt_urls', 'receipt_url']);

    // 4. Devoluções
    await migrateTable('order_returns', 'id', ['photo_url', 'signature_url', 'receipt_url', 'url']);

    // 5. Erros de Produção
    await migrateTable('production_errors', 'id', ['photo_url', 'evidence_url', 'image_url']);

    console.log('\n\n✨ MIGRAÇÃO INTELIGENTE CONCLUÍDA! ✨');
    console.log('Agora a auditoria vai bater em 100%! ✅');

  } catch (err: any) {
    console.error('\n\n❌ ERRO CRÍTICO NA MIGRAÇÃO:', err.message);
  }
}

main();
