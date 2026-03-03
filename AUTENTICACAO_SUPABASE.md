# 🔐 Guia de Implementação da Autenticação Supabase

Implementação completa de autenticação com Supabase, incluindo login e registro de usuários.

## ✅ O que foi implementado

### 1. **Contexto de Autenticação** (`src/contexts/AuthContext.tsx`)
- ✅ Gerenciamento de estado de autenticação
- ✅ Login com email/password
- ✅ Registro com email, password, nome e role
- ✅ Logout e limpeza completa de sessão
- ✅ Persistência de sessão
- ✅ Fallback se usuário exist em Auth mas não na tabela

### 2. **Cliente Supabase** (`src/lib/supabase.ts`)
- ✅ Inicialização com variáveis de ambiente
- ✅ Validação de credenciais

### 3. **Página de Login** (`src/pages/LoginPage.tsx`)
- ✅ Formulário de login
- ✅ Formulário de registro com seleção de role
- ✅ Validação de entrada
- ✅ Tratamento de erros com sugestões

### 4. **Migration do Banco de Dados** (`supabase/migrations/001_create_users_table.sql`)
- ✅ Tabela `users` com campos: id, email, name, role, created_at, updated_at
- ✅ Row Level Security (RLS) para proteção de dados
- ✅ Políticas de segurança para leitura/escrita de dados próprios
- ✅ Índices para melhor performance

## 🚀 Próximos Passos

### 1. **Executar a Migration no Supabase**

Você precisa criar a tabela `users` no Supabase executando a migration:

#### Opção A: Via Dashboard Supabase (Recomendado)
1. Vá para [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Clique em "SQL Editor" na barra lateral
4. Clique em "New Query"
5. Copie todo o conteúdo de `supabase/migrations/001_create_users_table.sql`
6. Cole na janela de query
7. Clique em "Run"
8. Verifique se a tabela foi criada em "Table Editor"

#### Opção B: Via Supabase CLI (Se tiver configurado)
```bash
cd c:\Users\Edson\Documents\ERPLOVABLE\flow-control-hub-6197175a
supabase migration up
```

### 2. **Testar a Autenticação**

#### Teste de Registro
1. Abra a aplicação: `npm run dev`
2. Clique em "Criar Conta"
3. Selecione um role (Vendedor, Financeiro, Gestor, Produção)
4. Preencha:
   - **Nome**: Seu nome completo
   - **Email**: Um email válido (pode ser seu email de teste)
   - **Senha**: Mínimo 6 caracteres
5. Clique em "Registrar"
6. Se bem-sucedido, você será automaticamente logado

#### Teste de Login
1. Faça logout (menu > Sair)
2. Na página de login, clique em "Já tenho uma conta"
3. Preencha as credenciais que registrou
4. Clique em "Login"
5. Se bem-sucedido, você será redirecionado para o dashboard

### 3. **Verificar no Supabase Dashboard**

Após registrar um usuário, você deve ver:

1. **Em Auth > Users**:
   - Um novo usuário com o email que registrou
   - Status de confirmação (pode estar pendente se email não foi verificado)

2. **Em Table Editor > users**:
   - Um novo registro com: id, email, name, role

### 4. **Ajustes Opcionais**

#### Desabilitar Email Verification (Para Desenvolvimento)
Se quiser fazer login sem verificar email:

1. Vá para Settings > Auth
2. Em "Email Verification", desative "Enable email confirmations"
3. Salve

#### Configurar Email Provider (Para Produção)
Para enviar emails de verificação em produção, vá para:

1. Settings > Auth > Email Templates
2. Configure seu email sender

## 🔧 Estrutura de Dados

### Interface User
```typescript
interface User {
  id: string;           // UUID do usuário
  email: string;        // Email único
  name: string;         // Nome completo
  role: 'vendedor' | 'gestor' | 'financeiro' | 'producao' | 'admin';
}
```

### Tabela Supabase: `public.users`
```sql
id              UUID PRIMARY KEY
email           TEXT NOT NULL
name            TEXT NOT NULL
role            TEXT NOT NULL DEFAULT 'vendedor'
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

## 🛡️ Segurança

### Row Level Security (RLS)
- ✅ Usuários podem ler apenas seus próprios dados
- ✅ Usuários podem atualizar apenas seus próprios dados
- ✅ Service role pode gerenciar dados (para operações administrativas)

### Validação no Supabase
- ✅ Email único na tabela auth.users
- ✅ Password criptografada pelo Supabase
- ✅ Token de sessão seguro (gerenciado automaticamente)

## 📱 Como Usar no Código

### Importar useAuth
```tsx
import { useAuth } from '@/contexts/AuthContext';
```

### No Componente
```tsx
const { user, isAuthenticated, login, register, logout } = useAuth();

// Verificar se está autenticado
if (!isAuthenticated) {
  return <p>Faça login para continuar</p>;
}

// Usar dados do usuário
console.log(user?.name);        // 'João Silva'
console.log(user?.role);        // 'vendedor'
console.log(user?.email);       // 'joao@example.com'

// Fazer login
await login('joao@example.com', 'senha123');

// Registrar novo usuário
await register('novo@example.com', 'senha123', 'Novo Usuário', 'vendedor');

// Fazer logout
await logout();
```

## ⚠️ Tratamento de Erros

O AuthContext loga todos os eventos com prefixo `[Auth]`:

```
[Auth] ✅ Login bem-sucedido
[Auth] ❌ Erro ao fazer login: Invalid login credentials
[Auth] 📝 Registrando novo usuário: joao@example.com
[Auth] ✅ Usuário criado em Auth: abc123
[Auth] ✅ Usuário inserido na tabela
```

Abra o Console do Navegador (F12) para ver os logs.

## 🔄 Fluxo de Autenticação

### Registro
```
Usuário preenche dados
    ↓
supabase.auth.signUp() → Cria em auth.users
    ↓
INSERT em public.users → Salva perfil
    ↓
supabase.auth.signIn() → Login automático
    ↓
Estado atualizado → Redireciona para dashboard
```

### Login
```
Usuário entra credenciais
    ↓
supabase.auth.signInWithPassword()
    ↓
SELECT de public.users → Obtém dados completos
    ↓
Estado atualizado com User completo
    ↓
Redireciona para dashboard
```

## 📝 Variáveis de Ambiente

Certifique-se de que o arquivo `.env` tem:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

## 🧪 Verificação Final

Execute os seguintes testes:

- [ ] Construir o projeto sem erros: `npm run build`
- [ ] Executar em desenvolvimento: `npm run dev`
- [ ] Testar registro de novo usuário
- [ ] Testar login
- [ ] Testar logout
- [ ] Verificar dados no Dashboard Supabase
- [ ] Testar persistência (recarregar página mantém login)
- [ ] Testar fallback (usuário em Auth mas não na tabela)

## 📚 Referências

- [Documentação Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## ❓ Dúvidas Comuns

### P: Posso usar diferentes roles para diferentes usuários?
**R:** Sim! Na hora do registro, o usuário seleciona seu role (vendedor, financeiro, gestor, produção, admin). Você pode verificar o role com `user?.role` e renderizar diferentes interfaces.

### P: Como proteger rotas que precisam de autenticação?
**R:** Verifique `isAuthenticated` antes de renderizar:
```tsx
if (!isAuthenticated) return <Navigate to="/login" />;
```

### P: Posso permitir login social (Google, GitHub)?
**R:** Sim! Supabase suporta. Veja docs de OAuth em https://supabase.com/docs/guides/auth

### P: Como resetar a senha?
**R:** Implemente usando `supabase.auth.resetPasswordForEmail()`. Adicionar em futura versão.

