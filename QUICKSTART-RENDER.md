# Quick Start - Configuração Render

## Problema Original
O build command estava incorreto: `npm install --legacy-peer-deps npx prisma generate npm run build`

## Solução

### 1. Atualizar Build Command no Render Dashboard

Vá para o seu serviço no Render e atualize:

**Build Command:**
```bash
npm install --legacy-peer-deps && npx prisma generate && npm run build
```

**Pre-Deploy Command:**
```bash
npx prisma migrate deploy
```

**Start Command:**
```bash
npm start
```

### 2. Configurar Variáveis de Ambiente

No Render Dashboard → Environment:

| Variável | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `mysql://habimark_RCMADMIN:Pgrquhh81@93.127.192.117:3306/habimark_RCM` |
| `REDIS_URL` | `redis://93.127.192.117:6379` |
| `JWT_SECRET` | `uma-string-secreta-super-segura` |
| `JWT_REFRESH_SECRET` | `outra-string-secreta-super-segura` |

### 3. Fazer Deploy

Depois de atualizar as configurações, clique em **Manual Deploy** → **Deploy latest commit**

### 4. Verificar Logs

Acompanhe os logs para garantir que:
- ✅ `npm install` completa com sucesso
- ✅ `npx prisma generate` executa
- ✅ `npm run build` compila o TypeScript
- ✅ Ficheiro `dist/core/server.js` é criado
- ✅ Servidor inicia na porta 3001

## Alternativa: Usar render.yaml

Se preferir, pode usar o ficheiro `render.yaml` que foi criado na raiz do repositório. Basta:

1. Fazer commit e push do `render.yaml` para o GitHub
2. No Render, criar um novo **Blueprint** em vez de Web Service
3. O Render irá ler automaticamente as configurações do `render.yaml`

---

Para mais detalhes, consulte [DEPLOYMENT.md](./DEPLOYMENT.md)
