#!/bin/bash
# =====================================================
# Migration Script: Add Multi-Tenant User Support
# Version: 1.0
# Date: 2025-12-17
# Description: Add user_tenants pivot table for many-to-many relationship
# =====================================================

set -e  # Exit on error

# Configuration
DB_NAME="${DB_NAME:-rcm_db}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-root}"
DB_HOST="${DB_HOST:-localhost}"
CONTAINER_NAME="${CONTAINER_NAME:-rcm-antigravity-db-1}"

# Detect environment
if command -v docker &> /dev/null && docker ps | grep -q $CONTAINER_NAME; then
    echo "🐳 Docker environment detected"
    USE_DOCKER=true
else
    echo "💻 Direct MySQL connection"
    USE_DOCKER=false
fi

echo "📋 Migration: Add user_tenants table"
echo "   Database: $DB_NAME"
echo ""

# Function to execute SQL
execute_sql() {
    local sql="$1"
    if [ "$USE_DOCKER" = true ]; then
        echo "$sql" | docker exec -i $CONTAINER_NAME mysql -u $DB_USER -p$DB_PASS $DB_NAME 2>&1 | grep -v "Using a password"
    else
        echo "$sql" | mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME
    fi
}

# Step 1: Create user_tenants table
echo "1️⃣  Creating user_tenants table..."
execute_sql "
CREATE TABLE IF NOT EXISTS \`user_tenants\` (
  \`user_id\` INT NOT NULL,
  \`tenant_id\` INT NOT NULL,
  \`role\` VARCHAR(191) NOT NULL COMMENT 'User role in this specific tenant',
  \`ativo\` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Is user active in this tenant',
  \`invited_by\` INT NULL COMMENT 'User ID who sent the invitation',
  \`invited_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`activated_at\` DATETIME(3) NULL COMMENT 'When user accepted invitation',
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (\`user_id\`, \`tenant_id\`),
  
  INDEX \`idx_tenant_active\` (\`tenant_id\`, \`ativo\`),
  INDEX \`idx_user_active\` (\`user_id\`, \`ativo\`),
  
  CONSTRAINT \`user_tenants_user_id_fkey\` 
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT \`user_tenants_tenant_id_fkey\` 
    FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT \`user_tenants_invited_by_fkey\` 
    FOREIGN KEY (\`invited_by\`) REFERENCES \`users\`(\`id\`) 
    ON DELETE SET NULL ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Many-to-many relationship between users and tenants';
"
echo "✅ Table created"

# Step 2: Populate with existing data
echo "2️⃣  Populating with existing user-tenant relationships..."
execute_sql "
INSERT INTO \`user_tenants\` 
  (\`user_id\`, \`tenant_id\`, \`role\`, \`ativo\`, \`activated_at\`, \`createdAt\`, \`updatedAt\`)
SELECT 
  \`id\` as user_id,
  \`tenant_id\`,
  \`role\`,
  \`ativo\`,
  \`createdAt\` as activated_at,
  \`createdAt\`,
  \`updatedAt\`
FROM \`users\`
WHERE NOT EXISTS (
  SELECT 1 FROM \`user_tenants\` ut 
  WHERE ut.user_id = users.id AND ut.tenant_id = users.tenant_id
);
"
echo "✅ Data migrated"

# Step 3: Verification
echo "3️⃣  Verifying migration..."
execute_sql "
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM user_tenants) as user_tenant_relations,
  (SELECT COUNT(DISTINCT user_id) FROM user_tenants) as unique_users
;
"

echo ""
echo "✅ Migration completed successfully!"
echo "   You can now use multi-tenant user relationships."
