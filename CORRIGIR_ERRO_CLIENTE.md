# 🔧 Corrigindo Erro ao Cadastrar Cliente

## ❌ Erro Encontrado
```
"Could not find the table 'public.clients' in the schema cache"
Failed to load resource: the server responded with a status of 404
```

---

## 📋 Causa Raiz

A tabela `clients` **não existe** no Supabase, ou as **migrations não foram executadas**.

---

## ✅ Solução em 3 Passos

### **Passo 1: Acessar Supabase SQL Editor**

1. Vá para: https://app.supabase.com
2. Selecione seu projeto
3. No menu esquerdo: **SQL Editor**

---

### **Passo 2: Copiar e Executar as Migrations**

1. Abra o arquivo `supabase/migrations/001_create_schema.sql`
2. **Copie TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (botão azul)

**Se tiver erro tipo "already exists"** → É normal, significa que parte das tables já existem. O Supabase cria com `IF NOT EXISTS`.

---

### **Passo 3: Verificar Permissões do Usuário**

O usuário logado **PRECISA** ter o papel **"vendedor"** na tabela `profiles`.

1. No Supabase → **Authentication** → **Users**
2. Encontre seu usuário (procure por email)
3. Vá em **SQL Editor** e rode:

```sql
SELECT id, email, role, is_active FROM profiles WHERE email = 'seu_email@aqui.com';
```

**Se não aparecer nada** → Execute:

```sql
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  '<COPIE_O_ID_DO_USER_AUTH_AQUI>',
  'seu_email@aqui.com',
  'Seu Nome',
  'vendedor',
  true
);
```

Para pegar o ID do user, use:
```sql
SELECT id, email FROM auth.users WHERE email = 'seu_email@aqui.com';
```

---

### **Passo 4: Testar se Funcionou**

1. Volte para o app
2. Faça **logout** (F5 no navegador também)
3. Faça **login** novamente
4. Tente cadastrar um cliente

---

## 🐛 Se Ainda Não Funcionar

### **Verificar RLS Policies**

No SQL Editor, rode:

```sql
-- Listar todas as policies da tabela clients
SELECT * FROM pg_policies WHERE tablename = 'clients';

-- Verificar se o user pode fazer INSERT
SELECT * FROM policy_details WHERE table_name = 'clients' AND operation = 'INSERT';
```

### **Verificar Tabela de Clientes**

```sql
-- Confirmar que a tabela existe
SELECT * FROM information_schema.tables WHERE table_name = 'clients';

-- Ver estrutura
DESC clients;
```

### **Teste Manual de INSERT**

```sql
-- Tente criar um cliente manualmente (com IDs reais)
INSERT INTO clients (
  name, 
  cpf_cnpj, 
  phone, 
  email, 
  address,
  city,
  state,
  cep,
  created_by,
  created_at
)
VALUES (
  'Teste',
  '12345678901234',
  '11999999999',
  'teste@teste.com',
  'Rua Teste, 123',
  'São Paulo',
  'SP',
  '01310100',
  '<ID_DO_SEU_USER_AQUI>',
  NOW()
);
```

Se falhar com erro de permission → **Problema é RLS**

---

## 🚀 Solução Rápida (Última Opção)

Se nada funcionar, desabilite temporariamente RLS para debug:

```sql
-- ⚠️ APENAS PARA DEBUG - DEPOIS REABILITE!
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Teste se consegue salvar...

-- Depois, reabilite:
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

---

## ✨ Checklist Final

- [ ] Migrations foram executadas no Supabase
- [ ] Usuário tem papel "vendedor" na tabela profiles
- [ ] Usuario aparece no SQL: `SELECT * FROM profiles WHERE email = 'seu_email'`
- [ ] RLS policies estão ativas
- [ ] Logout e login feito
- [ ] CEP preenchido automaticamente (agora com timeout de 5s)
- [ ] Cliente salvo com sucesso

---

## 💬 Próximas Melhorias

✅ **Já implementado:**
- Timeout de 5s para viacep (não travava mais)
- Removida duplicação de timeouts (14s + 12s)
- Usuário pode salvar mesmo se viacep falhar

📝 **Se não funcionar ainda:**
- Compartilhe os logs do console (F12)
- Rode os comandos SQL acima e compartilhe resultados
