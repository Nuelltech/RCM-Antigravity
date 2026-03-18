#!/bin/bash
# Pre-Deployment Validation Script
# Validates database credentials, Redis connection, and environment before deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔍 Pre-Deployment Validation         ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Load environment variables from backend/.env if exists
if [ -f "backend/.env" ]; then
    echo -e "${YELLOW}📄 Loading environment from backend/.env${NC}"
    export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Database credentials
DB_HOST="${DB_HOST:-93.127.192.117}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-habimark_RCMADMIN}"
DB_NAME="${DB_NAME:-habimark_RCM}"
DB_PASS="${DATABASE_URL}"  # Use full connection string or password

# Redis credentials
REDIS_HOST="${REDIS_HOST:-93.127.192.117}"
REDIS_PORT="${REDIS_PORT:-6379}"

# ========================================
# Test 1: MySQL Connection
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 1: MySQL Database Connection${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Extract password from DATABASE_URL if it's a connection string
if [[ $DB_PASS == mysql://* ]]; then
    # Extract password from mysql://user:password@host:port/database format
    DB_PASS=$(echo $DB_PASS | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
fi

# Test connection
if [ -z "$DB_PASS" ]; then
    echo -e "${YELLOW}⚠️  No password found, prompting...${NC}"
    echo -n "Enter MySQL password: "
    read -s DB_PASS
    echo ""
fi

echo -n "Testing connection... "
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
    
    # Get table count
    TABLE_COUNT=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -se "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")
    echo -e "${GREEN}   Tables in database: $TABLE_COUNT${NC}"
    
    # Check critical tables exist
    echo -n "   Checking critical tables... "
    CRITICAL_TABLES=("User" "Tenant" "Produto" "Receita" "MenuItem" "Venda")
    MISSING_TABLES=()
    
    for table in "${CRITICAL_TABLES[@]}"; do
        if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -D "$DB_NAME" -se "SHOW TABLES LIKE '$table';" &>/dev/null | grep -q "$table"; then
            MISSING_TABLES+=("$table")
        fi
    done
    
    if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${YELLOW}⚠️  Missing: ${MISSING_TABLES[*]}${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ FAILED${NC}"
    echo -e "${RED}   Cannot connect to database${NC}"
    ((FAILED++))
fi

echo ""

# ========================================
# Test 2: Redis Connection
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 2: Redis Cache Connection${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Host: $REDIS_HOST:$REDIS_PORT"
echo ""

echo -n "Testing connection... "
if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &>/dev/null; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((PASSED++))
    
    # Get Redis info
    REDIS_VERSION=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
    REDIS_MEMORY=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    REDIS_KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DBSIZE | cut -d: -f2 | tr -d ' \r')
    
    echo -e "${GREEN}   Version: $REDIS_VERSION${NC}"
    echo -e "${GREEN}   Memory used: $REDIS_MEMORY${NC}"
    echo -e "${GREEN}   Keys: $REDIS_KEYS${NC}"
else
    echo -e "${RED}❌ FAILED${NC}"
    echo -e "${RED}   Cannot connect to Redis${NC}"
    echo -e "${YELLOW}   ⚠️  Deployment will work but caching DISABLED!${NC}"
    ((FAILED++))
    ((WARNINGS++))
fi

echo ""

# ========================================
# Test 3: Environment Variables
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 3: Environment Variables${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "REDIS_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    echo -n "$var... "
    if [ -n "${!var}" ]; then
        # Show first/last 4 chars only for security
        VAL="${!var}"
        if [ ${#VAL} -gt 20 ]; then
            DISPLAY_VAL="${VAL:0:4}...${VAL: -4}"
        else
            DISPLAY_VAL="***"
        fi
        echo -e "${GREEN}✅ ($DISPLAY_VAL)${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ MISSING${NC}"
        MISSING_VARS+=("$var")
        ((FAILED++))
    fi
done

echo ""

# ========================================
# Test 4: Git Status
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 4: Git Repository${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d ".git" ]; then
    CURRENT_BRANCH=$(git branch --show-current)
    UNCOMMITTED=$(git status --porcelain | wc -l)
    LAST_COMMIT=$(git log -1 --pretty=format:"%h - %s" 2>/dev/null)
    
    echo -e "Branch: ${GREEN}$CURRENT_BRANCH${NC}"
    echo -e "Last commit: ${GREEN}$LAST_COMMIT${NC}"
    
    echo -n "Uncommitted changes... "
    if [ "$UNCOMMITTED" -eq 0 ]; then
        echo -e "${GREEN}✅ Clean${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  $UNCOMMITTED files${NC}"
        echo -e "${YELLOW}   Recommendation: Commit changes before deployment${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ Not a git repository${NC}"
    ((FAILED++))
fi

echo ""

# ========================================
# Test 5: Backup Exists
# ========================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 5: Database Backup${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -n "Checking for recent backups... "
if [ -d "backups" ]; then
    LATEST_BACKUP=$(ls -t backups/*.sql* 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_AGE=$(find "$LATEST_BACKUP" -mtime -1)  # Less than 1 day old
        if [ -n "$BACKUP_AGE" ]; then
            echo -e "${GREEN}✅ Recent backup found${NC}"
            echo -e "${GREEN}   $(basename $LATEST_BACKUP)${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠️  Backup is old (>24h)${NC}"
            echo -e "${YELLOW}   Recommendation: Create fresh backup${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠️  No backups found${NC}"
        echo -e "${YELLOW}   CRITICAL: Create backup before deployment!${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  No backup directory${NC}"
    echo -e "${YELLOW}   CRITICAL: Create backup before deployment!${NC}"
    ((WARNINGS++))
fi

echo ""

# ========================================
# Summary
# ========================================
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 Validation Summary                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}✅ Passed: $PASSED${NC}"
echo -e "  ${RED}❌ Failed: $FAILED${NC}"
echo -e "  ${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo ""

# Final verdict
if [ $FAILED -eq 0 ] && [ $WARNINGS -lt 2 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ READY FOR DEPLOYMENT               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review changes: git log -5 --oneline"
    echo "2. Create backup: ./scripts/backup-hostinger.sh"
    echo "3. Deploy backend: git push (triggers Render)"
    echo "4. Deploy frontend: git push (triggers Vercel)"
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  DEPLOYMENT POSSIBLE WITH CAUTION  ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Recommendations:"
    [ $WARNINGS -gt 0 ] && echo "- Address warnings above before deploying"
    echo "- Create fresh database backup"
    echo "- Test in staging first if possible"
    exit 1
else
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ NOT READY FOR DEPLOYMENT           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Critical issues to fix:"
    [ $FAILED -gt 0 ] && echo "- Fix failed tests above"
    [ ${#MISSING_VARS[@]} -gt 0 ] && echo "- Set missing environment variables: ${MISSING_VARS[*]}"
    echo ""
    echo "Run this script again after fixing issues."
    exit 2
fi
