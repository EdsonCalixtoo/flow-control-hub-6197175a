# 📋 Guia de Serviços com Real-Time para Flow Control Hub

## 🎯 Visão Geral

Os serviços foram criados para:
1. **Salvar tudo no banco Supabase** em tempo real
2. **Sincronizar em tempo real** entre múltiplos usuários
3. **Reutilizar código** em toda a aplicação

---

## 📁 Serviços Disponíveis

### 1️⃣ **authService.ts** - Autenticação & Usuários

**Funções principais:**
- `signup()` - Registrar novo usuário com role
- `login()` - Fazer login
- `logout()` - Fazer logout
- `getCurrentUser()` - Obter usuário atual
- `getProfileById()` - Buscar perfil por ID
- `updateProfile()` - Atualizar nome/avatar
- `getAllUsers()` - Listar todos (admin)
- `getUsersByRole()` - Listar por role
- `subscribeToProfileChanges()` - Real-time do perfil

**Exemplo:**
```typescript
// Em uma página de login
import { login } from '@/services/authService';

const handleLogin = async (email: string, password: string) => {
  try {
    const { user, profile } = await login(email, password);
    console.log('Logado como:', profile.fullName, profile.role);
    // Redirecionar para dashboard
  } catch (error) {
    console.error('Erro ao login:', error);
  }
};
```

---

### 2️⃣ **clientService.ts** - Gerenciar Clientes

**Funções principais:**
- `createClient()` - Criar novo cliente
- `getClientById()` - Obter cliente por ID
- `getMyClients()` - Listar meus clientes (vendedor)
- `getAllClients()` - Listar todos os clientes
- `updateClient()` - Atualizar cliente
- `deleteClient()` - Deletar cliente
- `searchClients()` - Buscar por nome
- `subscribeToClients()` - Real-time da lista
- `subscribeToClient()` - Real-time de um cliente

**Exemplo:**
```typescript
// Em ClientesPage.tsx (Vendedor)
import { getMyClients, createClient, subscribeToClients } from '@/services/clientService';

const [clients, setClients] = useState<Client[]>([]);
const userId = useAuth().user?.id!;

useEffect(() => {
  // Carrega clientes inicialmente
  getMyClients(userId).then(setClients);
  
  // Subscribe para mudanças em tempo real
  const subscription = subscribeToClients(userId, setClients);
  
  return () => subscription.unsubscribe();
}, [userId]);

// Criar novo cliente
const handleAddClient = async (clientData: Client) => {
  const newClient = await createClient({
    ...clientData,
    createdBy: userId,
  });
  console.log('Cliente criado:', newClient.name);
};
```

---

### 3️⃣ **quoteService.ts** - Gerenciar Orçamentos

**Funções principais:**
- `createQuote()` - Criar novo orçamento
- `getQuoteById()` - Obter orçamento por ID
- `getSellerQuotes()` - Listar meus orçamentos (vendedor)
- `getQuotesByStatus()` - Listar por status
- `getAllQuotes()` - Listar todos
- `updateQuoteStatus()` - Atualizar status
- `sendQuote()` - Enviar do rascunho
- `approveQuoteFinanceiro()` - Aprovar (financeiro)
- `rejectQuoteFinanceiro()` - Rejeitar (financeiro)
- `approveQuoteProduction()` - Aprovar para produção
- `startProduction()` - Iniciar produção
- `finishProduction()` - Finalizar produção
- `releaseProduct()` - Liberar produto
- `subscribeToQuote()` - Real-time de um orçamento
- `subscribeToQuotes()` - Real-time de todos

**Exemplo - Criar Orçamento (Vendedor):**
```typescript
// Em OrcamentosPage.tsx
import { createQuote, sendQuote, subscribeToQuote } from '@/services/quoteService';

const [quote, setQuote] = useState<Order | null>(null);

// Criar novo orçamento
const handleCreateQuote = async (
  clientId: string,
  items: QuoteItem[]
) => {
  const userId = useAuth().user?.id!;
  
  const newQuote = await createQuote(
    clientId,
    userId,
    items,
    'Orçamento para cliente',
    'Prazo: 30 dias'
  );
  
  console.log('Orçamento criado:', newQuote.number);
  setQuote(newQuote);
};

// Subscribe para mudanças em tempo real
useEffect(() => {
  if (!quote?.id) return;
  
  const subscription = subscribeToQuote(quote.id, (updatedQuote) => {
    setQuote(updatedQuote);
    console.log('Orçamento atualizado em tempo real!');
  });
  
  return () => subscription.unsubscribe();
}, [quote?.id]);

// Enviar orçamento
const handleSendQuote = async (quoteId: string) => {
  const updated = await sendQuote(quoteId, userId);
  setQuote(updated);
  toast.success('Orçamento enviado para cliente!');
};
```

