
-- SISTEMA DE BROADCAST REALTIME VIA TRIGGER (SÃO PAULO)
-- Alternativa mais confiável ao postgres_changes para versões novas do Supabase

-- 1. Habilitar extensão de HTTP para o Trigger poder chamar o Realtime
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Criar a função que dispara o broadcast quando um pedido muda
CREATE OR REPLACE FUNCTION public.notify_order_changes()
RETURNS trigger AS $$
BEGIN
  -- Manda um aviso via Realtime Broadcast no canal 'orders-stable-sync'
  PERFORM
    net.http_post(
      url := 'https://wezxkgeaaddmpmijudjt.supabase.co/functions/v1/realtime-broadcast',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlenhrZ2VhYWRkbXBtaWp1ZGp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDExMTE1NSwiZXhwIjoyMDg5Njg3MTU1fQ.RBXTzQlMqj32tmBpa8ElJcplkpTdrfvyBeNVB2DSY3A"}'::jsonb,
      body := json_build_object(
        'channel', 'orders-stable-sync',
        'event', TG_OP,
        'payload', row_to_json(NEW)
      )::text
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar o Trigger que chama a função quando um pedido muda
DROP TRIGGER IF EXISTS on_order_change ON public.orders;
CREATE TRIGGER on_order_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_changes();
