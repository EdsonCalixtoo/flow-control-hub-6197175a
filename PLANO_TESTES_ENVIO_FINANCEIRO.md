# 🧪 PLANO DE TESTES: Envio para Financeiro

## 🔍 PROBLEMA REPORTADO

```
1. Crio orçamento (rascunho)
2. Clico "Enviar para Financeiro"
3. Nada acontece visualmente
4. Atualizo página (F5)
5. Volta para criação (como se não tivesse sido enviado)
```

## 🎯 POSSÍVEIS CAUSAS IDENTIFICADAS

### Causa 1: `enviarFinanceiro()` não é async
```tsx
const enviarFinanceiro = (orderId: string) => {  // ❌ Não é async
  updateOrderStatus(...);  // ❌ Não aguarda resultado
  setSelectedOrder(null);  // ❌ Limpa imediatamente
};
```

**Impacto:**
- Se `updateOrderStatus` lançar erro, não é capturado
- Estado é limpado mesmo que falhe no banco
- User vê "nada aconteceu"
- Ao F5, remonta do banco (ainda como rascunho)

---

## 🧪 TESTES A EXECUTAR

### TESTE 1: Verificar Logs ao Enviar

**Setup:**
1. Abra F12 (DevTools)
2. Vá ao Console
3. Crie um orçamento completo (sem erros)
4. Clique "Enviar para Financeiro"

**Procure por (no Console):**

✅ BOM SINAL:
```
[ERP] Status atualizado no banco: aguardando_financeiro
[ERP] ✅ Pedidos re-sincronizados do banco: X
```

❌ SINAL DE ERRO:
```
[ERP] Erro ao atualizar status no banco — revertendo:
[ERP] ❌ Algum erro específico...
```

❌ FALTA DE LOGS:
```
(nada relacionado a status update)
```

---

### TESTE 2: Verificar Status no Banco

**SQL Query** (executar no Supabase):
```sql
-- Verificar último orçamento criado
SELECT 
  id, 
  number, 
  status, 
  updated_at,
  seller_id
FROM public.orders
ORDER BY created_at DESC
LIMIT 1;
```

**Resultados Esperados:**

✅ Status = `aguardando_financeiro` → Envio FUNCIONOU
❌ Status = `rascunho` → Envio FALHOU

---

### TESTE 3: Rastrear Fluxo Completo

**Passo a Passo:**

1. Console aberta (Ctrl+Shift+K ou F12)

2. **Criar Orçamento:**
   ```
   Ir para Orçamentos → Novo
   Preencher cliente, produtos
   Clique "Salvar Orçamento"
   ```
   
   Logs esperados:
   ```
   [OrcamentosPage] 🔄 TENTATIVA 1/3: Gerando número...
   [OrcamentosPage] ✅ Número gerado: PED-XXX
   [ERP] ✨ Ordem criada no state local: PED-XXX
   [ERP] 💾 Tentativa 1/3 — Salvando no banco: PED-XXX
   [ERP] ✅ Pedido salvo no banco com sucesso: PED-XXX
   ```

3. **Enviar para Financeiro:**
   ```
   Clique "Enviar para Financeiro"
   ```
   
   Logs esperados:
   ```
   [ERP] Status atualizado no banco: aguardando_financeiro
   [ERP] ✅ Pedidos re-sincronizados do banco: X
   ```
   
   Se NÃO vir acima:
   ```
   ❌ [ERP] Erro ao atualizar status no banco
   ❌ (nenhum log)
   ```

4. **Recarregar (F5):**
   ```
   Aperte F5
   ```
   
   Logs de sync:
   ```
   [ERP] ✅ Sincronizado com Supabase: {...}
   [ERP] clientDetails: [...]
   ```
   
   Resultado esperado:
   ```
   ✅ Orçamento aparece com status "Aguardando Financeiro"
   ❌ UI volta para criação (problema!)
   ❌ Orçamento desapareceu completamente
   ```

---

## 🔍 SE ENCONTRAR LOGS DE ERRO

**Cenário 1: Error updating status**
```
[ERP] Erro ao atualizar status no banco — revertendo: 
  TypeError: Cannot read property 'statusHistory'
```
→ Problema no objeto Order (faltam campos)

**Cenário 2: Network error**
```
[ERP] Erro ao atualizar status no banco — revertendo:
  ERROR: Failed to fetch...
```
→ Problema de conectividade ou Supabase down

**Cenário 3: Permission error**
```
[ERP] Erro ao atualizar status: 
  new row violates row-level security policy
```
→ RLS bloqueando usuário

---

## 📊 CHECKLIST ANTES DE CORRIGIR

- [ ] Executei TESTE 1 (verificar console logs)
- [ ] Executei TESTE 2 (verificar status no SQL)
- [ ] Executei TESTE 3 (rastrear fluxo completo)
- [ ] Entendi onde está falhando
- [ ] Coletei logs específicos do erro

**Depois de coletar, compartilha o resultado aqui!**

---

## 🚦 PRÓXIMAS AÇÕES APÓS TESTES

### SE os logs mostram sucesso, mas UI não atualiza:
→ Problema é UI/estado, não banco

### SE os logs mostram ERRO:
→ Corrigir especificamente o erro capturado

### SE não há logs de atualização:
→ Função não está sendo chamada ou await missing

