# 🔍 Debug: Cliente Não Salva no Banco

## Problema Reportado
- Cliente cadastrado não aparece no banco de dados
- Aparece localmente mas não persiste
- CEP agora funciona (usamos BrasilAPI)

---

## ✅ Correções Aplicadas

### 1. **CEP com CORS Bloqueado** ✅ RESOLVIDO
- Mudamos de `viacep.com.br` para `brasilapi.com.br`
- BrasilAPI não bloqueia requisições CORS
- Timeout continua 5s

### 2. **Loading Visual no Botão** ✅ JÁ EXISTE
- Botão mostra "⚙️ Salvando..." durante cadastro
- Desabilita enquanto processa

---

## 🔧 Para Debugar Salvamento do Cliente

### Passo 1: Abra o Console (F12) e procure por:

```
[ClientesPage] 📝 Criando cliente: [seu nome]
[ClientesPage] 🆔 User ID: [ID aqui?]
[ClientesPage] 🔐 User Role: vendedor
[ClientesPage] 📦 Novo cliente: { id: ..., name: ..., createdBy: ... }
```

**Se "User ID" aparecer vazio ou "undefined"** → Problema de autenticação

---

### Passo 2: Procure por erros de Supabase

```
[Supabase] ❌ Erro ao inserir cliente: Permission denied
[Supabase] ❌ Erro ao inserir cliente: relation "clients" does not exist
[Supabase] ❌ Erro ao inserir cliente: JWT token invalid
```

**Se houver "Permission denied"** → Problema de RLS  
**Se houver "relation does not exist"** → Migrations não foram executadas

---

### Passo 3: Verifique no Supabase SQL Editor

Rode este comando para testar sua permissão:

```sql
-- Seu user ID (copie do console acima)
SELECT * FROM profiles WHERE id = 'SEU_ID_AQUI';

-- Verifique seu role
SELECT role FROM profiles WHERE id = 'SEU_ID_AQUI';

-- Verifique se pode criar cliente
INSERT INTO clients (
  name, cpf_cnpj, created_by, created_at
) VALUES (
  'Teste', '12345678901234', auth.uid(), NOW()
) RETURNING *;
```

---

## 🚨 Causas Comuns

| Erro | Causa | Solução |
|------|-------|--------|
| `Permission denied` | Seu role não é 'vendedor' | Atualize profiles table com `role = 'vendedor'` |
| `relation "clients" does not exist` | Migrations não rodaram | Execute `/supabase/migrations/001_create_schema.sql` novamente |
| `JWT token invalid` | Token expirado | Faça logout + login |
| `User ID vazio` | Não autenticado | Verifique se está logado |

---

## 🔐 Para Corrigir RLS (se for o caso)

Se o erro for "Permission denied", execute no SQL Editor:

```sql
-- 1. Verifique seu user ID
SELECT id, email FROM auth.users LIMIT 1;

-- 2. Copie o ID e execute:
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'COPIE_SEU_ID_AUTH_AQUI',
  'seu_email@gmail.com',
  'Seu Nome',
  'vendedor',
  true
)
ON CONFLICT (id) DO UPDATE SET role = 'vendedor';

-- 3. Logout + Login no app
```

---

## 📋 Checklist

- [ ] Console mostra "User ID: [algo, não vazio]"
- [ ] Console mostra "User Role: vendedor"
- [ ] Nenhum erro "Permission denied" no console
- [ ] CEP preenche automaticamente (BrasilAPI funcionando)
- [ ] Botão fica com loading "⚙️ Salvando..."
- [ ] Cliente aparece na tabela clients do Supabase

---

## 💡 Se Ainda Não Funcionar

Copie os logs do console (F12 → Console → Ctrl+A → Ctrl+C) e compartilhe aqui.
