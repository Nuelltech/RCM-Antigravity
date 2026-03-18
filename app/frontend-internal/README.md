# RCM Internal Portal - Frontend

Portal interno de administração e suporte para equipa RCM.

## 🚀 Quick Start

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:3002**

**Backend deve estar rodando na porta 3001**

### Build
```bash
npm run build
npm start
```

## 📋 Estrutura

```
src/
├── app/              # Páginas Next.js
│   ├── login/        # Autenticação
│   ├── dashboard/    # Dashboard principal
│   └── leads/        # Gestão de leads
├── components/       # Componentes reutilizáveis
│   ├── ui/          # Componentes UI base
│   ├── InternalLayout.tsx
│   └── ProtectedRoute.tsx
├── contexts/         # React Contexts
│   └── InternalAuthContext.tsx
├── services/         # API Services
│   └── internal-auth.service.ts
└── lib/             # Utilities
    ├── api.ts
    └── utils.ts
```

## 🔧 Configuração

### Environment Variables

Copie `.env.example` para `.env.local` e configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_ENV=development
```

### GitHub Codespaces

As variáveis de ambiente serão automaticamente detectadas:
```
NEXT_PUBLIC_API_URL=https://${CODESPACE_NAME}-4000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}
```

## 👥 Credenciais de Teste

- **Admin**: admin@rcm.internal / admin123
- **Marketing**: marketing@rcm.internal / marketing123  
- **Sales**: sales@rcm.internal / sales123
- **Support**: support@rcm.internal / support123

## 🎨 Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/ui components
- **Icons**: Lucide React
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **Language**: TypeScript

## 📦 Scripts

- `npm run dev` - Start development server (port 3001)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🌐 Deploy

Este projeto está configurado para deploy em **internal.rcm-app.com**

Ver `implementation_plan.md` para detalhes de deployment.
