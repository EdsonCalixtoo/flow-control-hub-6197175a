/**
 * Cliente Supabase público — usado APENAS para leitura pública (ex: página de rastreio do cliente).
 * Não depende de sessão autenticada. Usa a anon key mas via fetch direto com header apikey
 * para contornar o cache de sessão do cliente principal.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Cliente separado sem persistência de sessão — storageKey diferente para evitar conflito com o cliente principal
export const supabasePublic = createClient(supabaseUrl, supabaseAnon, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sb-public-auth-token', // chave diferente da padrão evita o warning "Multiple GoTrueClient instances"
    },
});
