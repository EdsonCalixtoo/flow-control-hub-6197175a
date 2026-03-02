# 💰 Fluxo de Caixa com Dados Reais

## Ativando os Dados

O dashboard de **Fluxo de Caixa** agora funciona com **dados reais** tanto dos pedidos quanto dos lançamentos financeiros. Para ver os gráficos funcionando corretamente, siga os passos abaixo:

### 1️⃣ Inserir Dados de Exemplo

Execute dois scripts SQL no Supabase para popular o banco com dados de exemplo:

#### Script 1: Produtos de Estoque
**Arquivo:** `supabase/seed_products.sql`

- Adiciona **75 produtos** em 3 categorias (Peças, Eletrônicos, Diversos)
- Cada produto com 100 unidades em estoque
- Estoque mínimo: 100 unidades

**Passos:**
1. Acesse o [Supabase SQL Editor](https://app.supabase.com)
2. Selecione seu projeto
3. Cole o conteúdo de `supabase/seed_products.sql`
4. Clique em **Execute** (ou pressione `Ctrl+Enter`)

#### Script 2: Lançamentos Financeiros
**Arquivo:** `supabase/seed_financial_entries.sql`

- Adiciona **18 receitas** de vendas (janeiro a junho)
- Adiciona **24 despesas** (folha, matéria prima, utilidades, transporte)
- Total Receitas: **R$ 108.300,00**
- Total Despesas: **R$ 23.350,00**
- Resultado Líquido: **R$ 84.950,00**

**Passos:** (mesmo processo que acima)

### 2️⃣ Criar Pedidos para Aumentar Dados

Você também pode criar pedidos normalmente na aplicação:

1. Vá em **Vendedor → Orçamentos**
2. Crie novos orçamentos com os produtos inseridos
3. Envie para o financeiro
4. Aprove no financeiro

Os pedidos aprovados com `paymentStatus: 'pago'` serão **automaticamente** contabilizados como receitas nos gráficos de Fluxo de Caixa.

### 3️⃣ Visualizar o Dashboard

Acesse **Financeiro → Fluxo de Caixa** e você verá:

✅ **Cards com valores reais:**
- Saldo Atual
- Total Entradas (Receitas)
- Total Saídas (Despesas)
- Média Mensal de Receita

✅ **Gráficos preenchidos:**
- 📈 Evolução de Entradas vs Saídas (12 meses)
- 📊 Saldo Mensal (barras)
- 📋 Breakdown Por Categoria (receitas e despesas)

✅ **DRE Simplificado:**
- Receita Bruta
- Despesas Operacionais
- Resultado Líquido

---

## 🔄 Como os Dados Funcionam

### Fontes de Dados:

1. **Lançamentos Financeiros** (`financial_entries`)
   - Receitas manuais
   - Despesas registradas

2. **Pedidos Aprovados** (`orders`)
   - Pedidos com `paymentStatus: 'pago'`
   - Contabilizados como receitas automaticamente

### Cálculos:

```
Total Receitas = 
  Receitas em financial_entries + 
  Total de pedidos com paymentStatus = 'pago'

Total Despesas = 
  Despesas em financial_entries

Saldo Atual = 
  Total Receitas - Total Despesas

Média Mensal = 
  Total Receitas / 6 (últimos 6 meses)
```

---

## 📝 Próximas Melhorias

- [ ] Criar lançamentos automaticamente quando pedido é aprovado
- [ ] Importar dados de movimentação bancária
- [ ] Gerar relatórios em PDF
- [ ] Previsão de fluxo futuro
- [ ] Comparativo com períodos anteriores

---

## ✅ Checklist de Setup

- [ ] Executar `seed_products.sql`
- [ ] Executar `seed_financial_entries.sql`
- [ ] Acessar **Financeiro → Fluxo de Caixa**
- [ ] Verificar se os gráficos mostram dados
- [ ] Criar alguns pedidos para aumentar receitas
- [ ] Aprovar pedidos no financeiro
- [ ] Confirmar que receitas aparecem no dashboard
