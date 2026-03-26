/**
 * Supabase Edge Function: get-r2-signature 🔒
 * Versão LITE (Usando s3_lite_client para evitar o erro 502)
 */
import { S3Client } from "https://deno.land/x/s3_lite_client@0.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { path } = await req.json();

    const s3Options = {
      endPoint: Deno.env.get('R2_ENDPOINT')?.replace('https://', '') || '0b65e60c3f1e7ee7d159206a8b869d9a.r2.cloudflarestorage.com',
      accessKey: Deno.env.get('R2_ACCESS_KEY_ID') || 'bc426a2f2334e551b0bbf412d9fce2db',
      secretKey: Deno.env.get('R2_SECRET_ACCESS_KEY') || '6e979527f243a02d4fd7d9d91ad4dade4676fb971191643edf7841c400166ad2',
      bucket: Deno.env.get('R2_BUCKET') || 'comprovantes',
      region: "auto",
      useSSL: true,
    };

    const s3Client = new S3Client(s3Options);
    const url = await s3Client.getPresignedUrl("PUT", path, { expirySize: 3600 });

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
