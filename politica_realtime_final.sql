
-- POLÍTICA DE REALTIME AUTHORIZADA (SÃO PAULO) - CORRIGIDO

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "authenticated can read realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can insert realtime" ON realtime.messages;

-- 2. Criar política que permite usuários autenticados RECEBEREM mensagens
CREATE POLICY "authenticated can read realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING ( true );

-- 3. Criar política que permite usuários autenticados ENVIAREM mensagens
CREATE POLICY "authenticated can insert realtime"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK ( true );
