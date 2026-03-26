# 📝 Guia de Cadastro de Clientes no Supabase

Agora você pode cadastrar, editar e deletar clientes diretamente no banco de dados Supabase!

## 🔧 O que foi implementado

### 1. **Tabela de Clientes** (`supabase/migrations/002_create_clients_table.sql`)
- Tabela `public.clients` com campos:
  - `id` - UUID único
  - `user_id` - Referência ao usuário (vendedor)
  - `name` - Nome do cliente
  - `cpf_cnpj` - CPF ou CNPJ
  - `phone` - Telefone
  - `email` - Email
  - `address` - Endereço
  - `bairro` - Bairro
  - `city` - Cidade
  - `state` - Estado
  - `cep` - CEP
  - `notes` - Observações
  - `consignado` - Se é consignado
  - `created_at`, `updated_at` - Timestamps

### 2. **Serviço de Clientes** (`src/lib/clientServiceSupabase.ts`)
Funções disponíveis:
- ✅ `fetchClients()` - Buscar todos os clientes do usuário
- ✅ `createClient()` - Criar novo cliente
- ✅ `updateClient()` - Atualizar cliente
- ✅ `deleteClient()` - Deletar cliente
- ✅ `getClientById()` - Buscar cliente por ID
- ✅ `searchClientsByName()` - Buscar por nome
- ✅ `searchClientsByEmail()` - Buscar por email
- ✅ `syncClientsToSupabase()` - Migrar clientes locais

### 3. **Integração com ERPContext**
O contexto foi atualizado para:
- ✅ Carregar clientes do Supabase ao fazer login
- ✅ Salvar novos clientes no Supabase
- ✅ Atualizar clientes no Supabase
- ✅ Deletar clientes do Supabase
- ✅ Fallback para localStorage se Supabase falhar

## 🚀 Próximos Passos

### 1️⃣ Executar a Migration

Você precisa criar a tabela `clients` no Supabase:

