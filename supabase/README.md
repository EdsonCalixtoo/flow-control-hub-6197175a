# Supabase Migrations

Este diretório contém as migrations SQL para configurar o banco de dados Supabase.

## Migrações Disponíveis

### 001_create_users_table.sql
Cria a tabela `users` que estende a tabela `auth.users` do Supabase com informações de perfil adicionais.

**Tabela criada:**
- `public.users` - Contém dados de perfil dos usuários (email, nome, role, timestamps)

**Recursos:**
- Enable RLS (Row Level Security)
- Políticas de segurança para proteger dados de usuários
- Índices para melhor performance
- Trigger para atualizar `updated_at` automaticamente

## Como Usar

### Opção 1: Via Dashboard Supabase (Recomendado)
1. Faça login em [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para "SQL Editor"
4. Abra um novo query e copie/cole o conteúdo do arquivo 001_create_users_table.sql
5. Clique em "Run"

### Opção 2: Via Supabase CLI
```bash
supabase migration up
```

## Políticas de RLS

As políticas de segurança garantem que:

- ✅ Usuários podem ler seus próprios dados
- ✅ Usuários podem atualizar seus próprios dados
- ✅ Usuários podem inserir seu próprio perfil durante registro
- ✅ Service role pode gerenciar todos os usuários (para operações administrativas)

## Campos da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária, referencia auth.users |
| email | TEXT | Email do usuário |
| name | TEXT | Nome completo do usuário |
| role | TEXT | Papel do usuário (vendedor, financeiro, gestor, producao, admin) |
| created_at | TIMESTAMP | Data de criação do registro |
| updated_at | TIMESTAMP | Data da última atualização |

## Estrutura do Contexto de Autenticação

O `AuthContext` no frontend usa esta tabela para:

1. **Login**: Valida no Supabase Auth e busca dados completos na tabela `users`
2. **Registro**: Cria usuário em `auth.users` e insere registro em `public.users`
3. **Logout**: Encerra a sessão do Supabase Auth
4. **Fallback**: Se usuário existe em Auth mas não na tabela, usa dados padrão

## Ambiente

Certifique-se de que as variáveis de ambiente estão configuradas:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Essas variáveis são carregadas em `src/lib/supabase.ts`.
