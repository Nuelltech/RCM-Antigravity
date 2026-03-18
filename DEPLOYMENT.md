# Guia de Deployment para Produção

Este guia detalha o processo de deployment do RCM (Restaurante Cost Manager) para produção usando:
- **Backend**: Render
- **Frontend**: Vercel
- **Base de Dados**: MySQL no Hostinger

## 📋 Pré-requisitos

- Conta no [Render](https://render.com)
- Conta no [Vercel](https://vercel.com)
- Base de dados MySQL no Hostinger (já configurada)
- Repositório GitHub com o código

## 🔧 Variáveis de Ambiente

### Backend (Render)

Configure as seguintes variáveis de ambiente no Render Dashboard:

| Variável | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `DATABASE_URL` | `mysql://habimark_RCMADMIN:Pgrquhh81@93.127.192.117:3306/habimark_RCM` |
| `REDIS_URL` | `redis://93.127.192.117:6379` |
| `JWT_SECRET` | `uma-string-secreta-super-segura` |
| `JWT_REFRESH_SECRET` | `outra-string-secreta-super-segura` |

### Frontend (Vercel)

Configure a seguinte variável de ambiente no Vercel Dashboard:

| Variável | Valor | Exemplo |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | URL do backend no Render | `https://rcm-backend.onrender.com` |

## 🚀 Deployment do Backend (Render)

### Opção 1: Usando render.yaml (Recomendado)

O ficheiro `render.yaml` na raiz do repositório já está configurado. O Render irá detectá-lo automaticamente.

1. Aceda ao [Render Dashboard](https://dashboard.render.com)
2. Clique em **New +** → **Blueprint**
3. Conecte o seu repositório GitHub
4. O Render irá detectar o `render.yaml` automaticamente
5. Configure as variáveis de ambiente (ver secção acima)
6. Clique em **Apply**

### Opção 2: Configuração Manual

Se preferir configurar manualmente:

1. Aceda ao [Render Dashboard](https://dashboard.render.com)
2. Clique em **New +** → **Web Service**
3. Conecte o seu repositório GitHub
4. Configure:
   - **Name**: `rcm-backend`
   - **Region**: Frankfurt (ou mais próximo)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: 
     ```bash
     npm install --legacy-peer-deps && npx prisma generate && npm run build
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```
5. Configure as variáveis de ambiente (ver secção acima)
6. Clique em **Create Web Service**

### ⚠️ Importante: Migrations

Após o primeiro deployment, execute as migrations manualmente:

1. No Render Dashboard, vá ao seu serviço
2. Clique em **Shell** (no menu lateral)
3. Execute:
   ```bash
   npx prisma migrate deploy
   ```

## 🌐 Deployment do Frontend (Vercel)

### Usando Vercel CLI (Recomendado)

1. Instale o Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Na pasta `app/frontend`, execute:
   ```bash
   vercel
   ```

3. Siga as instruções:
   - Link to existing project? **No**
   - Project name: `rcm-frontend`
   - Directory: `./` (já está na pasta frontend)
   - Override settings? **No**

4. Configure a variável de ambiente:
   ```bash
   vercel env add NEXT_PUBLIC_API_URL
   ```
   Valor: URL do backend (ex: `https://rcm-backend.onrender.com`)

5. Deploy para produção:
   ```bash
   vercel --prod
   ```

### Usando Vercel Dashboard

1. Aceda ao [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Add New** → **Project**
3. Importe o repositório GitHub
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `app/frontend`
   - **Build Command**: `npm run build` (detectado automaticamente)
   - **Output Directory**: `.next` (detectado automaticamente)
5. Adicione a variável de ambiente:
   - `NEXT_PUBLIC_API_URL`: URL do backend Render
6. Clique em **Deploy**

## 🗄️ Base de Dados

### Verificar Conexão

Teste a conexão localmente antes do deployment:

```bash
# Na pasta backend
npx prisma db pull
```

Se funcionar, a conexão está OK.

### Executar Migrations

As migrations são executadas automaticamente no Render através do Pre-Deploy Command. Se precisar executar manualmente:

```bash
npx prisma migrate deploy
```

### Seed Inicial (Opcional)

Se precisar popular a base de dados com dados iniciais:

```bash
npm run seed:all
```

## ✅ Verificação Pós-Deployment

### Backend

1. **Health Check**: Aceda a `https://[seu-backend].onrender.com/health`
   - Deve retornar status 200

2. **API Documentation**: `https://[seu-backend].onrender.com/docs`
   - Deve mostrar a documentação Swagger

3. **Teste de Login**:
   ```bash
   curl -X POST https://[seu-backend].onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@rcm.com","password":"admin123"}'
   ```

### Frontend

1. Aceda à URL do Vercel: `https://[seu-app].vercel.app`
2. Teste o login
3. Verifique se as chamadas API estão a funcionar (abra DevTools → Network)

## 🐛 Troubleshooting

### Erro: "Cannot find module 'dist/core/server.js'"

**Causa**: Build command não executou corretamente o TypeScript.

**Solução**: Verifique se o build command está correto:
```bash
npm install --legacy-peer-deps && npx prisma generate && npm run build
```

### Erro: "Prisma Client not generated"

**Causa**: `npx prisma generate` não foi executado.

**Solução**: Adicione ao build command:
```bash
npm install --legacy-peer-deps && npx prisma generate && npm run build
```

### Erro: "Database connection failed"

**Causa**: DATABASE_URL incorreto ou base de dados inacessível.

**Solução**:
1. Verifique se o DATABASE_URL está correto
2. Teste a conexão localmente: `npx prisma db pull`
3. Verifique se o IP do Render está permitido no firewall do Hostinger

### Frontend não consegue conectar ao Backend

**Causa**: NEXT_PUBLIC_API_URL não configurado ou incorreto.

**Solução**:
1. Verifique se a variável está configurada no Vercel
2. Verifique se o URL está correto (sem `/` no final)
3. Redeploy do frontend após alterar variáveis

### CORS Errors

**Causa**: Backend não permite requests do domínio do frontend.

**Solução**: Verifique a configuração CORS no backend (`src/core/server.ts`)

## 📝 Notas Importantes

- **Free Tier do Render**: O serviço entra em "sleep" após 15 minutos de inatividade. O primeiro request após sleep pode demorar 30-60 segundos.
- **Logs**: Aceda aos logs no Render Dashboard para debugging
- **Redeploys**: Cada push para `main` no GitHub irá triggerar um novo deployment (se Auto-Deploy estiver ativo)
- **Variáveis de Ambiente**: Alterações nas variáveis de ambiente requerem redeploy manual

## 🔄 Atualizações Futuras

Para fazer deploy de novas alterações:

1. Faça commit e push para o GitHub:
   ```bash
   git add .
   git commit -m "Descrição das alterações"
   git push origin main
   ```

2. O Render e Vercel irão fazer deploy automaticamente (se Auto-Deploy estiver ativo)

3. Se Auto-Deploy estiver desativo, faça deploy manual no dashboard de cada plataforma

## 📞 Suporte

Em caso de problemas:
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Prisma**: https://www.prisma.io/docs
