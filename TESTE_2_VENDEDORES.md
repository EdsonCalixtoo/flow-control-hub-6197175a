# 🧪 GUIA DE TESTE: Criar Orçamento com 2 Vendedores

## Cenário de Teste — Máximo Stress

Este teste valida que **2 vendedores conseguem criar orçamentos simultaneamente sem conflito**.

---

## 📋 Pré-Requisitos

✅ Migração SQL aplicada (`update_schema_v6_fix_realtime.sql`)  
✅ 2 contas de vendedor cadastradas (ou pode ser no mesmo vendedor em 2 abas)  
✅ Pelo menos 1 cliente cadastrado  
✅ Pelo menos 1 produto cadastrado  

---

## 🚀 TESTE 1: Single Vendor (Teste Básico)

**Objetivo:** Verificar que 1 vendedor consegue criar 1 orçamento sem erro.

### Passo a Passo

1. **Abra a aplicação** em um navegador
   ```
   http://localhost:5173
   ```

2. **Faça login como VENDEDOR 1**
   - Email: vendedor1@example.com
   - Senha: (sua senha)

3. **Vá para: Orçamentos**
   - Menu lateral → Orçamentos

4. **Clique: Novo Orçamento**
   - Botão verde "+ Novo Orçamento"

5. **Preencha o formulário:**
   - **Cliente:** Selecione qualquer cliente
   - **Produto:** Selecione qualquer produto
   - **Quantidade:** 1
   - **Preço Unitário:** (será preenchido automaticamente se produto selecionado)
   - **Data de Entrega:** Qualquer data futura
   - **Tipo:** Entrega ou Instalação
   - **Observação:** (opcional) "Teste single vendedor"

6. **Clique: Criar Orçamento**
   - Botão azul "📄 Criar Orçamento"

### ✅ Resultado Esperado

- ✅ Botão fica "⚙️ Processando..." (2-3 segundos)
- ✅ Desaparece o formulário
- ✅ Orçamento aparece na lista com número **PED-001**
- ✅ Console mostra:
  ```
  [OrcamentosPage] 🔄 TENTATIVA 1/3: Gerando número do pedido...
  [OrcamentosPage] ✅ Número gerado: PED-001
  [OrcamentosPage] 📍 Salvando orçamento PED-001 no banco...
  [ERP] ✨ Ordem criada no state local: PED-001 uuid-xxx
  [ERP] 💾 Tentativa 1/3 — Salvando no banco: PED-001
  [ERP] ✅ Pedido salvo no banco com sucesso: PED-001
  [OrcamentosPage] ✨ SUCESSO! Orçamento PED-001 criado.
  ```

---

## 🧪 TESTE 2: Dual Vendor (Teste de Concorrência)

**Objetivo:** 2 vendedores criam orçamentos **exatamente no mesmo momento**.

### Setup

Escolha uma das opções:

**Opção A: 2 Computadores ✅ (Melhor)**
- Computador 1: Vendedor 1 (seu computador)
- Computador 2: Vendedor 2 (outro computador na rede)
- Network: Mesma rede local (ou acesso ao servidor)

**Opção B: 2 Navegadores Diferentes (Bom)**
- Navegador 1 (Chrome): Vendedor 1
- Navegador 2 (Firefox): Vendedor 2
- Mesma máquina, navegadores diferentes

**Opção C: 2 Abas do Mesmo Navegador (Básico)**
- Aba 1: Vendedor 1
- Aba 2: Vendedor 1 (mesmo usuário, 2 abas)
- Válido para testar race condition local

### Passo 1️⃣: Preparar Computador/Navegador 1 (Vendedor 1)

1. **Abra a aplicação**
   ```
   http://localhost:5173
   ```

2. **Faça login como VENDEDOR 1**
   - Email: vendedor1@example.com

3. **Vá para Orçamentos**

4. **Clique: Novo Orçamento**
   - Formulário aparece

5. **Preencha os dados (MAS NÃO CLIQUE EM SALVAR AINDA):**
   - Cliente: Qualquer um
   - Produto: Qualquer um
   - Quantidade: 1
   - Preço: Automático
   - **PAROU AQUI** ⏸️

---

### Passo 2️⃣: Preparar Computador/Navegador 2 (Vendedor 2)

1. **Abra a aplicação** (em outro navegador/máquina)
   ```
   http://localhost:5173
   ```

2. **Faça login como VENDEDOR 2**
   - Email: vendedor2@example.com

3. **Vá para Orçamentos**

4. **Clique: Novo Orçamento**
   - Formulário aparece

5. **Preencha os dados (MAS NÃO CLIQUE EM SALVAR AINDA):**
   - Cliente: Outro cliente (diferente do Vendedor 1)
   - Produto: Outro produto (diferente do Vendedor 1)
   - Quantidade: 2
   - Preço: Automático
   - **PAROU AQUI** ⏸️

---

### Passo 3️⃣: TESTE DE CONCORRÊNCIA — Clique SIMULTANEAMENTE

**Importante:** Ambos clicam em "Criar Orçamento" ao mesmo tempo (ou com diferença de <1 segundo).

