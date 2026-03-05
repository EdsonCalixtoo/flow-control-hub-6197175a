# 🚀 Sistema de Notificações em Tempo Real - Financeiro & Produção

## 📋 Resumo

Implementamos um sistema completo de notificações em tempo real usando **Supabase Realtime** para que o financeiro E a produção sejam notificados **instantaneamente** quando:
- ✅ Vendedor envia pedido → Financeiro recebe na hora
- ✅ Financeiro aprova → Produção recebe na hora

## 🔄 Como Funciona

### 1. **Hook de Real-Time** (`useRealtimeOrders.ts`)
- Monitora mudanças na tabela `orders` do Supabase
- Detecta quando um pedido muda de status
- Dispara callbacks específicos por status

### 2. **Notificações de Som & Sistema** (RealtimeNotificationHandler.tsx)
- Toca um áudio de alerta quando chegam pedidos
- Envia notificação do sistema (push notification)
- Diferencia tipos: Financeiro vs Produção
- Funciona mesmo quando aba não está em foco

### 3. **Páginas Integradas**
- **FinanceiroDashboard.tsx** - Recebe quando chega para aprovação
- **AprovacoesPage.tsx** - Monitora em tempo real
- **ProducaoDashboard.tsx** - Recebe quando aprovado para produção  
- **PedidosProducaoPage.tsx** - Monitora em tempo real

## 🎯 Fluxo Completo - Vendedor → Financeiro → Produção

```
┌─────────────────────────────────────────────────────────────┐
│  VENDEDOR CRIA E ENVIA PEDIDO                              │
└─────────────────────────────────────────────────────────────┘
                           ↓
              Status: aguardando_financeiro
                           ↓
    ┌──────────────────────────────────────┐
    │ SUPABASE REALTIME DETECTA (< 1s)    │
    └──────────────────────────────────────┘
                           ↓
         ┌────────────────────────────────┐
         │ FINANCEIRO RECEBE:             │
         │ 🔔 Notificação visual          │
         │ 🔊 Som de alerta               │
         │ 📱 Notificação do sistema      │
         │ 🎯 Badge animada               │
         └────────────────────────────────┘
                           ↓
         ┌────────────────────────────────┐
         │ FINANCEIRO APROVA O PEDIDO     │
         └────────────────────────────────┘
                           ↓
              Status: aguardando_producao
                           ↓
    ┌──────────────────────────────────────┐
    │ SUPABASE REALTIME DETECTA (< 1s)    │
    └──────────────────────────────────────┘
                           ↓
       ┌──────────────────────────────────┐
       │ PRODUÇÃO RECEBE:                 │
       │ 🚀 Notificação "Novo Pedido"     │
       │ 🔊 Som de alerta                 │
       │ 📱 Notificação do sistema        │
       │ 🎯 Badge animada piscando        │
       └──────────────────────────────────┘
                           ↓
       ┌──────────────────────────────────┐
       │ PRODUÇÃO COMEÇA A TRABALHAR      │
       └──────────────────────────────────┘
```

## 📊 O Que Cada Papel Vê

### 👤 Financeiro
- **Dashboard**: Badge "Aguard. Aprovação" com contador
- **Notificação**: "🔔 Novo Pedido para Aprovação Financeira"
- **Dados**: Pedido número, cliente e valor
- **Som**: Alerta contínuo até interagir

### 👷 Produção  
- **Dashboard**: Badge "Aguardando" com contador
- **Notificação**: "🚀 Novo Pedido Aprovado para Produção"
- **Dados**: Tipo de pedido (Entrega/Instalação/Retirada)
- **Som**: Alerta contínuo até interagir

## 📁 Arquivos Criados/Modificados

**Novos:**
- `src/hooks/useRealtimeOrders.ts` - Hook de real-time
- `src/components/shared/RealtimeNotificationHandler.tsx` - Handler com som & notificações

**Modificados:**
- `src/pages/financeiro/FinanceiroDashboard.tsx` - Badge + Notificações
- `src/pages/financeiro/AprovacoesPage.tsx` - Monitoramento real-time
- `src/pages/producao/ProducaoDashboard.tsx` - Badge + Notificações
- `src/pages/producao/PedidosProducaoPage.tsx` - Monitoramento real-time

## 🧪 Como Testar o Fluxo Completo