**Exemplo - Aprovar Orçamento (Financeiro):**
```typescript
// Em AprovacoesPage.tsx (Financeiro)
import { getQuotesByStatus, approveQuoteFinanceiro, rejectQuoteFinanceiro } from '@/services/quoteService';

const [pendingQuotes, setPendingQuotes] = useState<Order[]>([]);
const userId = useAuth().user?.id!;

useEffect(() => {
  // Carrega orçamentos pendentes
  getQuotesByStatus('aguardando_financeiro').then(setPendingQuotes);
}, []);

const handleApprove = async (quoteId: string) => {
  const updated = await approveQuoteFinanceiro(quoteId, userId, 'Análise de crédito OK');
  console.log('Orçamento aprovado!');
  toast.success('Orçamento #' + updated.number + ' aprovado!');
};

const handleReject = async (quoteId: string, reason: string) => {
  const updated = await rejectQuoteFinanceiro(quoteId, userId, reason);
  console.log('Orçamento rejeitado:', reason);
  toast.error('Orçamento rejeitado');
};
```

---

### 4️⃣ **messageService.ts** - Chat do Orçamento

**Funções principais:**
- `sendMessage()` - Enviar mensagem
- `getQuoteMessages()` - Buscar mensagens
- `deleteMessage()` - Deletar mensagem
- `editMessage()` - Editar mensagem
- `subscribeToQuoteMessages()` - Real-time de adas novas mensagens

**Exemplo:**
```typescript
// Em OrderChat.tsx
import { sendMessage, getQuoteMessages, subscribeToQuoteMessages } from '@/services/messageService';

const [messages, setMessages] = useState<ChatMessage[]>([]);
const quoteId = '...';
const userId = useAuth().user?.id!;
const userName = useAuth().user?.user_metadata?.full_name!;

useEffect(() => {
  // Carrega mensagens existentes
  getQuoteMessages(quoteId).then(setMessages);
  
  // Subscribe para novas mensagens
  const subscription = subscribeToQuoteMessages(quoteId, (newMessage) => {
    setMessages(prev => [...prev, newMessage]);
  });
  
  return () => subscription.unsubscribe();
}, [quoteId]);

const handleSendMessage = async (text: string) => {
  const message = await sendMessage(quoteId, userId, userName, text);
  console.log('Mensagem enviada em tempo real!');
};
```

---

## 🔄 Hook useRealtimeSubscription

Para casos mais complexos, use o hook para subscrever a dados genéricos:

```typescript
import { useRealtimeSubscription, useRealtimeDocument } from '@/hooks/useRealtimeSubscription';

// Listar várias linhas com filtro e ordem
const { data: quotes, loading, error } = useRealtimeSubscription<Order>(
  {
    table: 'quotes',
    filter: { column: 'seller_id', value: userId },
    orderBy: { column: 'created_at', ascending: false },
  },
  (dbQuote) => mapQuoteFromDb(dbQuote) // função para mapear dados
);

// Obter um documento específico
const { data: quote, loading, error } = useRealtimeDocument<Order>(
  'quotes',
  quoteId,
  mapQuoteFromDb
);
```

---

## 📊 Fluxo de Dados em Tempo Real

```
Vendedor cria orçamento
         ↓
createQuote() salva no DB
         ↓
Supabase real-time dispara evento
         ↓
Financeiro vê aparecer na sua lista automaticamente ✅
         ↓
Financeiro clica "Aprovar"
         ↓
approveQuoteFinanceiro() atualiza status
         ↓
Supabase real-time dispara evento
         ↓
Vendedor vê orçamento "Aprovado" em tempo real ✅
         ↓
Gestor vê aparecer na sua fila de produção ✅
```

---

## ✅ Features Implementadas

✅ Salvamento automático no banco
✅ Sincronização em tempo real
✅ Histórico automático de status
✅ Chat integrado com real-time
✅ Tratamento de erros robusto
✅ Row Level Security (RLS) - cada um vê seus dados
✅ Índices para performance
✅ Triggers automáticos para updated_at

---

## 🚀 Próximos Passos

1. **Executar o SQL no Supabase** (migrations/001_create_schema.sql)
2. **Usar os serviços nos componentes**:
   - `VendedorDashboard.tsx` → use quoteService
   - `OrcamentosPage.tsx` → use quoteService + messageService
   - `ClientesPage.tsx` → use clientService
   - `AprovacoesPage.tsx` → use quoteService
   - `etc..`
3. **Testar real-time** abrindo o app em 2 abas e fazendo mudanças
4. **Conferir console** para logs de sincronização

---

## 💡 Dicas

- Sempre use `useEffect` com cleanup para `subscribe()`
- Os serviços retornam Promises, use `async/await`
- Dados são persistidos automaticamente no localStorage
- RLS garante que vendedor só vê seus clientes
- Erro de autenticação? Verifique token no .env
