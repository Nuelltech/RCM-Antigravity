#!/bin/bash

# Script de Backup da Base de Dados
# Uso: ./backup-database.sh

set -e  # Exit on error

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_NAME="rcm_db"
DB_USER="root"
DB_PASS="root"
CONTAINER_NAME="${1:-rcm-antigravity-db-1}"  # Nome do container no docker-compose

echo "🔄 Iniciando backup da base de dados..."

# Criar diretório de backups
mkdir -p $BACKUP_DIR

# Backup completo (schema + data)
echo "📦 A criar backup completo..."
docker exec $CONTAINER_NAME mysqldump \
  -u $DB_USER \
  -p$DB_PASS \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  $DB_NAME > $BACKUP_DIR/backup_${TIMESTAMP}.sql

# Verificar se backup foi criado
if [ -f "$BACKUP_DIR/backup_${TIMESTAMP}.sql" ]; then
  FILE_SIZE=$(du -h "$BACKUP_DIR/backup_${TIMESTAMP}.sql" | cut -f1)
  echo "✅ Backup criado com sucesso!"
  echo "   Ficheiro: backup_${TIMESTAMP}.sql"
  echo "   Tamanho: $FILE_SIZE"
  echo "   Localização: $BACKUP_DIR/"
  
  # Guardar referência ao último backup
  echo "$BACKUP_DIR/backup_${TIMESTAMP}.sql" > $BACKUP_DIR/last_backup.txt
else
  echo "❌ Erro ao criar backup!"
  exit 1
fi

# Criar backup comprimido (opcional)
echo "📦 A comprimir backup..."
gzip -k $BACKUP_DIR/backup_${TIMESTAMP}.sql
echo "✅ Backup comprimido: backup_${TIMESTAMP}.sql.gz"

# Listar backups existentes
echo ""
echo "📋 Backups disponíveis:"
ls -lh $BACKUP_DIR/*.sql | tail -5

echo ""
echo "✅ Backup completo! Pode restaurar com:"
echo "   ./rollback.sh $BACKUP_DIR/backup_${TIMESTAMP}.sql"
