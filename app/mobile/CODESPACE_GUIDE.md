# Guia de Inicialização - GitHub Codespace

## ⚠️ Importante: Sincronização de Ficheiros

Estás a editar localmente em Windows (`E:\`) mas a executar no Codespace (Linux).

### Caminho no Codespace
```
/workspaces/RCM-Antigravity/app/mobile
```

## Passo 1: Verificar Ficheiros Essenciais no Codespace

Execute no terminal do Codespace:

```bash
cd /workspaces/RCM-Antigravity/app/mobile
ls -la
```

**Deve aparecer**:
- `package.json` ✅
- `app.json` ✅
- `babel.config.js` ✅
- `metro.config.js` ✅
- `node_modules/` (pasta)
- `app/` (pasta)
- `lib/` (pasta)
- `components/` (pasta)

## Passo 2: Verificar package.json

```bash
cat package.json
```

**Confirme que contém** (nas dependencies):
```json
"react-native-reanimated": "~3.16.1",
"expo-av": "~14.0.0",
"@react-native-community/datetimepicker": "8.2.0"
```

## Passo 3: Limpar e Instalar Dependências

```bash
# Limpar cache anterior
rm -rf node_modules
rm -f package-lock.json

# Instalar dependências
npm install

# Instalar dependências Expo específicas (versões corretas)
npx expo install react-native-reanimated expo-av @react-native-community/datetimepicker
```

## Passo 4: Iniciar o Servidor

```bash
npx expo start --clear
```

## 🔍 Troubleshooting - Ficheiros em Falta

Se ficheiros estiverem em falta no Codespace, **COMMIT** as alterações locais e **PULL** no Codespace:

### No Windows (Local):
```powershell
cd "E:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity"
git add .
git commit -m "Fix: Consolidate mobile project structure"
git push
```

### No Codespace:
```bash
cd /workspaces/RCM-Antigravity
git pull
```

## 📁 Estrutura Correta (Confirmada)

```
/workspaces/RCM-Antigravity/app/mobile/
├── package.json          ← Dependências completas
├── app.json             ← Config Expo
├── babel.config.js      ← Babel (Modo Seguro)
├── metro.config.js      ← Metro (Modo Seguro)
├── tailwind.config.js
├── global.css
├── node_modules/        ← Instalar com npm install
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── (tabs)/
│       ├── dashboard.tsx
│       ├── financial.tsx  ← FAQ FIX APLICADO
│       ├── catalog.tsx
│       └── settings.tsx
├── components/
│   └── invoices/
│       └── InvoiceCard.tsx
├── lib/
│   ├── api.ts
│   └── auth.ts
└── types/
    └── invoice.ts
```

## ⚡ Verificação Rápida do Fix do FAB

Depois do `expo start`, verifique:

1. Abra a aplicação (pressione `w` para web)
2. Navegue para a tab **Financial**
3. **Teste**: Clique no botão laranja `+` no canto inferior direito
4. **Esperado**: Modal de "Importar Fatura" deve abrir

## 🐛 Erros Comuns no Codespace

### Erro: "Cannot find module 'react-native-worklets'"
**Causa**: `react-native-reanimated` não instalado corretamente.

**Solução**:
```bash
npx expo install react-native-reanimated
npx expo start --clear
```

### Erro: "Package.json not found"
**Causa**: Está no diretório errado.

**Solução**:
```bash
pwd  # Deve mostrar: /workspaces/RCM-Antigravity/app/mobile
cd /workspaces/RCM-Antigravity/app/mobile
```

### App carrega mas sem estilos (tudo preto/branco)
**Esperado**: O projeto está em Modo Seguro.
**Fix opcional**: Ver `STARTUP_GUIDE.md` para ativar NativeWind (após confirmar que Reanimated está instalado).

### Mudanças no código não aparecem
**Causa**: Ficheiros commitados no Windows mas não sincronizados no Codespace.

**Solução**:
```bash
git pull
npx expo start --clear
```

## 🎯 Comandos de Reinicialização Completa

Se nada funcionar, execute esta sequência:

```bash
# 1. Voltar ao estado limpo
cd /workspaces/RCM-Antigravity/app/mobile
rm -rf node_modules package-lock.json .expo

# 2. Verificar se package.json existe
cat package.json

# 3. Instalar tudo de novo
npm install

# 4. Instalar dependências Expo
npx expo install react-native-reanimated expo-av @react-native-community/datetimepicker

# 5. Iniciar limpo
npx expo start --clear
```

## 📝 Checklist Pré-Startup

- [ ] Estou no diretório correto: `/workspaces/RCM-Antigravity/app/mobile`
- [ ] `package.json` existe e contém `react-native-reanimated`
- [ ] `babel.config.js` existe
- [ ] `metro.config.js` existe
- [ ] `app/(tabs)/financial.tsx` existe (com fix do FAB)
- [ ] Executei `npm install` sem erros
- [ ] Executei `npx expo start --clear`

---
**Ambiente**: GitHub Codespace (Linux)  
**Caminho do Projeto**: `/workspaces/RCM-Antigravity/app/mobile`  
**Última Sincronização**: Verificar com `git status`
