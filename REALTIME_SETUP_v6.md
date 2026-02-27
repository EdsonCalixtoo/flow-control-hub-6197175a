# 🔥 SETUP REALTIME 100% — v6

## ⚠️ URGENTE: Execute AGORA para sincronização em tempo real

Seu sistema ERP está **PRONTO** para Realtime, mas precisa executar a migração SQL no Supabase para ativar!

---

## 🎯 O QUE FOI CORRIGIDO

### ✅ Financeiro recebe orçamentos em tempo real (sem atualizar página)
- Antes: Precisava F5 ou atualizar página para ver novo pedido
- Agora: Vê na hora que o vendedor cria!

### ✅ Múltiplos vendedores sem conflito de números
- Antes: Erro "duplicate key value violates unique constraint"
- Agora: Servidor gera números sequenciais únicos (PED-001, PED-002,...)

### ✅ Todas as tabelas com Realtime ativo
- `orders` ✓ (pedidos/orçamentos)
- `order_items` ✓ (itens do pedido)
- `order_status_history` ✓ (histórico de status)
- `financial_entries` ✓ (entradas financeiras)
- `barcode_scans` ✓ (leitura de códigos)
- `delivery_pickups` ✓ (retirada de entregador)

---

## 🔧 PASSO A PASSO: Executar migração SQL

### 1️⃣ Abra o Supabase Dashboard
https://app.supabase.com

### 2️⃣ Selecione seu projeto
- Nome: seu projeto Flow Control Hub

### 3️⃣ Vá para SQL Editor
- Menu lateral esquerdo → "SQL Editor"

### 4️⃣ Crie nova query
- Clique em "New Query" ou "+"

### 5️⃣ Copie e cole o SQL
Copie TODO o conteúdo do arquivo:
```
supabase/update_schema_v6_fix_realtime.sql
```

### 6️⃣ Execute
- Clique em botão azul "Run" ou Ctrl+Enter
- Espere concluir (uns 10 segundos)

### 7️⃣ Verifique resultado
Deve aparecer no console:
```
NOTICE: ╔════════════════════════════════════════════════════════╗
NOTICE: ║  ✓ MIGRAÇÃO v6 APLICADA COM SUCESSO!                  ║
NOTICE: ╚════════════════════════════════════════════════════════╝
```

---

## ✔️ APÓS EXECUTAR SQL: Teste tudo

### 1. Reload da aplicação (Ctrl+F5)
```
Fecha aplicação aberta
Abrre novamente
Faz login
```

### 2. Teste Realtime em 2 navegadores/abas
**Aba 1: Vendedor criando pedido**
- Abra página de Orçamentos
- Clique "Novo Orçamento"
- Preencha client, produtos, valor
- Clique "Salvar"
- ✅ Deve gerar número automaticamente (PED-XXX)

**Aba 2: Financeiro consultando**
- Abra página de Orçamentos (financeiro)
- **NÃO PRECISA ATUALIZAR PÁGINA**
- Novo pedido deve aparecer em tempo real (1-2 segundos)

### 3. Verifique números sequenciais
- Crie 3 pedidos
- Deve ser: PED-001, PED-002, PED-003 (sem saltos, sem duplicatas)

### 4. Teste com múltiplos vendedores
- 2 vendedores criando pedidos ao mesmo tempo
- Ambos devem ver números diferentes (sem conflito)

---

## 🚨 SE ALGO NÃO FUNCIONAR

### Erro: "função fn_get_next_order_number não existe"
**Causa**: SQL não foi executado corretamente
**Solução**: 
1. Verifique se clicou "Run" (não apenas copiar)
2. Veja console do Supabase para erros
3. Execute novamente todo o arquivo .sql

### Erro: "Invalid Refresh Token"
**Causa**: Sessão expirada durante teste
**Solução**:
1. Logout (menu usuário)
2. Login novamente
3. Tente criar pedido de novo

### Financeiro ainda vendo página "antiga"
**Causa**: Cache do navegador
**Solução**: Limpar cache
```
Windows/Linux: Ctrl+Shift+Delete
Mac: Cmd+Shift+Delete
Ou menu > Más ferramentas > Limpar dados de navegação
```

### Realtime não está atualizando
**Causa**: Realtime não foi publicado na migração
**Solução**: Execute script SQL novamente, focando na seção:
```
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
```

---

## 📊 VERIFICAR SE REALTIME ESTÁ ATIVO

No Supabase Dashboard:
1. Database → Replication → Real-time Status
2. Deve listar essas tabelas:
   - `orders` ✓
   - `order_items` ✓
   - `order_status_history` ✓
   - `financial_entries` ✓
   - `barcode_scans` ✓
   - `delivery_pickups` ✓

Se faltar alguma, execute migração novamente.

---

## 🎉 APÓS TUDO OK

Seu sistema agora:
✅ É 100% em tempo real
✅ Financeiro vê pedidos instantaneamente
✅ Sem erros de números duplicados
✅ Pronto para produção!

**Celebrate! 🎊**

---

## 📞 PRÓXIMOS PASSOS

1. **Agora**: Execute SQL na Supabase
2. **Depois**: Teste cenários acima
3. **Em produção**: Monitore console para erros
4. **Feedback**: Me avise se tudo funcionou!

```
Qualquer dúvida, entre em contato!
```
