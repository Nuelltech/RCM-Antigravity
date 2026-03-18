# Backup & Validation Scripts

Este diretório contém scripts para backup de base de dados e validação pré-deployment.

## 📦 Backup Scripts

### Linux/Mac: `backup-hostinger.sh`

**Criar backup da base de dados Hostinger**:

```bash
# Opção 1: Com password no prompt
./scripts/backup-hostinger.sh

# Opção 2: Com password em variável de ambiente
export DB_PASS="sua_password"
./scripts/backup-hostinger.sh
```

**Features**:
- ✅ Testa conexão antes de backup
- ✅ Compressão automática (gzip)
- ✅ Mantém últimos 10 backups
- ✅ Mostra tamanho do ficheiro
- ✅ Inclui routines, triggers, events

**Output**: `backups/rcm_backup_YYYYMMDD_HHMMSS.sql.gz`

### Windows: `backup-hostinger.ps1`

**Executar no PowerShell**:

```powershell
# Opção 1: Com password no prompt
.\scripts\backup-hostinger.ps1

# Opção 2: Com parâmetros
.\scripts\backup-hostinger.ps1 -DbPassword "sua_password"
```

**Requisitos**:
- MySQL Client Tools instaladas
- OU Git Bash (use script .sh)

---

## ✅ Validation Script

### `validate-deployment.sh`

**Valida tudo antes do deployment**:

```bash
./scripts/validate-deployment.sh
```

**Testes executados**:

1. **MySQL Connection** ✅
   - Testa conexão ao Hostinger
   - Verifica tabelas críticas existem
   - Conta número de tabelas

2. **Redis Connection** ✅
   - Testa conexão ao Redis
   - Mostra versão e memória
   - **CRÍTICO**: Sem isto, caching não funciona!

3. **Environment Variables** ✅
   - Verifica `DATABASE_URL`
   - Verifica `REDIS_URL`
   - Verifica `JWT_SECRET`

4. **Git Status** ✅
   - Verifica branch atual
   - Verifica uncommitted changes
   - Mostra último commit

5. **Database Backup** ✅
   - Verifica se existe backup recente (<24h)
   - **Aviso se não existir!**

**Resultados**:
- ✅ Verde: READY FOR DEPLOYMENT
- ⚠️ Amarelo: POSSIBLE WITH CAUTION
- ❌ Vermelho: NOT READY

---

## 🚀 Workflow Recomendado

### Antes do Deployment

```bash
# 1. Validar credenciais e ambiente
./scripts/validate-deployment.sh

# 2. Se tudo OK, criar backup
./scripts/backup-hostinger.sh

# 3. Verificar backup criado
ls -lh backups/

# 4. Fazer deployment
git push origin main
```

### Se Validation Falhar

**Erro: MySQL connection failed**
- Verificar credenciais em `backend/.env`
- Testar manualmente: `mysql -h 93.127.192.117 -u habimark_RCMADMIN -p`

**Erro: Redis connection failed**
- Verificar Redis está a correr
- Testar: `redis-cli -h 93.127.192.117 ping`
- **Deployment funciona mas SEM caching!**

**Erro: Missing environment variables**
- Adicionar no Render Dashboard
- Variáveis críticas: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`

---

## 📁 Backup Management

### Verificar Backups

```bash
# Listar todos os backups
ls -lht backups/

# Ver conteúdo do backup (primeiras 20 linhas)
gunzip -c backups/rcm_backup_*.sql.gz | head -20
```

### Restaurar Backup

**⚠️ CUIDADO: Isto sobrescreve a base de dados!**

```bash
# Descomprimir
gunzip backups/rcm_backup_YYYYMMDD_HHMMSS.sql.gz

# Restaurar
mysql -h 93.127.192.117 -u habimark_RCMADMIN -p habimark_RCM < backups/rcm_backup_YYYYMMDD_HHMMSS.sql
```

### Upload para Cloud

**Recomendado: guardar backups em cloud storage**

```bash
# Google Drive, Dropbox, AWS S3, etc.
# Exemplo com SCP
scp backups/rcm_backup_*.sql.gz user@backup-server:/backups/
```

---

## 🔧 Troubleshooting

### "mysqldump: command not found"

**Linux/Mac**:
```bash
# Ubuntu/Debian
sudo apt-get install mysql-client

# Mac
brew install mysql-client
```

**Windows**:
- Instalar MySQL: https://dev.mysql.com/downloads/mysql/
- OU usar Git Bash com script .sh

### "redis-cli: command not found"

```bash
# Ubuntu/Debian
sudo apt-get install redis-tools

# Mac
brew install redis

# Windows
# Download from: https://github.com/microsoftarchive/redis/releases
```

### Script permission denied

```bash
chmod +x scripts/*.sh
```

---

## 📊 Script Exit Codes

**validate-deployment.sh**:
- `0`: Ready for deployment
- `1`: Deployment possible with caution
- `2`: Not ready - fix issues first

**backup-hostinger.sh**:
- `0`: Backup successful
- `1`: Backup failed

---

**Última atualização**: 2025-12-29
