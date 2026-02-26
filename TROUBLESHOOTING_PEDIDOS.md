# 📦 Troubleshooting: Pedidos Não Aparecem em Produção

## 🔴 Problema

```
✓ Login OK
❌ Mas pedidos NÃO aparecem em produção
❌ Lista vazia ou carregando infinitamente
```

## ✅ Causas Comuns

### 1. **RLS (Segurança do Banco) Bloqueando Acesso**

A tabela `orders` tem **Row Level Security** que só mostra:
- Pedidos que você criou (seller)
- Pedidos do seu cliente (se for cliente)
- Todos os pedidos (se for financeiro/gestor/produção)

**Solução:**
```sql
-- Verifique seu role:
SELECT id, name, role FROM public.profiles WHERE id = 'seu-id';

-- Se role for 'vendedor':
-- Você só vê pedidos onde seller_id = seu-id
```

### 2. **Você Entrou Como rol ERRADO**

**Exemplo:**
- Você se registrou como **vendedor**
- Mas tenta acessar a página **Produção** (só ou produção acessa)
- Resultado: Lista vazia

**Solução:**
1. Verifique seu role na tela inicial
2. Se errado, contacte admin para alterar

### 3. **Tabela `orders` Vazia no Banco**

Se ninguém criou pedidos ainda, lista fica vazia!

**Teste:**
```sql
SELECT COUNT(*) FROM public.orders;
-- Se resultado = 0, não há pedidos cadastrados
```

### 4. **Erro de Permissão no RLS**

Se receber erro como:
```
permission denied for schema public
```

**Solução:**
```sql
-- Admin executa:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
```

---

## 🔧 Como Diagnosticar

### Passo 1: Verificar o Console

1. Abra **DevTools (F12)**
2. Vá em **Console**
3. Procure por mensagens vermelhas: 
   ```
   Error: Failed to fetch
   permission denied
   relation "orders" does not exist
   ```

### Passo 2: Verificar Network

1. **DevTools (F12)** > **Network**
2. Recarregue a página
3. Procure por requisições vermelhas
4. Clique em uma requisição
5. Vá em **Response**
6. Se vir erro de SQL → problema no banco

### Passo 3: Testar Supabase Diretamente

1. Acesse: https://app.supabase.com
2. Seu projeto
3. **SQL Editor** > **New query**
4. Execute:
```sql
SELECT * FROM public.orders LIMIT 5;
```
- ✅ Retorna dados? → Banco OK, problema na app
- ❌ Erro de permissão? → Problema de RLS

### Passo 4: Verificar Seu Role

```sql
-- Execute no SQL Editor do Supabase:
SELECT id, email, role FROM public.profiles 
WHERE email = 'seu@email.com';
```

| Role | Vê | Pode fazer |
|------|----|----|
| `vendedor` | Pedidos que criou | Criar orçamentos |
| `financeiro` | Todos os pedidos | Aprovar pagamentos |
| `gestor` | Todos os pedidos | Ver conferência |
| `producao` | Todos os pedidos | Liberar produtos |

---

## 🆘 Solução Passo-a-Passo

### Se está vazio mesmo com permissão:

**1. Criar dados de teste:**
```sql
-- Crie um cliente
INSERT INTO public.clients (name, cpf_cnpj, email, phone, address, city, state, cep)
VALUES ('Cliente Teste', '12345678901234', 'cliente@test.com', '(11)98765-4321', 'Rua Test', 'SP', 'SP', '01311-000');

-- Crie um pedido (substitua SEU-ID)
INSERT INTO public.orders (number, client_id, client_name, seller_id, seller_name, subtotal, taxes, total, status, notes)
VALUES ('PED-001', (SELECT id FROM clients LIMIT 1), 'Cliente Teste', 'SEU-ID', 'Seu Nome', 100, 0, 100, 'aguardando_producao', 'Teste');

-- Crie um item
INSERT INTO public.order_items (order_id, product_name, quantity, unit_price, total)
VALUES ((SELECT id FROM orders WHERE number = 'PED-001'), 'Produto Teste', 1, 100, 100);
```

**2. Verifique no app:**
- Recarregue a página
- Deve aparecer `PED-001`

---

## 🐛 Erros Comuns

### Erro: "relation 'orders' does not exist"

**Causa:** Tabela não foi criada

**Solução:**
1. Vá em **Migrations** no Supabase
2. Execute `schema.sql` novamente
3. Ou contacte admin

### Erro: "column 'seller_id' does not exist"

**Causa:** Migração incompleta

**Solução:**
```sql
-- Verifique colunas:
\d public.orders

-- Se faltar, execute migração mais nova:
-- Ver arquivo update_schema_v4.sql
```

### Erro: "permission denied for schema public"

**Causa:** RLS muito restritivo ou usuário sem permissão

**Solução:**
```sql
-- Admin:
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Crie política para seu role:
CREATE POLICY "producao_see_all" ON public.orders
FOR SELECT TO authenticated
USING (true);  -- Só produção vê tudo
```

---

## 📊 Checklist de Diagnóstico

- [ ] Limpou sessão completamente?
- [ ] Fez login com credencial correta?
- [ ] Verificou seu role no banco?
- [ ] Sua role tem acesso à tabela orders?
- [ ] Há dados na tabela orders?
- [ ] DevTools mostra erro vermelha em Network?
- [ ] SQL no Supabase retorna dados?

---

## 🔗 Links Úteis

- [Guia de Login Expirado](./SOLUCAO_LOGIN_EXPIRADO.md)
- [Scanner Troubleshooting](./TROUBLESHOOTING_SCANNER.md)
- Supabase Dashboard: https://app.supabase.com
- Documentação RLS: https://supabase.com/docs/guides/auth/row-level-security

---

**Ainda não resolveu?**

Colete:
1. Screenshot do erro
2. Seu role (SELECT role FROM public.profiles...)
3. Resultado de: SELECT COUNT(*) FROM public.orders
4. Console log (F12 > Console > copie tudo em vermelho)

E envie para: seu@email.com
