# 🔍 DIAGNÓSTICO: Cliente Sumindo ao Recarregar

## 📋 Seu Problema

```
✅ Cria cliente com sucesso
✅ Cliente aparece na lista
❌ Recarrega a página (F5)
❌ Cliente desaparece
```

Consola mostra: `clients: 6` no Supabase, mas 0 na tela

---

## 🧪 TESTE DE DIAGNÓSTICO (3 MINUTOS)

### Passo 1: Recarregue e Abra Console
```
Ctrl+F5 (hard refresh)
F12 (console)
```

### Passo 2: Crie Um Cliente
1. **Vendedor → Clientes**
2. **+ Cadastrar Cliente**
3. Preencha: Nome = "TEST123", CPF = "12345678901"
4. Clique: **Cadastrar Cliente**

### Passo 3: Copie os Logs e Procure Por:

#### LOG 1: Ao Criar
```
[ClientesPage] 🆔 User ID: uuid-xxxxx
[ClientesPage] 🔐 User Role: vendedor
[ClientesPage] 📦 Novo cliente: {id: "...", name: "TEST123", createdBy: "uuid-xxxxx"}
```

✅ Se `createdBy` tem um UUID = **OK**
❌ Se `createdBy` é `undefined` ou `null` = **PROBLEMA**

#### LOG 2: Salvando no Banco
```
[supabaseService] 📝 Salvando cliente no banco: {id: "...", name: "TEST123", created_by: "uuid-xxxxx"}
[supabaseService] ✅ Cliente salvo com sucesso no banco!
```

✅ Se não há ❌ = **OK**
❌ Se mostra erro = **PROBLEMA**

### Passo 4: Recarregue (F5) e Procure Por:

#### LOG 3: Sincronizando
```
[supabaseService] 🔄 Buscando clientes do banco...
[supabaseService] ✅ Clientes recuperados do banco: {
  count: 6,
  clients: [
    {id: "...", name: "TEST123", createdBy: "uuid-xxxxx"},
    ...
  ]
}
```

✅ Se `TEST123` aparece com `createdBy` preenchido = **OK**
❌ Se `TEST123` tem `createdBy: null` = **PROBLEMA!**

#### LOG 4: Após Sincronizar
```
[ERP] Sincronizado com Supabase ✓ {
  clients: 6,
  clientDetails: [
    {id: "...", name: "TEST123", createdBy: "uuid-xxxxx"},
    ...
  ]
}
```

✅ Se `createdBy` está preenchido = **OK**
❌ Se é `null` ou `undefined` = **PROBLEMA!**

#### LOG 5: Filtrando Clientes
```
[ClientesPage] 📊 Estado dos clientes: {
  totalNoEstado: 6,
  meuClientes: 6,
  userRole: "vendedor",
  userId: "uuid-xxxxx",
  clientes: [{id: "...", name: "TEST123", createdBy: "uuid-xxxxx"}]
}
```

✅ Se `meuClientes: 6` = **TUDO FUNCIONA!**
❌ Se `meuClientes: 0` = **FILTRO ESTÁ BLOQUEANDO**

---

## 🔴 DIAGNÓSTICOS POSSÍVEIS

### PROBLEMA 1: `createdBy` Salvando como NULL

Se o LOG 2 ou LOG 3 mostra `created_by: null`:

**Causa:** `user.id` é undefined ao criar o cliente

**Solução:**
1. Verifique se está **autenticado** (avatar no header)
2. Faça: **Logout → Login**
3. Tente novamente

---

### PROBLEMA 2: Erro ao Salvar no Banco

Se LOG 2 mostra erro tipo:
```
[supabaseService] ❌ ERRO FINAL ao salvar cliente: {
  code: "42703",
  message: "column \"created_by\" does not exist"
}
```

**Causa:** Coluna `created_by` não existe na tabela

**Solução:**
Execute no Supabase SQL Editor:
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by UUID;
```

---

### PROBLEMA 3: Filtro Bloqueando Todos (meuClientes: 0)

Se LOG 5 mostra `meuClientes: 0` mas `totalNoEstado: 6`:

**Causa:** `createdBy` não bate com `user.id` ou está NULL

**Solução:**
1. Execute no Supabase:
```sql
SELECT id, name, created_by FROM clients LIMIT 5;
```
2. Compare o `created_by` com seu `user.id` (do LOG 5)
3. Se não baterem, os clientes foram criados por outro usuário

---

## 📸 ME MOSTRE

Copie e cole no chat:

1. **Três screenshots do console:**
   - LOG 1 (após criar cliente)
   - LOG 3 (após recarregar)
   - LOG 5 (estado dos clientes)

2. **Resultado desta query no Supabase:**
```sql
SELECT id, name, created_by FROM clients ORDER BY created_at DESC LIMIT 3;
```

3. **Seu user.id (do LOG 5):**
```
userId: "cole-aqui"
```

---

## ✅ Se Funcionar Agora

Parabéns! Você resolveu o problema.

Se `meuClientes` mostra 6, todos os clientes estão visíveis e o problema foi **resolvido**.

---

**Tempo:** 5 minutos de teste + análise dos logs
