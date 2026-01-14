# Guia de Inicialização - App Mobile RCM

## Estrutura do Projeto
✅ **Caminho correto**: `E:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity\app\mobile`

## Ficheiros Essenciais Presentes
- ✅ `package.json` - Dependências do projeto
- ✅ `app.json` - Configuração do Expo
- ✅ `babel.config.js` - Configuração do Babel (Modo Seguro)
- ✅ `metro.config.js` - Configuração do Metro Bundler (Modo Seguro)
- ✅ `tailwind.config.js` - Configuração do Tailwind
- ✅ `global.css` - Estilos globais
- ✅ `node_modules` - Pacotes instalados
- ✅ `app/(tabs)/` - Código da aplicação
- ✅ `components/` - Componentes reutilizáveis
- ✅ `lib/` - Bibliotecas (API, Auth)
- ✅ `types/` - Definições TypeScript

## Passos para Iniciar

### 1. Instalar Dependências Atualizadas
```bash
cd "E:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity\app\mobile"
npm install
```

### 2. Iniciar o Servidor Expo
```bash
npx expo start --clear
```

### 3. Aceder à Aplicação
- **Web**: Pressione `w` no terminal ou abra `http://localhost:8081`
- **Android**: Pressione `a` (requer emulador ou dispositivo)
- **iOS**: Pressione `i` (apenas macOS)

## Estado Atual do Projeto

### ✅ Funcionalidades Operacionais
- Botão FAB (Floating Action Button) na tela Financial - **CORRIGIDO**
- Modal de upload de faturas
- Navegação entre tabs
- Autenticação (via lib/auth.ts)

### ⚠️ Configuração em Modo Seguro
O projeto está configurado em "Modo Seguro" para garantir que funciona:
- **babel.config.js**: `presets: ["babel-preset-expo"]` (sem NativeWind temporariamente)
- **metro.config.js**: Configuração básica do Expo (sem NativeWind)

**Resultado**: O app funciona mas sem os estilos do Tailwind (layout simples).

### 🎨 Para Ativar Estilos Completos (Opcional)

Se as dependências instalarem corretamente, pode ativar o NativeWind:

**babel.config.js**:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

**metro.config.js**:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

Depois reinicie:
```bash
npx expo start --clear
```

## Dependências Principais

### Expo & React
- `expo`: ~52.0.0
- `react`: 18.3.1
- `react-native`: 0.76.0
- `expo-router`: ~4.0.0

### UI & Styling
- `nativewind`: ^4.0.1
- `tailwindcss`: ^3.4.0
- `lucide-react-native`: ^0.3.0
- `react-native-reanimated`: ~3.16.1 ⭐ (recém-adicionado)

### Funcionalidades
- `expo-image-picker`: ~16.0.0
- `expo-document-picker`: ~13.0.0
- `expo-av`: ~14.0.0 ⭐ (recém-adicionado)
- `@react-native-community/datetimepicker`: 8.2.0 ⭐ (recém-adicionado)
- `axios`: ^1.7.0
- `zustand`: ^4.5.0 (gestão de estado)
- `expo-secure-store`: ~14.0.0 (armazenamento seguro)

## Troubleshooting

### Erro: "Cannot find module 'react-native-worklets'"
**Solução**: O projeto está em Modo Seguro. Não afeta o funcionamento básico.

### App não reflete mudanças de código
**Solução**: O projeto foi consolidado. Edite apenas ficheiros em `app/mobile/`, não em subpastas duplicadas.

### Dependências em falta
**Solução**: Execute `npm install` na pasta raiz do mobile.

## Alterações Recentes

### Fix do Botão FAB (Financial Screen)
- ✅ Trocado `TouchableOpacity` para `Pressable`
- ✅ Adicionado `cursor: 'pointer'` para web
- ✅ Posicionado `bottom: 100` para evitar conflito com tab bar
- ✅ Modal renderizado condicionalmente para evitar bloqueio de eventos
- ✅ Ficheiro sincronizado em `app/mobile/app/(tabs)/financial.tsx`

### Consolidação da Estrutura de Pastas
- ✅ Removida pasta `mobile/mobile` duplicada
- ✅ Todos os ficheiros unificados em `app/mobile`
- ✅ `package.json`, `babel.config.js`, `metro.config.js` na raiz correta

---
**Última atualização**: 2026-01-12
**Versão do Expo**: SDK 52
**Estado**: Funcional em Modo Seguro
