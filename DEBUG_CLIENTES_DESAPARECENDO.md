# 🔧 DEBUG: Clientes Desaparecendo

## ✅ O Que Foi Corrigido

1. **Filtro de isolamento de dados:**
   - ❌ Antes: Vendedor via APENAS seus clientes (muito rigoroso)
   - ✅ Agora: Vendedor vê seus clientes + clientes sem proprietário

2. **Melhor logging:**
   - ✅ Mostra `user.id` e `user.role` ao criar cliente
   - ✅ Mostra dados do cliente sendo criado

---

## 🧪 TESTE AGORA

### Passo 1: Recarregar a Aplicação
```
Ctrl+F5 (hard refresh)
```

### Passo 2: Abrir Console (F12)
- Clique: **F12**
- Abra aba: **Console**

### Passo 3: Cadastrar Um Cliente
1. Vá para: **Vendedor → Clientes**
2. Clique: **+ Cadastrar Cliente**
3. Preencha:
   - Nome: "CLIENTE TESTE"
   - CPF: "12345678901"
   - Demais campos (opcionais)
4. Clique: **Cadastrar Cliente**

### Passo 4: Verificar Logs no Console

**Esperado ver:**
```
[ClientesPage] 📝 Criando cliente: CLIENTE TESTE
[ClientesPage] 🆔 User ID: uuid-xxxxx  (ou 'sistema' se não autenticado)
[ClientesPage] 🔐 User Role: vendedor
[ClientesPage] 📦 Novo cliente: {id: "uuid", name: "CLIENTE TESTE", createdBy: "uuid-xxxxx"}
[ERP] ✨ Cliente criado no state local: CLIENTE TESTE uuid-xxx
[ERP] 💾 Tentativa 1/3 — Salvando cliente no banco: CLIENTE TESTE
[ERP] ✅ Cliente salvo no banco com sucesso: CLIENTE TESTE
[ERP] ✅ Clientes re-sincronizados do banco: 4
[ClientesPage] ✅ Cliente criado: CLIENTE TESTE
```

---

## 🔍 Se o Cliente AINDA Desaparecer

### Verificar 1: No Console, procure por

```
[ClientesPage] 🆔 User ID: undefined
```

Se ver `undefined`, significa **você não está autenticado corretamente**.

**Solução:**
- Logout → Login novamente
- Tente criar cliente

---

### Verificar 2: Dados no Banco de Dados

Vá para **Supabase Dashboard** → **SQL Editor** → Rode:

```sql
-- Verificar clientes salvos
SELECT id, name, created_by, created_at FROM clients ORDER BY created_at DESC LIMIT 5;

-- Verificar se created_by está NULL
SELECT id, name, created_by FROM clients WHERE created_by IS NULL;

-- Contar clientes
SELECT COUNT(*) as total FROM clients;
```

**Esperado:**
- Clientes aparecem com `created_by` preenchido
- Nenhum cliente com `created_by = NULL`
- Contagem bate com o contador da tela

---

### Verificar 3: RLS do Banco Está Bloqueando?

Rode no Supabase SQL Editor:

```sql
-- Verificar políticas RLS na tabela clients
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'clients';
```

**Esperado:**
```
Políticas como:
- authenticated users see clients (SELECT)
- authenticated users manage clients (INSERT)
- authenticated users update clients (UPDATE)
```

---

## 📝 Se Ainda Não Funcionar

Copie e me envie:

1. **Captura de tela do console (F12)** mostrando os logs
2. **Resultado da query SQL:**
   ```sql
   SELECT id, name, created_by, created_at FROM clients ORDER BY created_at DESC LIMIT 5;
   ```
3. **Seu `user.id` (role)** — sou vendedor ou administrador?

---

## 🎯 Próximos Passos

Depois de testar:
1. ✅ Se aparecer na tela → **FUNCIONA!**
2. ✅ Se não aparecer → Me avisa os logs do console
3. ✅ Se aparecer e desaparecer ao recarregar → É problema de RLS

---

**Tempo esperado:** 2 minutos para testar
