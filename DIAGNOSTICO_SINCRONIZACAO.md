# 🔍 Guia de Diagnóstico: Problemas de Sincronização

## 📋 Problemas Reportados

1. **Vendedor com ID `8b828d8f-416c-45c8-8dd6-dab509d8e7a0` não carrega clientes**
2. **Erica: produtos do estoque não estão atualizados**

---

## ✅ Correções Aplicadas

### 1️⃣ **Erros Silenciosos Removidos**
- ❌ Removido `.catch(() => { })` que silenciava erros de re-sincronização
- ✅ Todos os erros agora são logados com `console.error`

### 2️⃣ **Polling de Produtos (Fallback)**
- ❌ ANTES: Apenas realtime (se conexão cair, não sincroniza)
- ✅ DEPOIS: Polling automático a cada 30s como fallback
```
[ERP Polling] 🔄 Sincronizando estoque de produtos...
[ERP Polling] ✅ Estoque sincronizado: X produtos
```

### 3️⃣ **Debug Melhorado**
- Adicionado `userEmail` aos logs
- Melhor visualização do estado do usuário

---

## 🧪 Como Diagnosticar

### Para o vendedor que não carrega clientes:

**1. Abra o navegador (F12) → Console**

**2. Procure por logs com o padrão:**
```
[ClientesPage] 📊 Estado dos clientes: {
  totalCarregados: X
  loadingGlobal: true/false
  userId: 8b828d8f-416c-45c8-8dd6-dab509d8e7a0
  userEmail: erica@example.com
```

**3. Procure por erros:**
```
[ERP] ❌ Tentativa 1/3 — ERRO ao salvar cliente: ...
[ERP Polling] ⚠️ Erro ao sincronizar estoque: ...
[Supabase] ❌ Erro ao buscar clientes: ...
```

### Para Erica (estoque não atualiza):

**1. Verifique os logs de polling:**
```
[ERP Polling] 🔄 Sincronizando estoque de produtos...
[ERP Polling] ✅ Estoque sincronizado: X produtos
```

**2. Se houver erro:**
```
[ERP Polling] ⚠️ Erro ao sincronizar estoque: Permission denied
```

**Isso significa:** RLS está bloqueando a Erica de ver produtos

---

## 🛠️ Próximos Passos se Persistir

Se o problema continuar, precisamos:

1. **Executar diagnóstico no banco:**
   - Ir para: Supabase Dashboard → SQL Editor
   - Copiar e rodar: `/supabase/DIAGNOSTICO_VENDEDOR_ID.sql`
   - Verificar se o vendedor existe e tem permissões

2. **Reconstruir tables (última opção):**
   - Se houver dados corrompidos, pode ser necessário
   - Mas vamos tentar os fixes acima primeiro

3. **Verificar RLS policies:**
   - Talvez alguns usuários não têm permissão nas políticas
   - Supabase → Authentication → Policies

---

## 📊 Checklist de Verificação

- [ ] Console mostra "Estoque sincronizado" a cada 30s
- [ ] Produtos aparecem para Erica
- [ ] Clientes carregam para vendedor específico
- [ ] Nenhum erro "Permission denied" nos logs
- [ ] Nenhum erro de "JWT" ou "Token" nos logs

---

## 💡 Se Ainda Não Funcionar

1. **Copie todos os logs de erro do console**
2. **Diga qual vendedor/papel tem problema**
3. **Rode o SQL de diagnóstico e cole os resultados**
4. **Vamos refazer estrutura apenas se necessário**