**Vendedor 1:**
- Clique: **📄 Criar Orçamento**

**Vendedor 2:**
- Clique: **📄 Criar Orçamento**

---

### ✅ Resultado Esperado

#### Vendedor 1 (Console)
```
[OrcamentosPage] 🔄 TENTATIVA 1/3: Gerando número do pedido...
[OrcamentosPage] ✅ Número gerado: PED-001
[OrcamentosPage] 📍 Salvando orçamento PED-001 no banco...
[ERP] ✨ Ordem criada no state local: PED-001 uuid-xxx
[ERP] 💾 Tentativa 1/3 — Salvando no banco: PED-001
[ERP] ✅ Pedido salvo no banco com sucesso: PED-001
[OrcamentosPage] ✨ SUCESSO! Orçamento PED-001 criado.
```

**Tela do Vendedor 1:**
- Formulário desaparece
- Orçamento novo aparece com número: **PED-001**

---

#### Vendedor 2 (Console)
```
[OrcamentosPage] 🔄 TENTATIVA 1/3: Gerando número do pedido...
[OrcamentosPage] ✅ Número gerado: PED-002
[OrcamentosPage] 📍 Salvando orçamento PED-002 no banco...
[ERP] ✨ Ordem criada no state local: PED-002 uuid-yyy
[ERP] 💾 Tentativa 1/3 — Salvando no banco: PED-002
[ERP] ✅ Pedido salvo no banco com sucesso: PED-002
[OrcamentosPage] ✨ SUCESSO! Orçamento PED-002 criado.
```

**Tela do Vendedor 2:**
- Formulário desaparece
- Orçamento novo aparece com número: **PED-002**

---

### 🔍 Verificação Cruzada

1. **Vendedor 1 recarrega a página (F5)**
   - Deve ver: PED-001 (seu orçamento)
   - Não deve ver: PED-002 (do Vendedor 2 — isolação de dados)

2. **Vendedor 2 recarrega a página (F5)**
   - Deve ver: PED-002 (seu orçamento)
   - Não deve ver: PED-001 (do Vendedor 1 — isolação de dados)

3. **No BD Supabase** (SQL Editor)
   ```sql
   SELECT id, number, seller_id, client_name, status, created_at
   FROM orders
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   - Deve mostrar: 2 linhas recentes com números PED-001 e PED-002

---

## ❌ Erros Comuns (Se Acontecer)

### Erro: "Erro: Número de pedido duplicado"

**Causa:** Migração SQL não foi aplicada ou tem problema.

**Solução:**
1. Abra Supabase Dashboard
2. SQL Editor → New Query
3. Cole e rode: `update_schema_v6_fix_realtime.sql`
4. Recarregue aplicação (Ctrl+F5)
5. Tente novamente

---

### Erro: "Erro de permissão. Verifique se você está logado."

**Causa:** Token expirado ou RLS bloqueando.

**Solução:**
1. Faça logout (menu → Logout)
2. Faça login novamente
3. Tente criar pedido novamente

---

### Erro: "Erro no servidor. A migração SQL pode não ter sido aplicada."

**Causa:** Função `fn_get_next_order_number()` não existe.

**Solução:** Execute a migração SQL (veja "Erro: Número de pedido duplicado" acima)

---

### Erro: "Erro de conexão. Verifique sua internet."

**Causa:** Sem conexão com Supabase ou servidor caiu.

**Solução:**
1. Verifique sua internet
2. Verifique se Supabase está online (https://status.supabase.com)
3. Tente novamente em 30 segundos

---

## 📊 Métricas de Sucesso

| Item | Esperado | Status |
|------|----------|--------|
| Vendedor 1 cria PED-001 | ✅ Sem erro | ☐ |
| Vendedor 2 cria PED-002 | ✅ Sem erro | ☐ |
| Números diferentes | ✅ PED-001 ≠ PED-002 | ☐ |
| Sem duplicatas | ✅ Cada número aparece 1x | ☐ |
| Sincronização realtime | ✅ Ambos veem seus pedidos | ☐ |
| Isolação de dados | ✅ Vendedor 1 não vê Vend 2 | ☐ |
| Console sem erros | ✅ Sem "❌ ERRO" vermelho | ☐ |

---

## 🎉 Teste Concluído

Se tudo passou em ✅, o sistema está **100% funcional e pronto para produção**.

Se algum teste falhou, abra uma issue com:
- Screenshots dos erros
- Logs do console (F12)
- Número do erro exato

---

## 💡 Próximas Validações (Opcional)

1. **Teste com 5 vendedores** criando ao mesmo tempo
2. **Teste criando 100 pedidos** em sucesso
3. **Teste com 50% taxa de falha** e retry automático
4. **Performance:** Quanto tempo leva para criar 10 pedidos?

---

## 📞 Suporte

Se ficou com dúvida:
- Chat de suporte integrado
- Email: support@flowcontrolhub.com
- Docs: [REALTIME_SETUP_v6.md](REALTIME_SETUP_v6.md)
