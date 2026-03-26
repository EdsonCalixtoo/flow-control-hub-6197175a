# 🎯 Instruções Rápidas: Cadastro de Clientes

## 1️⃣ Executar a Migration

Você PRECISA executar a migration para criar a tabela de clientes no Supabase:

### Via Supabase Dashboard (Recomendado):
1. Abra [app.supabase.com](https://app.supabase.com) → Seu Projeto
2. Clique em **SQL Editor** (lado esquerdo)
3. Clique em **New Query**
4. Abra o arquivo `supabase/migrations/002_create_clients_table.sql` e copie TODO o conteúdo
5. Cole na janela do Supabase
6. Clique em **Run**

### ✅ Como verificar se funcionou:
- Vá para **Table Editor** (lado esquerdo)
- Você deve ver uma tabela chamada `clients`
- Clique nela e veja os campos: id, user_id, name, cpf_cnpj, phone, email, address, etc.

## 2️⃣ Testar no App

```bash
npm run dev
```

1. Faça login
2. Vá em **Vendedor** → **Clientes**
3. Clique em **Novo Cliente**
4. Preencha os dados e clique em **Salvar**
5. ✅ Cliente deve aparecer na lista
6. Abra Supabase Dashboard → Table Editor → `clients` → Deve estar lá

## 3️⃣ Pronto!

Agora você pode:
- ✅ Criar clientes (salvos no Supabase)
- ✅ Editar clientes
- ✅ Deletar clientes
- ✅ Buscar clientes por nome/email
- ✅ Ver clientes ao fazer login novamente

## ⚠️ Importante

Se a migration não funcionar, verifique:
1. Está logado no Supabase com a conta correta?
2. Copiou TODO o conteúdo do arquivo SQL?
3. Não modificou nada do SQL?

Se ainda não funcionar, veja o arquivo **CADASTRO_CLIENTES_SUPABASE.md** para troubleshooting completo.

