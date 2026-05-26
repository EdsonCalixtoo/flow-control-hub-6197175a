-- Habilita o uso de RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

-- 1. Política para permitir leitura pública da tabela de pedidos (para a tela de rastreio)
DROP POLICY IF EXISTS "Leitura de Pedidos Pública" ON public.orders;
CREATE POLICY "Leitura de Pedidos Pública" 
ON public.orders 
FOR SELECT 
USING (true);

-- 2. Política para permitir leitura pública da tabela de garantias (para a tela de rastreio de garantia)
DROP POLICY IF EXISTS "Leitura de Garantias Pública" ON public.warranties;
CREATE POLICY "Leitura de Garantias Pública" 
ON public.warranties 
FOR SELECT 
USING (true);

-- 3. Habilita o Realtime para rastreio ao vivo (se não estiver habilitado na migração)
-- Opcional via SQL puro no Supabase (em alguns projetos pode dar warning dependendo da versão, mas é seguro):
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table warranties;
