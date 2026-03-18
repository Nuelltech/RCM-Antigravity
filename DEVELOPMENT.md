# Notas de Desenvolvimento - RCM

## 🏗️ Ambiente de Desenvolvimento

### Workflow Atual
- **Desenvolvimento Local**: `e:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity`
- **Ambiente de Teste**: GitHub Codespace
- **Processo de Deploy**:
  1. Desenvolver localmente em `e:\`
  2. Copiar manualmente para GitHub
  3. Compilar no Codespace para testar
  4. Deploy para produção (Render + Vercel)

> ⚠️ **IMPORTANTE**: As alterações feitas localmente precisam ser copiadas manualmente para o GitHub antes de poderem ser testadas no Codespace.

---

## 📂 Estrutura do Projeto

```
antigravity/
├── backend/              # API NestJS/Fastify + Prisma
│   ├── src/
│   ├── prisma/
│   └── package.json
├── app/
│   └── frontend/        # Next.js 14 App Router
│       ├── src/
│       └── package.json
└── docs/                # Documentação adicional
```

---

## 🚀 Comandos Úteis

### Backend
```bash
cd backend
npm run dev          # Development server
npm run build        # Build para produção
npx prisma studio    # Interface visual do database
npx prisma migrate dev  # Criar migração
```

### Frontend
```bash
cd app/frontend
npm run dev          # Development server
npm run build        # Build para produção
npm run lint         # Linting
```

---

## 🗄️ Database

- **Desenvolvimento**: PostgreSQL local
- **Produção**: Render PostgreSQL
- **ORM**: Prisma

### Migrations
```bash
cd backend
npx prisma migrate dev --name nome_da_migracao
npx prisma generate
```

---

## 🔧 Variáveis de Ambiente

### Backend (`backend/.env`)
```
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
GOOGLE_CLOUD_KEY_PATH="..."
GEMINI_API_KEY="..."
REDIS_URL="..."
```

### Frontend (`app/frontend/.env.local`)
```
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 📝 Convenções de Código

- **Commits**: Mensagens descritivas em português
- **Branches**: Feature branches para novas funcionalidades
- **TypeScript**: Strict mode habilitado
- **Linting**: ESLint + Prettier

---

## 🐛 Troubleshooting Comum

### Backend não inicia
1. Verificar se PostgreSQL está a correr
2. Verificar se Redis está disponível
3. Executar `npx prisma generate`

### Frontend com erros de tipo
1. Executar `npm install` novamente
2. Reiniciar TypeScript server no VS Code

### Problemas de sincronização
- Lembrar de copiar alterações para GitHub antes de testar no Codespace

---

## 📚 Recursos

- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Fastify Docs](https://www.fastify.io/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## 🔄 Workflow de Deploy

1. **Local Development**: Fazer alterações em `e:\`
2. **Git Push**: Copiar para GitHub (manual)
3. **Codespace Testing**: Compilar e testar no Codespace
4. **Production Deploy**:
   - Backend: Push para `main` → Render auto-deploy
   - Frontend: Push para `main` → Vercel auto-deploy

---

*Última atualização: 2026-01-20*
