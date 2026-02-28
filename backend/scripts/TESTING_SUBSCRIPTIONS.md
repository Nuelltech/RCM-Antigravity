# Testando Mudanças de Plano de Subscrição

## Opção 1: Via Script (Recomendado)

Execute o script para mudar o plano:

```bash
cd backend
npx ts-node scripts/change-subscription-plan.ts <tenant_id> <plan_name>
```

**Exemplo:**
```bash
# Mudar para Base Plan
npx ts-node scripts/change-subscription-plan.ts 1 base

# Mudar para Standard Plan
npx ts-node scripts/change-subscription-plan.ts 1 standard

# Mudar para Plus Plan
npx ts-node scripts/change-subscription-plan.ts 1 plus
```

## Opção 2: Via SQL Direto

Se preferir usar SQL direto:

```sql
-- 1. Ver planos disponíveis
SELECT id, name, display_name, price_monthly FROM subscription_plans;

-- 2. Ver subscrição atual
SELECT ts.*, sp.display_name 
FROM tenant_subscriptions ts
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE ts.tenant_id = 1;

-- 3. Mudar para Base Plan (id = 1)
UPDATE tenant_subscriptions 
SET plan_id = 1, updated_at = NOW() 
WHERE tenant_id = 1;

-- 4. Mudar para Standard Plan (id = 2)
UPDATE tenant_subscriptions 
SET plan_id = 2, updated_at = NOW() 
WHERE tenant_id = 1;

-- 5. Mudar para Plus Plan (id = 3)
UPDATE tenant_subscriptions 
SET plan_id = 3, updated_at = NOW() 
WHERE tenant_id = 1;
```

## O que acontece ao mudar de plano?

### No Frontend:
1. **Refresh a página** `/settings/subscription`
2. O **Plano Atual** será atualizado
3. As **Features Incluídas** vão mudar conforme o novo plano
4. O botão do plano atual ficará com "Current Plan"

### Features por Plano:

**Base Plan (€49/mês):**
- ✓ Dashboard & Analytics
- ✓ Products & Recipes
- ✓ Invoice Management

**Standard Plan (€99/mês):**
- ✓ Dashboard & Analytics
- ✓ Products & Recipes
- ✓ Invoice Management
- ✓ Sales Tracking

**Plus Plan (€149/mês):**
- ✓ Dashboard & Analytics
- ✓ Products & Recipes
- ✓ Invoice Management
- ✓ Sales Tracking
- ✓ Inventory Management

## FeatureGuard em Ação

Depois de mudar o plano, teste o `FeatureGuard`:

```tsx
// Exemplo: Se mudar para Base Plan, esta feature ficará bloqueada
<FeatureGuard feature="SALES_TRACKING">
  <SalesTrackingComponent />
</FeatureGuard>
```

O componente `UpgradePrompt` aparecerá automaticamente se o utilizador não tiver acesso.

## Cache

O sistema usa **cache de 15 minutos** para features. Se quiser ver mudanças imediatamente:
- Refresh completo da página (Ctrl+F5)
- Ou espere 15 minutos para cache expirar
