# RCM - Instruções de Teste do Portal Interno

## 🚀 Como Testar

### 1. Backend API

**Terminal 1 - Iniciar Backend:**
```bash
cd backend
npm run dev
```

Deve ver:
```
Server running on port 4000
```

**Teste o endpoint de stats:**
```bash
# No navegador ou Postman
GET http://localhost:4000/api/internal/dashboard/stats
```

### 2. Frontend Interno

**Terminal 2 - Instalar dependências (primeira vez):**
```bash
cd app/frontend-internal
npm install
```

**Iniciar aplicação:**
```bash
npm run dev
```

Deve ver:
```
ready - started server on 0.0.0.0:3001
```

### 3. Acessar Portal

Abrir no navegador: **http://localhost:3001**

**Credenciais de teste:**
- Email: `admin@rcm.internal`
- Password: `admin123`

### 4. O Que Deve Ver

✅ Página de login profissional
✅ Após login → Dashboard com cards de estatísticas
✅ Sidebar com navegação
✅ Stats reais da base de dados:
  - Total de Tenants
  - Tenants Ativos
  - Novos Leads
  - Taxa de Conversão

---

## 🐛 Troubleshooting

### Erro: Cannot find module
```bash
cd app/frontend-internal
npm install
```

### Erro: Port 3001 already in use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Backend não responde
Verifique se backend está a correr na porta 4000:
```bash
curl http://localhost:4000/health
```

### Stats aparecem a 0
Normal se base de dados vazia. Backend retorna valores reais.

---

## 📝 Próximos Passos

Após confirmar que funciona:
1. ✅ Login funcional
2. ✅ Dashboard com stats reais
3. 🔜 Adicionar gráficos (Recharts)
4. 🔜 Página de Leads completa
5. 🔜 Deploy para Codespaces

---

**Status:** Pronto para testar! 🎉
