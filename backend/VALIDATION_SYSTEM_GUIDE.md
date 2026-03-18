# Sistema de Validação de Templates - Guia de Uso

## ✅ O Que Foi Implementado (Fase 1)

### 1. InvoiceValidationService
**Ficheiro:** `invoice-validation.service.ts`

Validações multi-camada:
- **Formato:** Descrições, preços, quantidades
- **Matemática:** Subtotal + IVA = Total, soma de linhas
- **Regras de negócio:** Taxas IVA válidas, valores razoáveis

### 2. Integração no Router
**Ficheiro:** `intelligent-parser-router.service.ts`

- ✅ Threshold baixado de 98% para 95%
- ✅ Feature flag: `ENABLE_STRICT_VALIDATION`
- ✅ Validação rigorosa ativa por padrão
- ✅ Backward compatible (não quebra nada)

---

## 🎛️ Feature Flag: Como Controlar

### Ativar Validação Rigorosa (DEFAULT)
```bash
# .env
# (não configurar nada, está ativo por padrão)
```

### Desativar Se Houver Problemas
```bash
# .env
ENABLE_STRICT_VALIDATION=false
```

**Quando desativar?**
- Se muitas faturas válidas forem rejeitadas
- Para debug temporário
- Durante rollback de emergência

---

## 🔍 O Que Muda Para o Utilizador

### ✅ Cenário 1: Fatura FICA IGUAL (99% dos casos)
```
Fatura tem:
  - Descrições válidas: "ALCATRA", "BIFE PERU"
  - Preços corretos: 8.99€
  - Matemática OK: 137.05 + 8.22 = 145.27

RESULTADO: ✅ Processa normalmente (zero diferença)
```

### ❌ Cenário 2: Fatura REJEITADA (protecção)
```
Fatura tem:
  - Descrições: "Inf", "Inf", "Inf"  ❌
  - Matemática: 150.00 + 8.22 ≠ 145.27  ❌

RESULTADO: ❌ ERROR + RETRY
Mensagem: "Validation failed"
```

Antes: Aceitava lixo  
Agora: Rejeita e pede re-processamento

---

## 📊 Validações Implementadas

### LAYER 1: Formato de Linha (Line Item Validation)

| Check | Regra | Exemplo Erro |
|-------|-------|--------------|
| Descrição mínima | >= 3 caracteres | `"Inf"` ❌ |
| Não telefone | Não /^\d{9}$/ | `"259332401"` ❌ |
| Não endereço | Não "praias", "Devolusão" | `"accesses teletônicos..."` ❌ |
| Preço válido | > 0, < 100.000€ | `0.00€` ❌ |
| Quantidade razoável | > 0, < 10.000 | `0` ou `99999` ❌ |
| Total bate | Qtd × Preço = Total | `5 × 10€ ≠ 60€` ❌ |

### LAYER 2: Matemática Global

| Check | Regra | Tolerância |
|-------|-------|------------|
| Soma linhas = Subtotal | ∑(Qtd × Preço) = Subtotal | ±0.50€ |
| Subtotal + IVA = Total | Subtotal + IVA = Total | ±0.02€ |
| Total > linha máxima | Total >= max(linhas) | - |
| Taxa IVA válida | 0%, 6%, 13%, 23% | ±1% |
| Total positivo | Total > 0 | - |

---

## 🚨 Tipos de Erro Que Agora São Bloqueados

### 1. Descrições Inválidas
```typescript
❌ ANTES: Aceitava
  Line 1: "Inf"
  Line 2: "Tel"
  Line 3: "259 332 401"

✅ AGORA: Rejeita
  Error: "Line 1: Description too short"
  Error: "Line 3: Description is phone number"
```

### 2. Matemática Errada
```typescript
❌ ANTES: Aceitava
  Subtotal: 137.05€
  IVA: 8.22€
  Total: 999.99€  // Obviamente errado!

✅ AGORA: Rejeita
  Error: "Subtotal + IVA = 145.27€ but total is 999.99€"
```

### 3. Preços Absurdos
```typescript
❌ ANTES: Aceitava
  Line 1: 0.00€
  Line 2: -5.99€

✅ AGORA: Rejeita
  Error: "Line 1: Invalid price (0)"
  Error: "Line 2: Invalid price (-5.99)"
```

---

## 🧪 Como Testar

### Teste 1: Fatura Normal (Deve Passar)
1. Upload fatura FP SILVA
2. Ver logs: `[Router] ✅ Strict validation passed`
3. Status: `reviewing` ✅

### Teste 2: Forçar Erro Matemático
1. Criar template com bug na extração
2. Template retorna: Subtotal=100, IVA=10, Total=999
3. Ver logs: `[Router] ❌ Strict validation failed`
4. Status: `error` ✅

### Teste 3: Desativar Validação
```bash
# .env
ENABLE_STRICT_VALIDATION=false

# Rebuild
npm run build

# Re-test
# Deve aceitar tudo (modo antigo)
```

---

## 📈 Métricas Para Monitorar

Após deploy, verificar:

1. **Taxa de Rejeição**
   - Antes: ~2-5% (só falhas técnicas)
   - Depois: ~5-10% (incluindo validação)
   - Se >15% → Investigar!

2. **Falsos Positivos**
   - Faturas válidas foram rejeitadas?
   - Ver logs: `[Router] ❌ Strict validation failed`
   - Ajustar tolerâncias se necessário

3. **Qualidade de Dados**
   - Zero linhas "Inf" em production ✅
   - Zero totais errados em production ✅

---

## 🔧 Troubleshooting

### Problema: Muitas Faturas Rejeitadas

**Sintoma:**
```
[Router] ❌ Strict validation failed:
  - Line items sum differs from subtotal by 0.75€
```

**Solução:**
```typescript
// Aumentar tolerância temporariamente
// invoice-validation.service.ts
private readonly LINE_SUM_TOLERANCE = 1.00;  // Era 0.50
```

### Problema: Warnings Excessivos

**Sint oma:**
```
[Router] ⚠️ Validation warnings:
  - Unusual IVA rate: 6.2%
```

**Isto é NORMAL.** Warnings não bloqueiam, só alertam.

### Problema: Emergency Rollback

```bash
# .env
ENABLE_STRICT_VALIDATION=false

# Rebuild
npm run build

# Restart worker
```

Sistema volta ao comportamento antigo imediatamente.

---

## ✅ Garantias

Com validação ativa:

**NUNCA vai:**
- Aceitar descrição "Inf" ou telefone
- Aceitar subtotal + IVA ≠ total (tolerância >0.02€)
- Aceitar preços 0 ou negativos

**SEMPRE vai:**
- Validar TODAS as linhas
- Logar warnings para review
- Preferir rejeitar a aceitar dados duvidosos

---

## 🚀 Próximos Passos (Fase 2)

Quando Fase 1 estiver estável:

1. **Zonas Geométricas** em templates
2. **Tesseract localizado** (só zonas específicas)
3. **Dashboard** de templates
4. **Auto-deactivation** após falhas consecutivas

**Estimativa:** 2-3 semanas
