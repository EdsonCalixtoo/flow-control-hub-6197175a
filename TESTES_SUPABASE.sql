# 🚀 Testes Rápidos - Supabase

Cole cada bloco abaixo no Supabase SQL Editor (um de cada vez)

---

## 1️⃣ Verificar se você está autenticado e qual é seu role

```sql
-- Seu ID
SELECT auth.uid() as seu_id;

-- Seus dados
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

---

## 2️⃣ Tentar criar cliente manualmente (testa RLS)

```sql
-- Isso vai falhar se não tiver permissão
INSERT INTO clients (
  name, 
  cpf_cnpj, 
  email,
  phone,
  address,
  city,
  state,
  cep,
  created_by,
  created_at
)
VALUES (
  'Teste CEP BrasilAPI',
  '12345678901234',
  'teste@teste.com',
  '11999999999',
  'Rua Teste, 123',
  'São Paulo',
  'SP',
  '01310100',
  auth.uid(),
  NOW()
)
RETURNING *;
```

**Se retornar erro de "Permission denied"** → RLS está bloqueando

---

## 3️⃣ Se erro de Permission, corrigir role

```sql
-- Verificar seu role atual
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- Se role NÃO for 'vendedor', atualizar:
UPDATE profiles 
SET role = 'vendedor' 
WHERE id = auth.uid();

-- Confirmar
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

---

## 4️⃣ Verificar se cliente foi criado

```sql
-- Listar TODOS os clientes (sem filtro RLS)
SELECT COUNT(*) as total_clientes FROM clients;

-- Listar seus clientes
SELECT id, name, cpf_cnpj, created_by, created_at FROM clients WHERE created_by = auth.uid();
```

---

## 5️⃣ Verificar se pode deletar

```sql
-- Seu cliente (copie o ID)
SELECT id, name FROM clients WHERE created_by = auth.uid() LIMIT 1;

-- Tentar deletar (replace ID_AQUI com o ID acima)
DELETE FROM clients WHERE id = 'ID_AQUI' AND created_by = auth.uid();

-- Confirmar deletado
SELECT * FROM clients WHERE id = 'ID_AQUI';
```

---

## 🔒 Se Tudo Falhar - Desabilitar RLS Temporariamente

⚠️ **APENAS PARA DEBUG - NÃO DEIXAR PRODUÇÃO ASSIM**

```sql
-- Desabilitar RLS na tabela clients
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Agora tente criar cliente...
-- Depois reabilitar:
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Ainda com Problemas?

Execute isto e compartilhe o resultado comigo:

```sql
SELECT 
  'User ID' as info, auth.uid()::text
UNION ALL
SELECT 'Role', (SELECT role FROM profiles WHERE id = auth.uid())
UNION ALL
SELECT 'Total Clients', COUNT(*)::text FROM clients
UNION ALL
SELECT 'My Clients', COUNT(*)::text FROM clients WHERE created_by = auth.uid();
```
