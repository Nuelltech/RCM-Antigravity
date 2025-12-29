# Database Performance Indices - Manual Installation Guide

## Quick Start (Recommended)

**Option A: Using the bash script (easiest)**
```bash
cd backend
chmod +x install-indices.sh
./install-indices.sh
```

**Option B: Direct SQL execution**
```bash
cd backend

# If you have mysql client installed
mysql $DATABASE_URL < install-indices.sql

# OR via Prisma (if script A failed)
npx prisma db execute --file install-indices.sql --schema prisma/schema.prisma
```

---

## Manual Verification

After installation, verify indices exist:

```sql
SHOW INDEX FROM produtos WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM receitas WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM vendas WHERE Key_name LIKE 'idx_%';
```

Expected output: 7 indices total
- produtos: 3 indices (tenant_list, search, codigo)
- receitas: 2 indices (tenant_list, search)
- vendas: 2 indices (dashboard, menu_item)

---

## Troubleshooting

### Error: "Duplicate key name"
**Solution**: Indices already exist from previous attempt. Safe to ignore or drop first:
```sql
ALTER TABLE produtos DROP INDEX idx_produtos_tenant_list;
-- Then re-run CREATE INDEX command
```

### Error: "mysql: command not found"
**Solution**: Use Prisma method:
```bash
npx prisma db execute --file install-indices.sql --schema prisma/schema.prisma
```

### Error: "Access denied"
**Solution**: Check DATABASE_URL has correct credentials:
```bash
echo $DATABASE_URL
# Should show: mysql://user:password@host:port/database
```

---

## Expected Performance Impact

| Metric | Current | After Indices | Improvement |
|--------|---------|---------------|-------------|
| p95 | 2.09s | ~500-800ms | **60-75%** |
| p99 | 2.28s | ~800ms-1.2s | **50-65%** |
| Products listing | Slow | Fast | **5-10x** |

---

## Rollback (If Needed)

To remove indices:
```sql
-- Produtos
ALTER TABLE produtos DROP INDEX idx_produtos_tenant_list;
ALTER TABLE produtos DROP INDEX idx_produtos_search;
ALTER TABLE produtos DROP INDEX idx_produtos_codigo;

-- Receitas
ALTER TABLE receitas DROP INDEX idx_receitas_tenant_list;
ALTER TABLE receitas DROP INDEX idx_receitas_search;

-- Vendas
ALTER TABLE vendas DROP INDEX idx_vendas_dashboard;
ALTER TABLE vendas DROP INDEX idx_vendas_menu_item;
```

---

## Next Steps After Installation

1. **Verify installation**: Run verification SQL above
2. **Re-run load test**: `k6 run ../load-testing/scripts/multi-tenant.js`
3. **Compare metrics**: Check if p95 < 500ms achieved
4. **Update documentation**: Note improvements in walkthrough.md