**Via Dashboard Supabase:**
1. Vá para [app.supabase.com](https://app.supabase.com)
2. Selecione seu projeto
3. Clique em "SQL Editor"
4. Clique em "New Query"
5. Copie todo o conteúdo de `supabase/migrations/002_create_clients_table.sql`
6. Cole na janela de query
7. Clique em "Run"

### 2️⃣ Testar o Cadastro de Clientes

1. Abra a aplicação: `npm run dev`
2. Faça login (se não estiver logado)
3. Vá para a página de "Clientes" (Vendedor)
4. Clique em "Novo Cliente"
5. Preencha os dados:
   - Nome
   - CPF/CNPJ
   - Telefone
   - Email
   - Endereço
   - Bairro
   - Cidade
   - Estado
   - CEP
   - Observações
6. Clique em "Salvar"
7. Verifique se o cliente aparece na lista

### 3️⃣ Verificar no Supabase Dashboard

Após criar um cliente:
1. Vá para "Table Editor"
2. Selecione a tabela "clients"
3. Você deve ver o novo cliente com:
   - `id`: UUID único
   - `user_id`: Seu ID de usuário
   - `name`: Nome do cliente
   - Outros dados que você preencheu

## 📝 Como Usar no Código

### Usar o Hook ERPContext

```tsx
import { useERP } from '@/contexts/ERPContext';

const MyComponent = () => {
  const { clients, addClient, editClient, deleteClient } = useERP();

  // Adicionar cliente
  const handleAddClient = async () => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name: 'João Silva',
      cpfCnpj: '12345678901234',
      phone: '(11) 99999-9999',
      email: 'joao@example.com',
      address: 'Rua A, 123',
      city: 'São Paulo',
      state: 'SP',
      cep: '01234-567',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    
    try {
      await addClient(newClient);
      console.log('Cliente criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
    }
  };

  // Atualizar cliente
  const handleUpdateClient = async (client: Client) => {
    try {
      const updated = {
        ...client,
        phone: '(11) 88888-8888',
      };
      await editClient(updated);
      console.log('Cliente atualizado!');
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  };

  // Deletar cliente
  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient(clientId);
      console.log('Cliente deletado!');
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  return (
    <div>
      <button onClick={handleAddClient}>Novo Cliente</button>
      <ul>
        {clients.map(client => (
          <li key={client.id}>
            {client.name}
            <button onClick={() => handleUpdateClient(client)}>Editar</button>
            <button onClick={() => handleDeleteClient(client.id)}>Deletar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### Usar o Serviço Direto

```tsx
import { 
  fetchClients, 
  createClient, 
  updateClient, 
  deleteClient,
  searchClientsByName,
  searchClientsByEmail 
} from '@/lib/clientServiceSupabase';

// Buscar todos
const clients = await fetchClients();

// Criar
const newClient = await createClient({
  name: 'Maria Santos',
  cpfCnpj: '98765432109876',
  phone: '(11) 91234-5678',
  email: 'maria@example.com',
  address: 'Avenida B, 456',
  city: 'Rio de Janeiro',
  state: 'RJ',
  cep: '20000-000',
  notes: '',
  consignado: false,
});

// Buscar por nome
const results = await searchClientsByName('João');

// Buscar por email
const emailResults = await searchClientsByEmail('joao');
```

## 🔒 Segurança

### Row Level Security (RLS)
- ✅ Cada usuário só pode ver seus próprios clientes
- ✅ Cada usuário só pode editar seus próprios clientes
- ✅ Cada usuário só pode deletar seus próprios clientes
- ✅ Service role pode gerenciar clientes (para operações administrativas)

### Validação
- ✅ Email único por tabela (pode ter emails iguais de usuários diferentes)
- ✅ CPF/CNPJ armazenado como texto (validação no frontend)
- ✅ Timestamps automáticos para auditoria

## 📊 Fluxo de Sincronização

```
Criar Cliente Localmente (Form)
    ↓
ERPContext.addClient()
    ↓
clientServiceSupabase.createClient()
    ↓
supabase.from('clients').insert()
    ↓
Retorna novo cliente com ID gerado
    ↓
Atualiza estado local com novo cliente
    ↓
UI atualiza automaticamente
```

## ⚠️ Tratamento de Erros

Se o Supabase estiver indisponível, o sistema:
1. Tenta salvar no Supabase
2. Se falhar, salva no localStorage como fallback
3. Registra o erro no console com prefixo `[Clients]` ou `[ERP]`
4. Continua funcionando localmente

Verifique o console do navegador (F12) para ver os logs.

## 🧪 Verificação Final

Execute estes testes:

- [ ] Build sem erros: `npm run build`
- [ ] App roda em dev: `npm run dev`
- [ ] Criar novo cliente
- [ ] Verificar cliente no Supabase Dashboard
- [ ] Editar cliente e verificar em tempo real
- [ ] Deletar cliente
- [ ] Recarregar página e verificar se clientes persistem
- [ ] Fazer logout e login novamente, verificar se clientes carregam
- [ ] Tentar desconectar internet e criar cliente (fallback localStorage)

## 🔄 Migrar Clientes Locais para Supabase

Se você tiver clientes no localStorage que quer migrar:

```tsx
import { syncClientsToSupabase } from '@/lib/clientServiceSupabase';

// No seu componente ou durante o onboarding:
const localClients = localStorage.getItem('erp_clients');
if (localClients) {
  const parsed = JSON.parse(localClients);
  const { synced, failed } = await syncClientsToSupabase(parsed);
  console.log(`Sincronizados: ${synced}, Falhas: ${failed}`);
}
```

## 📱 Campos do Cliente

```typescript
interface Client {
  id: string;                    // UUID gerado pelo Supabase
  name: string;                  // Nome do cliente
  cpfCnpj: string;              // CPF ou CNPJ
  phone: string;                 // Telefone com formato livre
  email: string;                 // Email
  address: string;               // Endereço completo
  bairro?: string;              // Bairro (opcional)
  city: string;                  // Cidade
  state: string;                 // Estado (ex: SP, RJ)
  cep: string;                   // CEP
  notes: string;                 // Observações/Notas
  consignado?: boolean;         // Se é cliente consignado
  createdBy?: string;           // ID do usuário que criou
  createdAt: string;            // Data ISO da criação
}
```

## ❓ Dúvidas

**P: Posso compartilhar clientes com outros vendedores?**
R: No modelo atual, cada cliente pertence a um vendedor. Para compartilhamento, seria necessário estender a tabela com permissões ou criar uma tabela de acesso.

**P: Como filtrar clientes por status?**
R: Você pode adicionar um campo `status` na tabela e filtrar via:
```tsx
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'ativo');
```

**P: Como paginação de clientes?**
R: Use `.range()` do Supabase:
```tsx
const pageSize = 10;
const { data } = await supabase
  .from('clients')
  .select('*')
  .eq('user_id', userId)
  .range(0, pageSize - 1);
```

