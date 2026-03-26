import { supabase } from "./supabase";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * storageServiceR2.ts 🛸
 * Serviço de Upload Direto para o Cloudflare R2
 * 🔥 ATUALIZADO: Bypassing Supabase Edge Function due to Usage Limits
 */

// 🔒 Configurações vindas do .env (VITE_)
const R2_ACCESS_KEY = import.meta.env.VITE_R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;
const R2_BUCKET = import.meta.env.VITE_R2_BUCKET || 'comprovantes';
const R2_PUBLIC_DOMAIN = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-037e6299da09481393cce24f5ee99014.r2.dev';

export const generateR2Path = (file: File | Blob, orderId?: string): string => {
  const timestamp = Date.now();
  const idStr = orderId || 'avulso';
  const fileName = (file as any).name || `upload-${timestamp}.jpg`;
  const cleanName = fileName.replace(/[^a-zA-Z0-9.]/g, '-');
  return `${idStr}-${timestamp}-${cleanName}`;
};

/**
 * Corrige URLs do R2 que possam conter pastas redundantes (ex: /comprovantes/comprovantes/)
 */
export const cleanR2Url = (url: string): string => {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('.r2.dev')) return url; // Só processa links R2

  // ⚡ EMERGÊNCIA: Remove qualquer ocorrência da pasta '/comprovantes/' no caminho,
  // pois todos os arquivos foram migrados para a raiz do bucket no R2.
  // Isso resolve links antigos do Supabase e links com duplicidade.
  let cleaned = url;
  while (cleaned.includes('/comprovantes/')) {
    cleaned = cleaned.replace('/comprovantes/', '/');
  }

  return cleaned;
};

export const uploadToR2 = async (file: File | Blob, path: string): Promise<string> => {
  try {
    console.log(`[R2] Iniciando upload bypass -> ${path}`);

    // 1. Criar o Cliente S3 Localmente (Contornando o Supabase)
    const client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    });

    // 2. Gerar a URL assinada localmente
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: path,
      ContentType: file.type,
    });

    console.log('[R2] Gerando assinatura local...');
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    console.log('[R2] Assinatura obtida com sucesso.');

    // 3. Fazer o PUT direto para o R2 usando a URL gerada
    console.log('[R2] Enviando arquivo para o Cloudflare...');
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[R2] Erro no Cloudflare:', errorText);
      throw new Error(`Erro do Cloudflare: ${response.statusText}`);
    }

    // 4. Construir e retornar a URL pública e final
    const finalUrl = cleanR2Url(`${R2_PUBLIC_DOMAIN}/${path}`);
    console.log('[R2] Upload finalizado:', finalUrl);
    return finalUrl;

  } catch (error: any) {
    console.error('[R2] Erro Crítico no Upload Bypass:', error);
    throw new Error(error.message || 'Falha no upload para o R2');
  }
};
