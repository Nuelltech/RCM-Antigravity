# 🚀 Quick Deploy Guide - RCM Production Update

Este guia rápido é para atualizar a versão atual em produção para a versão mais recente do código.

## ✅ Correções Aplicadas

As seguintes correções críticas foram aplicadas ao código:

### 1. **Frontend (Next.js)**
- ✅ Removido proxy localhost do `next.config.js`
- ✅ Adicionados domínios `rcm-app.com` e `*.rcm-app.com` aos remote patterns
- ✅ Output `standalone` sempre ativo para produção
- ✅ Limpeza do `vercel.json` (removido env vazio)

### 2. **Backend (Fastify)**
- ✅ CORS atualizado com domínios production: `rcm-app.com` e `www.rcm-app.com`
- ✅ `render.yaml` atualizado com `npx prisma generate` no build
- ✅ Variáveis de ambiente adicionadas ao render.yaml

## 📋 Checklist de Deploy

### Passo 1: Verificar Variáveis de Ambiente no Render

Aceda ao [Render Dashboard](https://dashboard.render.com) → RCM-Nuelltech → Environment

**Certifique-se que estas variáveis estão configuradas:**
- ✅ `FRONTEND_URL` = `https://www.rcm-app.com`
- ✅ `DATABASE_URL` = (já configurado)
- ✅ `REDIS_URL` = (já configurado)
- ✅ `JWT_SECRET` = (já configurado)
- ✅ `JWT_REFRESH_SECRET` = (já configurado)
- ✅ `GEMINI_API_KEY` = (já configurado)
- ✅ `GOOGLE_VISION_API_KEY_PATH` = (já configurado)
- ✅ `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` = (verificar se estão configurados)
- ✅ `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` = (verificar se estão configurados)

### Passo 2: Verificar Variáveis de Ambiente no Vercel

Aceda ao [Vercel Dashboard](https://vercel.com/dashboard) → rcm → Settings → Environment Variables

**Certifique-se que está configurada:**
- ✅ `NEXT_PUBLIC_API_URL` = `https://rcm-nuelltech.onrender.com`

### Passo 3: Deploy do Backend (Render)

```bash
# No seu terminal local:
git add .
git commit -m "fix: production configuration for Render and Vercel"
git push origin main
```

O Render irá automaticamente:
1. Detectar o push
2. Executar build: `npm install && npx prisma generate && npm run build`
3. Iniciar o servidor: `npm start`

**⏱️ Tempo estimado**: 3-5 minutos

### Passo 4: Deploy do Frontend (Vercel)

O Vercel está configurado para auto-deploy. Após o push do git:

1. Vercel detecta alterações
2. Executa build do Next.js
3. Faz deploy automático

**⏱️ Tempo estimado**: 2-3 minutos

## 🧪 Testes Pós-Deploy

### Backend (Render)
```bash
# Health Check
curl https://rcm-nuelltech.onrender.com/health

# Deve retornar: {"status":"ok","timestamp":"..."}
```

### Frontend (Vercel)
1. Abra https://www.rcm-app.com
2. Teste o login
3. Verifique que as chamadas API funcionam (DevTools → Network)

## ⚠️ Troubleshooting

### Backend não inicia após deploy
**Possível causa**: Prisma Client não foi gerado

**Solução**: No Render Dashboard → Shell, execute:
```bash
npx prisma generate
```

### CORS Error no Frontend
**Possível causa**: FRONTEND_URL não está atualizado

**Solução**: Verificar variável `FRONTEND_URL=https://www.rcm-app.com` no Render

### Frontend não consegue conectar ao Backend
**Possível causa**: `NEXT_PUBLIC_API_URL` incorreto

**Solução**: Verificar no Vercel → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://rcm-nuelltech.onrender.com
```

## 📝 Notas Importantes

- ⚡ **Free Tier Render**: O backend entra em "sleep" após 15 min de inatividade
- 🔄 **Auto-Deploy**: Ambos os serviços têm auto-deploy do branch `main`
- 🗄️ **Database**: Partilhada entre dev e prod - cuidado com migrations!

## ✅ Verificação Final

Após deploy, confirme:
- [ ] Login funciona em https://www.rcm-app.com
- [ ] Dashboard carrega dados
- [ ] Produtos/Receitas aparecem corretamente
- [ ] Upload de faturas funciona (se usar Google Vision)
- [ ] Não há erros de CORS no console do browser
- [ ] Backend responde em menos de 5 segundos (após "wake up" se estava em sleep)

---

**Pronto!** 🎉 A sua aplicação está atualizada em produção!
