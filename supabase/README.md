# 🗄️ Guia de Configuração do Banco de Dados — Supabase

## 📁 Arquivos criados
```
supabase/
  schema.sql          ← SQL completo do banco (cole no Supabase)
src/lib/
  supabase.ts         ← Cliente Supabase + tipos TypeScript
  supabaseService.ts  ← Funções de CRUD para cada tabela
```

---

## 🚀 Passo 1 — Criar as tabelas no Supabase

1. Acesse **[app.supabase.com](https://app.supabase.com)** → seu projeto
2. Vá em **SQL Editor** (ícone de banco de dados na barra lateral)
3. Clique em **"New query"**
4. Abra o arquivo `supabase/schema.sql` deste projeto
5. Cole **todo o conteúdo** no editor
6. Clique em **"Run"** (▶)

✅ Pronto! Todas as tabelas serão criadas automaticamente.

---

## 📋 Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Usuários do sistema (extensão do Supabase Auth) |
| `clients` | Clientes cadastrados pelos vendedores |
| `products` | Produtos do estoque (Gestor) |
| `orders` | Pedidos/orçamentos com todo o ciclo de vida |
| `order_items` | Itens de cada pedido |
| `order_status_history` | Histórico de movimentações de cada pedido |
| `financial_entries` | Lançamentos financeiros (receitas e despesas) |

---

## ⚙️ Triggers automáticos configurados

### ✅ Auto-lançamento ao aprovar pedido
Quando um pedido muda para `aprovado_financeiro`, o banco **automaticamente cria** um lançamento de receita como "pago" — mesmo que o frontend não chame `addFinancialEntry`.

### ✅ updated_at automático
Todas as tabelas têm `updated_at` atualizado automaticamente a cada UPDATE.

---

## 🔐 Segurança (Row Level Security)

O RLS está habilitado em todas as tabelas. A política padrão permite que **qualquer usuário autenticado** acesse todos os dados.

> **Para granularidade por role** (ex: vendedor só vê seus próprios pedidos), substitua as policies no Supabase → Authentication → Policies.

---

## 🔗 Passo 2 — Criar usuários no Supabase Auth

Para cada perfil (vendedor, financeiro, gestor, produção):

1. Vá em **Authentication → Users → Invite user**
2. Após criar, insira manualmente em `profiles` via SQL:
```sql
INSERT INTO profiles (id, name, email, role)
VALUES ('<UUID do auth>', 'Carlos Silva', 'carlos@automozia.com', 'vendedor');
```

---

## 🗃️ Passo 3 — Dados de exemplo (opcional)

No arquivo `schema.sql`, descomente o bloco **SEED DATA** (ao final do arquivo) e execute novamente para inserir clientes, produtos e lançamentos de demonstração.

---

## 🔌 Como integrar o frontend com o banco

Os arquivos `src/lib/supabase.ts` e `src/lib/supabaseService.ts` já estão prontos.

Para migrar de dados mockados para dados reais, no `ERPContext.tsx`, substitua as chamadas locais pelas funções do serviço:

```ts
// Antes (mock):
setOrders(prev => [order, ...prev]);

// Depois (Supabase):
await createOrder(order);
const updated = await fetchOrders();
setOrders(updated);
```

---

## 📊 Próximo número de pedido

Use a função SQL criada:
```sql
SELECT next_order_number(); -- retorna 'PED-001', 'PED-002', etc.
```

No frontend:
```ts
const { data } = await supabase.rpc('next_order_number');
// data = 'PED-001'
```

---

## ✅ Checklist de deploy

- [ ] Executar `schema.sql` no Supabase SQL Editor
- [ ] Verificar que as 7 tabelas aparecem em **Table Editor**
- [ ] Criar usuários em Auth → Users
- [ ] Inserir perfis na tabela `profiles`
- [ ] (Opcional) Descomentar e executar o SEED DATA
- [ ] Migrar `ERPContext.tsx` para usar `supabaseService.ts`
