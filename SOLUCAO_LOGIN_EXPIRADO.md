# 🔧 Solução: Login Expirado / Pedidos Não Carregam

## 🔴 Problema
```
❌ "Invalid Refresh Token: Refresh Token Not Found"
❌ Pedidos não aparecem em produção
❌ Status: 400 ao carregar dados
```

## ✅ Solução Rápida (Recomendado)

### Método 1: Botão de Limpar Sessão (Novo!)

1. **Acesse a página de login**
   ```
   http://localhost:5173/login
   ```

2. **Se vir mensagem de "Token de sessão expirado":**
   - Clique no botão **"Limpar sessão e fazer login novamente"**
   - Confirme ao clicar OK
   - Página recarregará automaticamente

3. **Faça login normalmente**
   - Email e senha
   - Tudo deve funcionar agora!

---

## 🛠️ Método 2: Manual via Console do Navegador

Se o botão não aparecer, faça manualmente:

### Windows/Chrome:
1. Pressione **F12** ou **Ctrl+Shift+I**
2. Vá em **Console** (aba no topo)
3. Cole este código:
```javascript
// Limpar localStorage
localStorage.clear();

// Limpar sessionStorage
sessionStorage.clear();

// Limpar IndexedDB
if (indexedDB) {
  const dbs = ['supabase'];
  dbs.forEach(db => {
    try {
      indexedDB.deleteDatabase(db);
      console.log('✓ Limpou:', db);
    } catch(e) { console.warn('✗ Erro:', e); }
  });
}

// Recarregar página
console.log('✓ Sessão limpa! Recarregando...');
setTimeout(() => location.href = '/', 500);
```

4. Pressione **Enter**
5. Aguarde a página recarregar
6. Faça login novamente

### Firefox:
- Mesmas teclas **F12 ou Ctrl+Shift+I**
- Cole o código na **Console**
- Pressione **Enter**

### Safari:
1. Menu: **Safari** > **Preferências**
2. Aba: **Avançado** > Marque "Desenvolvedores"
3. Menu: **Desenvolvi** > **Console Web** (ou **Cmd+Option+I**)
4. Cole o código e pressione **Enter**

---

## 🧹 Método 3: Limpar Cache do Navegador

Se os métodos anteriores não funcionarem:

### Chrome/Edge:
1. **Ctrl+Shift+Delete** (abre limpeza de cache)
2. Selecione:
   - ✅ **Cookies e dados de site**
   - ✅ **Ficheiros em cache**
   - ✅ **LocalStorage**
3. **Intervalo:** Selecione "Todas as horas"
4. Clique **Limpar dados**
5. Recarregue a página: **Ctrl+F5**

### Firefox:
1. **Ctrl+Shift+Delete** (abre histórico)
2. Selecione:
   - ✅ **Cookies**
   - ✅ **Cache**
   - ✅ **Sessões ativas**
3. Clique **Limpar agora**
4. Recarregue: **Ctrl+Shift+R**

### Safari:
1. Menu: **Safari** > **Limpar Histórico**
2. Intervalo: **Todas as horas**
3. Clique **Limpar Histórico**
4. Recarregue: **Cmd+Shift+R**

---

## 🔍 Como Verificar se Funcionou

### ✅ Tudo OK se:
- Login aceita suas credenciais
- Pedidos aparecem na tela de produção
- Sem mensagens de erro vermelhas
- Dados carregam rapidamente

### ❌ Ainda com erro? Tente:

1. **Verifique Internet:**
   ```bash
   ping 8.8.8.8
   ```

2. **Teste em navegador diferente:**
   - Chrome? Tente Firefox
   - Firefox? Tente Edge

3. **Use navegador privado/incógnito:**
   - **Ctrl+Shift+P** (Chrome/Edge)
   - **Ctrl+Shift+P** (Firefox)
   - **Cmd+Shift+N** (Safari)
   - Faça login ali e veja se funciona

---

## 📱 Problema Persiste?

### Coleta de Informações:
1. Tire screenshot da mensagem de erro
2. Abra **DevTools (F12)** > **Network**
3. Tente fazer login novamente
4. Procure por requisição em vermelho (erro)
5. Clique nela e vá na aba **Response**
6. Screenshot da resposta de erro

### Envie para Suporte:
- Email: seu@email.com
- Incluir:
  - Navegador e versão
  - Screenshots do erro
  - O que tentou fazer
  - Histórico do console (DevTools > Console)

---

## 🎯 Checklist Final

Antes de assumir que "está quebrado":

- [ ] Tentou limpar sessão via botão?
- [ ] Tentou via console (F12)?
- [ ] Limpou cache do navegador?
- [ ] Usando navegador atualizado (Chrome/Edge/Safari 14+)?
- [ ] Testou em outro navegador?
- [ ] Testou em navegação privada/incógnito?
- [ ] Sua internet está funcionando?

**Se tudo acima foi feito e ainda não funciona** → Contacte o suporte técnico com as informações coletadas.

---

**Última atualização:** 26 de fevereiro de 2026

## 🚀 Próximos Passos

Após fazer login com sucesso:
1. Vá em **Produção** > **Pedidos**
2. Verifique os pedidos
3. Se ainda não aparecer → Ver [TROUBLESHOOTING_PEDIDOS.md](./TROUBLESHOOTING_PEDIDOS.md)
