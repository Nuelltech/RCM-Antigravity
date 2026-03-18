# ✅ Checklist de Validação Local

Execute estes comandos no seu terminal do Codespaces para validar as alterações antes de fazer deploy.

## 1️⃣ Backend - Compilação TypeScript

```bash
cd backend
npm run build
```

**Resultado esperado:**
```
✓ Successfully compiled X files
```

**Se houver erros:**
- Verifique se tem `node_modules` instalado: `npm install`
- Verifique se Prisma Client está gerado: `npx prisma generate`

---

## 2️⃣ Frontend - Compilação Next.js

```bash
cd app/frontend
npm run build
```

**Resultado esperado:**
```
✓ Compiled successfully
✓ Creating an optimized production build
✓ Collecting page data
✓ Finalizing page optimization

Route (app)                                Size     First Load JS
┌ ○ /                                     XXX kB         XXX kB
└ ○ /auth/login                           XXX kB         XXX kB
...
```

**Se houver erros:**
- Verifique se tem `node_modules` instalado: `npm install`
- Verifique variável de ambiente: `NEXT_PUBLIC_API_URL` deve estar definida (ou usar default)

---

## 3️⃣ Teste Local - Backend

```bash
cd backend
npm run dev
```

**Deve ver:**
```
Server running on port 3001
✅ Redis connected (ou aviso se Redis não disponível)
```

**Teste no browser:**
- Health Check: http://localhost:3001/health
- Deve retornar: `{"status":"ok","timestamp":"..."}`

---

## 4️⃣ Teste Local - Frontend

Noutro terminal:

```bash
cd app/frontend
npm run dev
```

**Deve ver:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

**Teste no browser:**
- Abrir: http://localhost:3000
- Fazer login
- Verificar que chamadas API funcionam (DevTools → Network tab)

---

## 5️⃣ Verificação da Configuração

### ✅ Verificar next.config.js
```bash
cd app/frontend
cat next.config.js | grep -A 5 "rewrites"
```

**Deve retornar o proxy condicional:**
```javascript
async rewrites() {
    if (process.env.NODE_ENV !== 'production') {
        return [{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }];
    }
    return [];
}
```

### ✅ Verificar CORS no backend
```bash
cd backend/src/core
cat server.ts | grep -A 3 "rcm-app.com"
```

**Deve incluir:**
```typescript
'https://rcm-app.com',
'https://www.rcm-app.com',
```

### ✅ Verificar render.yaml
```bash
cat render.yaml | grep buildCommand
```

**Deve incluir:**
```yaml
buildCommand: npm install && npx prisma generate && npm run build
```

---

## ✅ Checklist Final

Antes de fazer deploy, confirme:

- [ ] Backend compila sem erros (`npm run build`)
- [ ] Frontend compila sem erros (`npm run build`)
- [ ] Backend inicia corretamente (`npm run dev`)
- [ ] Frontend inicia corretamente (`npm run dev`)
- [ ] Login funciona em localhost
- [ ] Chamadas API funcionam (verificar Network tab)
- [ ] Nenhum erro de CORS no console do browser
- [ ] Proxy funciona (`/api/*` é redirecionado para `localhost:3001`)

---

## 🚀 Deploy para Produção

Quando tudo estiver OK:

```bash
git add .
git commit -m "fix: production configuration for rcm-app.com deployment"
git push origin main
```

Depois siga o guia em `DEPLOY_NOW.md` para monitorizar o deploy.
