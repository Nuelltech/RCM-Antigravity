#!/bin/bash
# Database Performance Indices Installation Script
# Execute this in the backend directory with: bash install-indices.sh

echo "🔧 Installing Performance Indices for RCM Database"
echo "=================================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ ERROR: Must run from backend directory"
    echo "Run: cd backend && ./install-indices.sh"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found"
    echo "Create .env with DATABASE_URL first"
    exit 1
fi

echo "📊 Creating 7 performance indices via Prisma..."
echo "   (Prisma will read DATABASE_URL from .env automatically)"
echo ""

# Execute SQL via Prisma (reads .env automatically)
cat << 'EOF' | npx prisma db execute --stdin --schema prisma/schema.prisma
-- ========================================
-- PERFORMANCE INDICES FOR LOAD TESTING
-- ========================================

-- Produtos (3 indices)
CREATE INDEX idx_produtos_tenant_list ON produtos(tenant_id, createdAt);
CREATE INDEX idx_produtos_search ON produtos(tenant_id, nome);
CREATE INDEX idx_produtos_codigo ON produtos(tenant_id, codigo_interno);

-- Receitas (2 indices)  
CREATE INDEX idx_receitas_tenant_list ON receitas(tenant_id, createdAt);
CREATE INDEX idx_receitas_search ON receitas(tenant_id, nome);

-- Vendas (2 indices)
CREATE INDEX idx_vendas_dashboard ON vendas(tenant_id, data_venda);
CREATE INDEX idx_vendas_menu_item ON vendas(tenant_id, menu_item_id, data_venda);
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Indices installation complete!"
    echo ""
    echo "📊 Verifying indices..."
    
    # Verify indices were created
    npx prisma db execute --stdin --schema prisma/schema.prisma << 'VERIFY'
SHOW INDEX FROM produtos WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM receitas WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM vendas WHERE Key_name LIKE 'idx_%';
VERIFY

    echo ""
    echo "📊 Next steps:"
    echo "1. Re-run multi-tenant test: cd ../load-testing && k6 run scripts/multi-tenant.js"
    echo "2. Compare metrics with previous run"
    echo "3. Target: p95 < 500ms (currently 2.09s)"
else
    echo ""
    echo "❌ Error creating indices. Check error message above."
    exit 1
fi

