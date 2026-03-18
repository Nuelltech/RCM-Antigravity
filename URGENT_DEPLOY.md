# 🚀 Deploy URGENTE - Correção CORS

## ❌ Problema Identificado
Backend no Render está com erro 500 devido a CORS bloqueando health checks internos.

## ✅ Correção Aplicada
Atualizado `backend/src/core/server.ts` para permitir requisições sem header `origin` (health checks do Render).

---

## 📝 Comandos de Deploy

### No seu terminal:

```bash
# 1. Commit da correção
git add backend/src/core/server.ts
git commit -m "fix: allow CORS for health checks without origin header"

# 2. Push para produção
git push origin main
```

---

## ⏱️ Timeline do Deploy

1. **Push detectado** - 30 segundos
2. **Build backend** - 2 minutos
3. **Restart serviço** - 30 segundos
4. **Health checks OK** - 10 segundos

**Total: ~3-4 minutos**

---

## ✅ Verificação Pós-Deploy

### 1. Verificar Logs do Render
Aceda a: https://dashboard.render.com → RCM-Nuelltech → Logs

**Procure por:**
```
Server running on port 3001
✅ Redis connected
```

**NÃO deve ver:**
```
Error: Not allowed by CORS
```

### 2. Testar Health Check
```bash
curl https://rcm-nuelltech.onrender.com/health
```

**Resultado esperado:**
```json
{"status":"ok","timestamp":"2026-01-09T..."}
```

### 3. Testar Frontend
Abra: https://www.rcm-app.com
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Produtos/Receitas aparecem
- [ ] Sem erros no console

---

## 🆘 Se Algo Falhar

### Erro persiste nos logs
1. Verificar se commit foi aplicado
2. Verificar build logs no Render
3. Fazer manual deploy no dashboard Render

### Frontend não conecta
1. Verificar `NEXT_PUBLIC_API_URL` no Vercel
2. Verificar CORS nos logs do backend
3. Testar health check diretamente

---

## 📊 Status Atual

- ✅ **Localhost** - Funcionando
- ✅ **Vercel Frontend** - Funcionando  
- ⚠️ **Render Backend** - Live mas com CORS error
- 🔧 **Correção** - Pronta para deploy

---

## ⚡ Ação Imediata

Execute agora:
```bash
git add backend/src/core/server.ts
git commit -m "fix: allow CORS for health checks without origin header"
git push origin main
```

Depois monitorize os logs do Render durante ~4 minutos.
