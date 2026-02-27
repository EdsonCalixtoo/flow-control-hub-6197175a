# 🔍 DIAGNÓSTICO: Realtime Vendedor → Financeiro não funciona

## Passos para Descobrir o Problema

### 1️⃣ **PRIMARY: Executar Nova Migração SQL**

Use este script em vez do anterior:
```
supabase/update_schema_v6_simple.sql
```

**Por quê?** O script anterior tinha erros de sintaxe. Este é simples e testado.

---

### 2️⃣ **Abra o Console do Navegador (F12)**

Quando estiver criando um pedido, observe os logs:

**Esperado ver:**
```
[OrcamentosPage] 🔄 Chamando getNextOrderNumber()...
[OrcamentosPage] ✅ Número gerado: PED-001
[OrcamentosPage] 📍 Chamando addOrder() com: PED-001 uuid-xxx
[ERP] Ordem criada no state local: PED-001
[ERP] ✅ Pedido salvo no banco com sucesso: PED-001
[ERP] ✅ Pedidos re-sincronizados do banco: N
```

---

### 3️⃣ **Se ver erro, me avisa a mensagem exata**

Procure por:
- ❌ Erro ao gerar número
- ❌ ERRO ao salvar pedido no banco
- ❌ Erro ao re-sincronizar

**Copie a mensagem completa do console e me envie.**

---

### 4️⃣ **Verifique se Realtime está ligado no Supabase**

1. Abra https://app.supabase.com
2. Seu projeto
3. **Database → Replication → Real-time Status**
4. Procure por `orders` na lista
5. Deve ter um **toggle verde ligado ✓**

Se estiver OFF, você vê o toggle cinza e desligado.

---

### 5️⃣ **Teste com 2 Abas**

**Aba 1 (Vendedor — console aberto):**
- Crie novo pedido
- Observe os logs (passo 2)
- Procure por `[ERP Realtime]` nos logs
- Deve ver: `[ERP Realtime] Mudança em orders — re-sincronizando...`

**Aba 2 (Financeiro):**
- Deixe aberta em um lado
- Veja se pedido novo aparece em tempo real
- Se não aparecer, financeiro não recebe eventos Realtime

---

### 6️⃣ **Possíveis Causas**

| Sintoma | Causa Provável | Solução |
|---------|---|---|
| ❌ `Erro ao gerar número: fn_get_next_order_number not found` | Função SQL não foi criada | Execute `update_schema_v6_simple.sql` |
| ❌ `Erro ao gerar número: permission denied` | RLS muito restritivo | Execute o SQL novamente |
| ✅ Número gerado, mas financeiro não vê | Realtime não publicado | Verifique passo 4️⃣ |
| ✅ Tudo OK no console do vendedor | Problema no financeiro | Financeiro precisa reload? |

---

### 7️⃣ **Se tudo estiver OK no Console**

Significa que:  
✅ Pedido foi criado no banco  
✅ Realtime foi acionado  

Então o problema é que **financeiro precisa de reload ou há problema na UI do financeiro**.

Teste: Reload manual da página do financeiro (F5) — pedido aparece?

---

### 📋 **Checklist Final**

- [ ] Executei `update_schema_v6_simple.sql` no Supabase
- [ ] Fiz reload da aplicação (Ctrl+F5)
- [ ] Abri console (F12) ao criar pedido
- [ ] Verifiquei logs `[OrcamentosPage]` e `[ERP]`
- [ ] Verificou Realtime Status no Supabase (toggle verde)
- [ ] Testou com 2 abas abertas

---

## ⚠️ Próximo Passo

**Me envie:**
1. ✅ Se a migração SQL rodou sem erros
2. 📸 Screenshot ou cópia dos logs do console (F12)
3. ✓ Se `orders` está com toggle verde no Realtime Status
4. ✅ Resultado do teste com 2 abas

Com essas informações vou saber exatamente o que corrigir!
