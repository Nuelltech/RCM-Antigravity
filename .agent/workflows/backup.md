---
description: Backup OBRIGATÓRIO de ficheiros e dados antes de QUALQUER alteração
---

# 🚨 BACKUP WORKFLOW - REGRA ABSOLUTA

## ⚠️ REGRA CRÍTICA INVIOLÁVEL

**NUNCA, EM CIRCUNSTÂNCIA ALGUMA, FAZER ALTERAÇÕES SEM BACKUP PRIMEIRO!**

### 🔴 ATENÇÃO ESPECIAL PRODUÇÃO
Esta regra aconteceu em **desenvolvimento** e perdemos dados de teste.
**Em PRODUÇÃO perderíamos dados de CLIENTES REAIS!** 💀

**BACKUP OBRIGATÓRIO = FICHEIROS + DADOS**

---

## 📋 CHECKLIST PRÉ-ALTERAÇÃO (OBRIGATÓRIA)

Antes de qualquer `prisma db push`, `migrate`, ou alteração ao schema:

- [ ] ✅ **1. Backup de DADOS** (base de dados)
- [ ] ✅ **2. Backup de FICHEIROS** (código crítico)
- [ ] ✅ **3. Verificar backups criados**
- [ ] ⚠️ **4. SÓ AGORA fazer alteração**

---

## 1️⃣ BACKUP DE DADOS (Base de Dados)

### Executar Backup

// turbo
```bash
cd backend
npx tsx scripts/backup_data.ts
```

Isto cria: `backend/backups/json/[timestamp]/` com TODOS os dados em JSON.

### Verificar Backup Criado

```bash
# Windows
dir backend\backups\json\

# Linux/Mac
ls -lh backend/backups/json/
```

**CRÍTICO:** Se não vires uma pasta com timestamp recente, o backup FALHOU!

---

## 2️⃣ BACKUP DE FICHEIROS (Código Crítico)

### Ficheiros Críticos a Proteger

Execute este workflow de backup de ficheiros: **`/backup`**

Ou manualmente:

```powershell
# Criar diretório
New-Item -ItemType Directory -Path "C:\Users\ORACLE\.gemini\backups\critical_files" -Force

# Schema (CRÍTICO!)
Copy-Item "backend\prisma\schema.prisma" "C:\Users\ORACLE\.gemini\backups\critical_files\schema.prisma.$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force

# Seeds
Copy-Item "backend\scripts\seed.ts" "C:\Users\ORACLE\.gemini\backups\critical_files\seed.ts.$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force

# Server config
Copy-Item "backend\src\core\server.ts" "C:\Users\ORACLE\.gemini\backups\critical_files\server.ts.$(Get-Date -Format 'yyyyMMdd_HHmmss')" -Force
```

---

## 3️⃣ OPERAÇÕES PERIGOSAS (Requerem Backup)

Estas operações DESTROEM dados se algo correr mal:

### ❌ NUNCA sem backup:

```bash
# PERIGOSO - Pode apagar dados
prisma db push

# PERIGOSO - Pode alterar schema incorretamente  
prisma db push --schema=outro-schema.prisma

# PERIGOSO - Migrações irreversíveis
prisma migrate dev

# PERIGOSO - Produção
prisma migrate deploy
```

### ✅ SEMPRE com backup primeiro:

```bash
# 1. BACKUP PRIMEIRO
npx tsx scripts/backup_data.ts

# 2. Verificar que criou
ls backend/backups/json/

# 3. SÓ DEPOIS fazer alteração
prisma db push
```

---

## 🔄 RESTAURAR DE BACKUP

Se algo correr mal:

```bash
cd backend
npx tsx scripts/restore_data.ts
```

Isto restaura do backup mais recente em `backend/backups/json/`.

---

## 🛡️ PROTEÇÕES ADICIONAIS

### Para Produção (DATABASE_URL)

**NUNCA** executar comandos destrutivos diretamente em produção!

1. Teste SEMPRE em desenvolvimento primeiro
2. Faça backup de produção via MySQL dump:
   ```bash
   mysqldump -h [host] -u [user] -p [database] > backup_prod_$(date +%Y%m%d_%H%M%S).sql
   ```
3. Execute migration em staging primeiro
4. SÓ depois execute em produção

### Backups Automáticos (Recomendado)

Configure backup diário automático:

**Windows Task Scheduler:**
- Tarefa: Executar `backend/scripts/backup_data.ts`
- Frequência: Diária às 2am
- Manter últimos 30 dias

**Linux Cron:**
```bash
0 2 * * * cd /path/to/backend && npx tsx scripts/backup_data.ts
```

---

## 📊 MONITORIZAÇÃO DE BACKUPS

### Verificar Último Backup

```bash
# Windows
Get-ChildItem "backend\backups\json\" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Linux/Mac
ls -lt backend/backups/json/ | head -n 1
```

### Alertas Recomendados

- ⚠️ Se último backup > 7 dias → Criar backup manual
- 🚨 Se pasta `backups/` vazia → CRÍTICO!

---

## 💾 SCRIPT DE BACKUP RÁPIDO

Criar ficheiro `backend/scripts/quick-backup.ts`:

```typescript
import { execSync } from 'child_process';

console.log('🔄 Iniciando backup rápido...');

// Backup de dados
execSync('npx tsx scripts/backup_data.ts', { stdio: 'inherit' });

// Backup de schema
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
execSync(`copy prisma\\schema.prisma backups\\schema.prisma.${timestamp}`, { stdio: 'inherit' });

console.log('✅ Backup concluído!');
```

Uso:
```bash
npm run quick-backup
```

---

## ⚠️ LEMBRETE FINAL

**ESTA REGRA EXISTE PORQUE JÁ PERDEMOS DADOS UMA VEZ!**

Não deixe isto acontecer novamente, especialmente em PRODUÇÃO! 🚨
