#!/bin/bash
# Hostinger MySQL Backup Script
# Usage: ./backup-hostinger.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database credentials (from .env or hardcoded)
DB_HOST="${DB_HOST:-93.127.192.117}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-habimark_RCMADMIN}"
DB_NAME="${DB_NAME:-habimark_RCM}"
DB_PASS="${DB_PASS}"

# Backup directory
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/rcm_backup_${TIMESTAMP}.sql"

echo -e "${YELLOW}🗄️  RCM Database Backup Script${NC}"
echo "=================================="
echo ""

# Check if password is set
if [ -z "$DB_PASS" ]; then
    echo -e "${YELLOW}⚠️  Database password not set in environment${NC}"
    echo -n "Enter MySQL password for ${DB_USER}: "
    read -s DB_PASS
    echo ""
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 Creating backup directory...${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# Test connection first
echo -e "${YELLOW}🔌 Testing database connection...${NC}"
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME;" 2>/dev/null; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${RED}❌ Failed to connect to database${NC}"
    echo "Please check your credentials and try again."
    exit 1
fi

# Perform backup
echo -e "${YELLOW}💾 Creating backup...${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "Output: $BACKUP_FILE"
echo ""

mysqldump -h "$DB_HOST" \
          -P "$DB_PORT" \
          -u "$DB_USER" \
          -p"$DB_PASS" \
          --single-transaction \
          --routines \
          --triggers \
          --events \
          --add-drop-table \
          "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Get file size
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    # Compress backup
    echo -e "${YELLOW}📦 Compressing backup...${NC}"
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    
    echo ""
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 File: $(basename $COMPRESSED_FILE)"
    echo "📦 Original size: $FILE_SIZE"
    echo "🗜️  Compressed size: $COMPRESSED_SIZE"
    echo "📍 Location: $COMPRESSED_FILE"
    echo ""
    
    # List recent backups
    echo -e "${YELLOW}📚 Recent backups:${NC}"
    ls -lht "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -5 | awk '{print "  " $9 " (" $5 ")"}'
    
    # Cleanup old backups (keep last 10)
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up old backups (keeping last 10)...${NC}"
    ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
    
    echo ""
    echo -e "${GREEN}🎉 Backup process complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify backup: gunzip -c $COMPRESSED_FILE | head -20"
    echo "2. Upload to cloud storage (recommended)"
    echo "3. Proceed with deployment"
    
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "Please check error messages above."
    exit 1
fi
