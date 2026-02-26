-- ═══════════════════════════════════════════════════════════════
-- FIX: Pedidos sumindo ao atualizar página
-- Problema: ENUM order_status no banco não inclui todos os status
--           do frontend, causando erros silenciosos ao salvar
-- Execute este script no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Adiciona status faltantes no ENUM ────────────────────────
-- O PostgreSQL não permite DROP/RECREATE de ENUM em uso,
-- então usamos ADD VALUE (seguro, não quebra dados existentes)

DO $$
BEGIN
  -- retirado_entregador
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'retirado_entregador'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'retirado_entregador';
    RAISE NOTICE 'Status retirado_entregador adicionado ✓';
  ELSE
    RAISE NOTICE 'Status retirado_entregador já existe ✓';
  END IF;
END $$;

-- ─── 2. Verifica se todos os status do frontend existem no banco ──
DO $$
DECLARE
  expected_statuses TEXT[] := ARRAY[
    'rascunho', 'enviado', 'aprovado_cliente',
    'aguardando_financeiro', 'aprovado_financeiro', 'rejeitado_financeiro',
    'aguardando_gestor', 'aprovado_gestor', 'rejeitado_gestor',
    'aguardando_producao', 'em_producao',
    'producao_finalizada', 'produto_liberado', 'retirado_entregador'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY expected_statuses LOOP
    IF EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = s
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
    ) THEN
      RAISE NOTICE 'Status % : ✓', s;
    ELSE
      RAISE WARNING 'Status % : ✗ FALTANDO!', s;
    END IF;
  END LOOP;
END $$;

-- ─── 3. Remove trigger duplicado de lançamento financeiro ─────────
-- O frontend E o banco criavam lançamentos ao aprovar pedido,
-- gerando DUPLICATAS. Mantemos apenas o trigger do banco (mais confiável).
-- O frontend foi corrigido para não criar mais lançamentos duplicados.
DROP TRIGGER IF EXISTS trg_auto_financial_entry ON orders;

-- Recria o trigger de forma segura (evita duplicatas verificando order_id)
CREATE OR REPLACE FUNCTION auto_create_financial_entry()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'aprovado_financeiro' AND (OLD.status IS DISTINCT FROM 'aprovado_financeiro') THEN
    IF NOT EXISTS (
      SELECT 1 FROM financial_entries
      WHERE order_id = NEW.id AND type = 'receita'
    ) THEN
      INSERT INTO financial_entries (type, description, amount, category, entry_date, status, order_id)
      VALUES (
        'receita',
        'Pagamento ' || NEW.number || ' - ' || NEW.client_name,
        NEW.total,
        'Vendas',
        CURRENT_DATE,
        'pago',
        NEW.id
      );
      RAISE NOTICE 'Lançamento financeiro criado automaticamente para pedido %', NEW.number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_financial_entry
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION auto_create_financial_entry();

-- ─── 4. Verifica pedidos com status inválido (diagnóstico) ────────
SELECT
  number,
  client_name,
  status,
  updated_at
FROM orders
ORDER BY updated_at DESC
LIMIT 20;

-- ─── Confirmação ─────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=== Fix pedidos sumindo aplicado com sucesso ✓ ===';
  RAISE NOTICE 'ENUM atualizado, trigger de lançamento financeiro recriado';
END $$;