### Setup Inicial
```
1. Abra 3 abas diferentes ou 3 navegadores
   Aba A: Vendedor (OrcamentosPage)
   Aba B: Financeiro (FinanceiroDashboard)
   Aba C: Produção (ProducaoDashboard)
```

### Teste 1: Vendedor → Financeiro
```
1. Em Aba A: Crie novo pedido
2. Em Aba A: Clique em "Enviar para Financeiro"
3. Vá para Aba B
4. Observe:
   ✅ Toast "Novo Pedido para Aprovação Financeira"
   ✅ Badge vermelha piscando com contador
   ✅ Som de alerta tocando
   ✅ Notificação do sistema (se permitido)
```

### Teste 2: Financeiro → Produção
```
1. Em Aba B: Clique no card "Aguard. Aprovação"
2. Em Aba B: Clique em "Aprovar" no pedido
3. Vá para Aba C
4. Observe:
   ✅ Toast "Novo Pedido Aprovado para Produção"
   ✅ Badge "Aguardando" com contador piscando
   ✅ Som de alerta diferente (ou mesmo som)
   ✅ Tipo do pedido na notificação
```

### Teste 3: Sincronização em Tempo Real
```
1. Deixe todas as 3 abas abertas
2. Crie pedido em Aba A
3. Veja a mudança em Aba B em tempo real
4. Aprove em Aba B
5. Veja a mudança em Aba C em tempo real
6. Tudo em < 1 segundo!
```

## ⚠️ Pontos Importantes

### Permissões Necessárias
1. **Notificações do Sistema**: Navegador pode pedir permissão
2. **Som**: Deve estar habilitado no navegador
3. **Supabase Realtime**: Já configurado no projeto

### Comportamento do Badge
- **Financeiro**: Mostra contador de pedidos aguardando aprovação
- **Produção**: Mostra contador de pedidos para começar
- Ambos têm animação de pulsação vermelha
- Reseta quando página é recarregada

### Compatibilidade
- ✅ Chrome/Chromium (recomendado)
- ✅ Firefox
- ✅ Safari 14+
- ✅ Edge
- ⚠️ IE → Não suportado

## 🔧 Customizações Possíveis

### Mudar Som
Em `RealtimeNotificationHandler.tsx`:
```typescript
const NOTIFICATION_SOUND_URL = 'https://novo-som-url.mp3';
```

### Mudar Mensagem de Notificação
Em `RealtimeNotificationHandler.tsx`:
```typescript
sendSystemNotification(
  `🔔 Seu Texto Aqui`,
  `Corpo da mensagem aqui`
);
```

### Adicionar mais Status para Monitorar
Em `useRealtimeOrders.ts`:
```typescript
useRealtimeOrders((event) => {
  if (event.order.status === 'novo_status') {
    // fazer algo
  }
}, ['novo_status', 'outro_status']);
```

## 📈 Performance

- **Sem Polling**: Reduz carga do servidor drasticamente
- **Latência < 1 segundo**: Supabase Realtime é rápido
- **Banda Otimizada**: Apenas mudanças são transmitidas
- **Multi-tab Safe**: Notificações funcionam em múltiplas abas

## ✅ Checklist de Funcionalidade

- ✅ Vendedor envia → Financeiro nota NA HORA
- ✅ Financeiro aprova → Produção nota NA HORA
- ✅ Notificações visuais (Toast + Badge)
- ✅ Som de alerta automático
- ✅ Notificações do sistema
- ✅ Funciona mesmo com aba minimizada
- ✅ Compilação sem erros
- ✅ Compatível com diversos navegadores

## 🐛 Troubleshooting

### Som não toca?
- Verifique volume do navegador
- Tente clicar na página primeiro (política de autoplay)
- Verifique console para erros (F12)

### Badge não aparece?
- Recarregue a página
- Verifique console para erros Supabase
- Confirme que está conectado na internet

### Notificação do sistema não aparece?
- Permita notificações do navegador
- Não está bloqueada pelas configurações do SO

### Latência > 1 segundo?
- Verifique conexão de internet
- Supabase pode estar lento (verificar status)
- Tente desativar extensões do navegador

---

**Status**: ✅ COMPLETO - Fluxo Vendedor → Financeiro → Produção
**Build**: ✅ Sem erros
**Data**: 5 de março de 2026
**Desenvolvedor**: GitHub Copilot
