# Troubleshooting: Assets Não Aparecem

## Status dos Ficheiros

✅ **Vídeo**: `public/videos/hero-video.mp4` (80.5 MB)  
✅ **Logo**: `public/images/logo.png` (60.6 KB)  
✅ **Código**: Referências corretas em `page.tsx`

## Soluções

### 1. Limpar Cache do Next.js e Reiniciar

No terminal, na pasta `app/frontend`:

```bash
# Parar o servidor (Ctrl+C)

# Apagar a pasta .next (cache)
rmdir /s /q .next

# Reiniciar o servidor
npm run dev
```

### 2. Forçar Refresh no Browser

- **Chrome/Edge**: Ctrl + Shift + R (hard refresh)
- **Firefox**: Ctrl + F5
- Ou abrir em janela anónima/privada

### 3. Verificar Console do Browser

1. Abrir DevTools (F12)
2. Ir ao tab "Console"
3. Procurar erros como:
   - `404 Not Found` → O ficheiro não existe no caminho
   - `CORS error` → Problema de permissões
   - `Failed to load resource` → Caminho errado

### 4. Verificar que o Dev Server Está a Correr

```bash
cd "e:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity\app\frontend"
npm run dev
```

Deve mostrar:
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
```

### 5. Testar Diretamente os Assets

No browser, aceder diretamente:
- `http://localhost:3000/videos/hero-video.mp4` → Deve fazer download/mostrar o vídeo
- `http://localhost:3000/images/logo.png` → Deve mostrar a imagem

Se NÃO aparecerem, o problema é com o Next.js a servir ficheiros estáticos.

## Se Continuar Sem Funcionar

Verifique se existe um ficheiro `next.config.js` que possa estar a bloquear assets:

```js
// next.config.js - deve estar assim
/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
```

## Solução Alternativa: Nomes Originais

Se preferir usar os nomes originais dos ficheiros (sem renomear):

1. No `page.tsx`, alterar:
   ```tsx
   // Linha 22:
   <img src="/images/RCM_Logo_Cutout.png" alt="RCM" className="h-10 w-auto" />
   
   // Linha 41:
   <source src="/videos/Loop_Molho_Vista_Cima_uhd_4096_2160_25fps.mp4" type="video/mp4" />
   ```

2. Copiar ficheiros com nomes originais:
   ```bash
   copy "E:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity\Videos\Loop_Molho_Vista_Cima_uhd_4096_2160_25fps.mp4" "public\videos\"
   
   copy "E:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity\images\RCM_Logo_Cutout.png" "public\images\"
   ```
