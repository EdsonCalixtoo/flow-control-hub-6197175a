# 📱 Guia de Troubleshooting - Leitura de Código de Barras

## ⚡ Problema: Leitor não funciona

### 1️⃣ **Verificar o Método de Leitura**

O sistema suporta **3 métodos**:
- 📷 **Câmera**: Detecção automática via câmera (Chrome/Edge/Safari 14+)
- 🎙️ **Leitor USB**: Scanner conectado ao computador
- ⌨️ **Digitação**: Digitar manualmente o número do pedido

---

## 🔧 Se a Câmera Não Funciona

### ❌ "Câmera não suportada"
- **Solução**: Use leitor USB ou digite manualmente
- **Compatibilidade**: Chrome 90+, Edge 90+, Safari 14+

### ❌ "Permissão de câmera negada"
**Windows/Chrome:**
1. Clique na candeia 🔒 na barra de endereço
2. Vá em **Câmera**
3. Selecione **Permita**
4. Recarregue a página

**Firefox:**
1. Vá em ≡ Menu > **Configurações**
2. **Privacidade e Segurança** > `Camera`
3. Encontre o site e altere para **Permitir**

### ❌ "Câmera em uso"
- Feche outras abas/aplicativos usando câmera
- Reinicie o navegador

---

## 🎙️ Leitor USB Não Funciona

### ✅ Como Configurar (Recomendado)

Um bom leitor USB deve:
1. **Simular teclado** (não precisa de drivers)
2. Adicionar Enter automaticamente após cada leitura
3. Ler códigos CODE128, CODE39 ou UPC

### ❌ "Nada acontece ao escanear"

**Passo 1: Verificar Conexão**
- Reconecte o cabo USB
- Teste em outra porta USB
- Procure LED aceso no leitor

**Passo 2: Testar em Campo de Texto**
- Abra Notepad/Word
- Escaneie um código
- Veja se aparece texto

**Passo 3: Se Não Aparecer Nada**
- O leitor pode estar em modo **COM** (serial) em vez de **Teclado**
- Procure um botão de modo no leitor
- Consulte manual do fabricante

**Passo 4: Configuração do Leitor**
Alguns leitores têm configuração via código de barras:
- Procure no manual por "Keyboard Mode" ou "Teclado"
- Escaneie o código de configuração

---

## ⌨️ Digitar Manualmente

### Como Funciona
1. Abra a tela de **Leitura de Código de Barras**
2. No campo de entrada, **digite o número do pedido**
3. Pressione **Enter** ou clique em **Validar**

**Formato aceito**: `PED-001`, `001`, número do pedido

---

## 🔍 Problema: Código não encontrado

**"❌ Código não encontrado"**

Possíveis causas:
1. ❌ Número do pedido está **errado**
2. ❌ Código não corresponde ao **número do pedido**
3. ❌ Pedido ainda não foi **criado** no sistema

**Solução:**
- Verifique o número impresso no código
- Procure o pedido correspondente no sistema
- Confirme que é do tipo "Produção"

---

## ⚠️ Problema: Pedido em status inválido

**"⚠️ Pedido ainda não finalizou a produção"**

O sistema só libera produtos em um status específico:
- ✅ Status deve ser: `producao_finalizada`
- ❌ Não pode ser: `em_producao`, `aguardando_producao`, etc.

**O que fazer:**
1. Finalize a produção do pedido
2. Aguarde a tela de "Guia de Produção"
3. Depois escaneie para liberar

---

## 📋 Formatos de Código de Barras Suportados

| Formato | Uso |
|---------|-----|
| **CODE128** | Mais comum para pedidos |
| **CODE39** | Antigos sistemas |
| **UPC/EAN13** | Códigos de produto |
| **QR Code** | Códigos 2D (recentes) |

---

## 🛠️ Teste Rápido

### Validar Leitor USB
```
1. Abra Notepad
2. Clique no texto
3. Aperte o botão de leitura do leitor
4. Você deve ver: números/caracteres aparecerem
```

Sim? ✅ Leitor está OK → Use o campo de entrada da app
Não? ❌ Leitor com problema → Teste em outro PC ou consulte fabricante

---

## 📞 Ainda Não Funciona?

**Colete estas informações:**
- Navegador e versão (Chrome? Firefox? Safari?)
- Tipo de leitor (marca/modelo)
- Mensagem de erro exata
- Screenshot da tela problemática

Envie para o time de suporte! 📧

---

## 🎯 Checklist Final

- [ ] Câmera funcionando? Ou usar leitor USB?
- [ ] Campo de entrada recebe texto?
- [ ] Número do pedido está correto?
- [ ] Pedido finalizou a produção?
- [ ] Navegador é Chrome/Edge/Safari 14+?

Se tudo ok → Escaneie novamente! 📱✅
