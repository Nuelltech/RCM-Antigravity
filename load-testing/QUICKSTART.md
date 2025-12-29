# 🚀 Quick Start - Load Testing

Guia rápido para começar com os testes de carga no RCM.

## ✅ Pré-requisitos

- [x] k6 instalado ✓
- [x] Backend a correr (localhost:3001)
- [ ] Base de dados populada com dados de teste

---

## 📦 Passo 1: Popular Base de Dados

Executar o seed script para criar dados volumosos:

```bash
cd backend
npm run seed:load-testing
```

**O que faz:**
- Cria 3 tenants (test-pequeno, test-medio, test-grande)
- 75 utilizadores total
- 6,200 produtos total
- 1,250 receitas total
- 140 fornecedores total

**Tempo estimado:** 5-10 minutos

---

## 🧪 Passo 2: Executar Baseline Test

```bash
cd ../load-testing
k6 run scripts/baseline.js
```

**O que testa:**
- GET /api/auth/me
- GET /api/dashboard
- GET /api/produtos (paginado)
- GET /api/receitas (paginado)
- Pesquisas

**Duração:** 5 minutos
**VUs:** 1 (single user)

---

## 📊 Resultados Esperados

```
✓ GET /auth/me - status 200
✓ GET /dashboard - status 200
✓ GET /produtos - status 200
✓ GET /receitas - status 200

http_req_duration............: avg=XXms p(95)=XXms p(99)=XXms
http_req_failed..............: 0.00%
http_reqs....................: XXX/s
```

---

## 🎯 Métricas Importantes

| Métrica | Target | Max Aceitável |
|---------|--------|---------------|
| p(95) response time | < 200ms | < 500ms |
| p(99) response time | < 500ms | < 1s |
| Error rate | < 0.1% | < 1% |

---

## ⚠️ Troubleshooting

### Erro: "login failed"
- Verificar se backend está a correr em localhost:3001
- Verificar se seed foi executado com sucesso
- Credenciais default: `user1@test-pequeno.com` / `LoadTest123!`

### Erro: "connection refused"
- Backend não está a correr
- Executar: `cd backend && npm run dev`

### Queries muito lentas (> 1s)
- Normal para primeira execução (PostgreSQL warming up)
- Executar teste novamente

---

## 📝 Próximos Passos

Após baseline bem-sucedido:

1. ✅ Documentar resultados baseline
2. ✅ Identificar queries lentas
3. ✅ Criar testes de carga incrementais
4. ✅ Testar com múltiplos utilizadores
