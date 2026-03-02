# 🔍 ANÁLISE COMPLETA: Clientes Desaparecem + Produtos Não Aparecem

## RAIZ DOS PROBLEMAS IDENTIFICADOS

### 1️⃣ CLIENTE DESAPARECE APÓS CADASTRO

**Sintomas:**
- Cliente criado → Aparece momentaneamente → Desaparece ao F5
- 6 clientes no console mas 0 na tela

**Diagnóstico da Raiz:**
```tsx
// NO ClientesPage.tsx - FILTRO MUITO RESTRITIVO
const myClients = clients.filter(c => {
  if (user?.role !== 'vendedor') return true;
  
  const createdByUserId = (c as any).createdBy === user?.id;  // ❌ Problema
  const hasNoCreator = !(c as any).createdBy;
  
  // ❌ Se cliente foi criado por Outro Vendedor, fica bloqueado!
  return createdByUserId || hasNoCreator;
});
```

**Causa Principal:**
1. Vendedor 1 cria cliente → salva com `createdBy = vendedor1_id`
2. Ao recarregar, outro vendedor vê `createdBy = vendedor1_id` mas é `vendedor2`
3. Filtro bloqueia: `createdBy !== user.id` E `createdBy !== null`
4. **Cliente desaparece para Vendedor 2!**

**Solução:**
NÃO USAR FILTRO CLIENT-SIDE BASEADO EM `createdBy` PARA VISIBILITY.
Os clientes devem ser visíveis a TODOS os vendedores (isolamento é apenas para ORDERS).

---

### 2️⃣ VENDEDORES NÃO VÊM PRODUTOS DO ESTOQUE

**Sintomas:**
```
✓ Gestor vê produtos em EstoquePage
✓ Produtos existem no banco
❌ Vendedor vê lista vazia em OrcamentosPage
```

**Diagnóstico da Raiz:**
No OrcamentosPage.tsx linha 540:
```tsx
{products.length > 0 ? (
  <select ...>
    <option value="">Selecione um produto...</option>
    {products.map(p => (  // ❌ products pode estar vazio!
      <option key={p.id} value={p.name}>
        {p.name} — R$ {p.unitPrice.toFixed(2)}
```

**Causa:**
1. Verificar se `products` está realmente vazio
2. Verificar se RLS está bloqueando leitura de produtos
3. Verificar se `fetchProducts()` está filtrando incorretamente

**Na schema.sql:**
```sql
CREATE POLICY "auth users: all on products" ON products
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
✅ A política está correta — todos os autenticados vêem!

---

## PROBLEMAS NA IMPLEMENTAÇÃO ATUAL

### ❌ Problema 1: Filtro de Clientes Isolando por Vendedor
**Arquivo:** `ClientesPage.tsx` linha 77-98
**Impacto:** Cada vendedor só vê seus próprios clientes

**Solução:** Remover o filtro ou tornar opcional

---

### ❌ Problema 2: Produtos Não Sendo Carregados no Contexto
**Arquivo:** `ERPContext.tsx` linha 89
**Possível Causa:** Erro ao fetch, RLS bloqueando, ou não sincronizando

**Solução:** Adicionar logging detalhado para ver o que está sendo retornado

---

### ❌ Problema 3: Cliente Não Sendo Persistido Corretamente
**Arquivo:** `supabaseService.ts` linha 417
**Impacto:** createdBy pode estar null ou incorreto

**Solução:** Garantir que `created_by` sempre tem valor antes de salvar

---

## PLANO DE AÇÃO

### Fase 1: Desbloquear Clientes ✅
[ ] Remover filtro `createdBy` do ClientesPage
[ ] Fazer com que TODOS os vendedores vejam TODOS os clientes
[ ] Manter isolamento apenas para ORDERS (já existe)

### Fase 2: Garantir Produtos Carregam ✅
[ ] Validar que `fetchProducts()` retorna dados
[ ] Adicionar logging para ver quantidade de produtos
[ ] Garantir RLS permite select em products

### Fase 3: Sincronização Pós-Criação ✅
[ ] Após criar cliente, forçar sync do contexto
[ ] Validar `createdBy` ao salvar
[ ] Testar fluxo completo: criar → atualizar → ver

---

## COMANDOS SQL PARA DIAGNOSTICAR

```sql
-- 1. Ver todos os clientes e createdBy
SELECT id, name, created_by, created_at 
FROM public.clients 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Ver quantos produtos
SELECT COUNT(*), COUNT(DISTINCT status) as statuses 
FROM public.products;

-- 3. Ver primeiros 5 produtos
SELECT id, name, unit_price, stock_quantity, status 
FROM public.products 
LIMIT 5;

-- 4. Verificar RLS em products
SELECT policyname, qual, with_check, using 
FROM pg_policies 
WHERE tablename = 'products';

-- 5. Verificar perfil do usuário
SELECT id, email, role, name 
FROM public.profiles 
WHERE email = 'seu@email.com';
```

---

## IMPACTO NA EXPERIÊNCIA DO USUÁRIO

**ANTES (Problema):**
1. Vendedor 1 cria cliente "João Silva"
2. Vendedor 1 atualiza página → Cliente aparece
3. Outro usuário (Vendedor 2) atualiza página → Cliente desaparece
4. Vendedor 2 tenta criar orçamento → Sem produtos na lista
5. Forçado a atualizar página constantemente

**DEPOIS (Solução):**
1. Qualquer vendedor cria cliente
2. Todos os vendedores vêm o cliente imediatamente
3. Todos vêem os produtos do estoque
4. Fluxo: criar cliente → selecionar cliente → criar orçamento funciona sem atualizar

---

## RESUMO DAS MUDANÇAS

| Arquivo | Problema | Solução |
|---------|----------|---------|
| `ClientesPage.tsx` | Filtro muito restritivo | Remover filtro de `createdBy` |
| `OrcamentosPage.tsx` | Validar se products está vazio | Adicionar logging |
| `ERPContext.tsx` | Sync pode não ser suficiente | Adicionar retry após criar cliente |
| `supabaseService.ts` | createdBy pode ser null | Validar antes de salvar |
| Schema RLS | Pode estar bloqueando | Verificar policies |

