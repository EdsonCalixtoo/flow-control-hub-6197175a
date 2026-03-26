import { supabase } from './supabase';

/**
 * Serviço de Upload para o Supabase Storage
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Blob
): Promise<string | null> => {
  try {
    // 1. Faz o upload do arquivo
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 2. Obtém a URL pública do arquivo
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error(`[Storage] ❌ Erro ao enviar arquivo para ${bucket}:`, err.message);
    throw err;
  }
};

/**
 * Gera um nome de arquivo único e limpo
 */
export const generateStoragePath = (folder: string, fileName: string): string => {
  const timestamp = new Date().getTime();
  const cleanName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  return `${folder}/${timestamp}_${cleanName}`;
};
