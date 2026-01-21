# Instalação e Configuração do Tesseract Fallback

## Pré-requisitos

Este sistema requer Node.js e npm instalados.

## Instalação

### 1. Instalar Tesseract.js

```bash
cd backend
npm install tesseract.js
```

### 2. Verificar Instalação

```bash
npm list tesseract.js
```

Deves ver algo como:
```
rcm-backend@1.0.0 
└── tesseract.js@5.x.x
```

## O Que Foi Alterado

### Ficheiros Novos

1. **`backend/src/modules/invoices/services/tesseract-ocr.service.ts`**
   - Novo serviço para extração de texto via Tesseract OCR
   - **NÃO faz parsing** - só extrai texto
   - Usado como alternativa ao Google Vision OCR

### Ficheiros Modificados

2. **`backend/src/modules/invoices/services/intelligent-parser-router.service.ts`**
   - Adicionado Tesseract como fallback de OCR
   - **REMOVIDO** Vision Parser (regex-based) do fallback
   - Retorna `null` quando todos os parsers falham

3. **`backend/src/workers/invoice-processing.worker.ts`**
   - Deteta quando `router.parse()` retorna `null`
   - Diferencia erro "Gemini indisponível" de outros erros
   - Mensagem clara ao utilizador quando Gemini está down

## Fluxo de Fallback (NOVO)

```
1. 🖼️  Gemini Multimodal (imagem → dados)
   ↓ Se falhar...
   
2. 📄 Google Vision OCR (imagem → texto)
   ↓
   
3. 🤖 Gemini Text API (texto → dados)
   - 4 tentativas com delays
   ↓ Se TODOS falharem E OCR foi pobre...
   
4. 🆕 Tesseract OCR (imagem → texto alternativo)
   ↓
   
5. 🤖 Gemini Text API com texto do Tesseract
   - 2 tentativas adicionais
   ↓ Se TUDO falhar...
   
6. ❌ ERRO: "Gemini AI temporariamente indisponível"
   - Status: 'error'
   - Mensagem clara ao utilizador
   - Parsing method: 'gemini_unavailable'
```

## O Que NÃO Foi Alterado (GARANTIDO)

✅ **Sistema Principal Intacto:**
- Gemini Multimodal continua a ser a primeira opção
- Google Vision OCR + Gemini Text continua a funcionar
- Templates system mantido (mas threshold = 98% para força Gemini)
- Estrutura de dados mantida (mesma interface `ParsedInvoice`)

✅ **Compatibilidade:**
- Notificações ao utilizador funcionam normalmente
- Frontend não precisa alterações
- Database schema não alterado

## Mensagens ao Utilizador

### Sucesso (status = 'reviewing')
```
✅ Fatura Processada
Fornecedor #NumeroFatura está pronta para revisão
```

### Erro Normal (status = 'error')
```
❌ Erro ao Processar
Erro ao processar fatura #NumeroFatura
```

### Erro Gemini Indisponível (status = 'error')  
```
❌ Erro ao Processar
Erro ao processar fatura #NumeroFatura

(Mensagem no database)
"Gemini AI temporariamente indisponível. A fatura será 
re-processada automaticamente quando o serviço voltar."
```

## Testes

### Verificar que Sistema Principal Funciona
```bash
# Upload uma fatura normal
# Deve processar com method: 'gemini-multimodal' ou 'gemini'
```

### Forçar Fallback Tesseract (Simulação)
```typescript
// Temporariamente modificar OCRService para retornar texto vazio
// Worker deve tentar Tesseract e chamar Gemini novamente
```

### Verificar Erro Gemini Indisponível
```typescript
// Comentar temporariamente todas as chamadas Gemini
// Deve retornar erro com mensagem clara
```

## Logs Esperados

### Processamento Normal
```
[Router] 🖼️ Trying Gemini Multimodal first...
[Router] ✅ Multimodal success in 2500ms
[Worker] ✅ Invoice #123 processed successfully (method: gemini-multimodal)
```

### Fallback Tesseract Acionado
```
[Router] Multimodal failed, falling back to OCR flow...
[Router] Gemini attempt 1/4 failed...
[Router] Gemini attempt 2/4 failed...  
[Router] 🔄 OCR text was poor/empty, trying Tesseract OCR...
[Router] ✅ Tesseract extracted 1250 chars (confidence: 89.5%)
[Router] Retrying Gemini with Tesseract text...
[Router] ✅ Gemini succeeded with Tesseract text!
[Worker] ✅ Invoice #124 processed successfully (method: gemini)
```

### Todos Fallbacks Falharam  
```
[Router] Gemini attempt 4/4 failed...
[Router] 🔄 OCR text was poor/empty, trying Tesseract OCR...
[Router] Gemini attempt 2/2 with Tesseract text failed...
[Router] ❌ ALL parsing attempts failed (Gemini unavailable)
[Worker] ❌ Error processing invoice #125: GEMINI_UNAVAILABLE
[Worker] 🔄 Gemini temporarily unavailable - invoice will be retried
```

## Troubleshooting

### Erro: "Cannot find module 'tesseract.js'"
```bash
cd backend
npm install tesseract.js
```

### Tesseract muito lento
Esperado! Tesseract é mais lento que Google Vision (~5-10s vs 2s).
Só é usado quando Google Vision falha ou retorna texto pobre.

### Fatura continua em erro
- Verifica logs do Router
- Confirma que Gemini API está acessível
- Tesseract pode falhar em PDFs protegidos - usa Google Vision nesses casos
