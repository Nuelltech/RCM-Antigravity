#!/bin/bash

# Script de Rollback - Restaurar Backup
# Uso: ./rollback.sh <caminho_do_backup.sql>

set -e  # Exit on error

BACKUP_FILE=$1
DB_NAME="rcm_db"
DB_USER="root"
DB_PASS="root"
CONTAINER_NAME="rcm-mysql"

# Verificar argumentos
if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Erro: Especifique o ficheiro de backup"
  echo ""
  echo "Uso: ./rollback.sh <backup_file.sql>"
  echo ""
  echo "Backups disponíveis:"
  ls -1 ./backups/*.sql 2>/dev/null || echo "  (nenhum backup encontrado)"
  exit 1
fi

# Verificar se ficheiro existe
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Erro: Ficheiro não encontrado: $BACKUP_FILE"
  exit 1
fi

# Confirmação
echo "⚠️  ATENÇÃO: ROLLBACK DA BASE DE DADOS"
echo ""
echo "   Isto vai:"
echo "   1. Parar a aplicação"
echo "   2. APAGAR a base de dados atual"
echo "   3. Restaurar backup: $(basename $BACKUP_FILE)"
echo ""
read -p "Tem CERTEZA que deseja continuar? (digite 'yes'): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Cancelado pelo utilizador"
  exit 1
fi

echo ""
echo "🔄 Iniciando rollback..."

# 1. Parar aplicação
echo "1️⃣  A parar aplicação..."
cd ..
docker-compose down
echo "✅ Aplicação parada"

# 2. Dropar e recriar database
echo "2️⃣  A recriar base de dados..."
docker exec $CONTAINER_NAME mysql -u $DB_USER -p$DB_PASS -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "✅ Base de dados recriada"

# 3. Restaurar backup
echo "3️⃣  A restaurar backup..."
cat "$BACKUP_FILE" | docker exec -i $CONTAINER_NAME mysql -u $DB_USER -p$DB_PASS $DB_NAME

if [ $? -eq 0 ]; then
  echo "✅ Backup restaurado com sucesso"
else
  echo "❌ Erro ao restaurar backup!"
  exit 1
fi

# 4. Reiniciar aplicação
echo "4️⃣  A reiniciar aplicação..."
docker-compose up -d
echo "✅ Aplicação reiniciada"

echo ""
echo "✅ ROLLBACK COMPLETO!"
echo "   A aplicação está a arrancar. Aguarde alguns segundos..."
echo ""
echo "   Verificar logs:"
echo "   docker-compose logs -f backend"
