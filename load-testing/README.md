# Load Testing - RCM

Infraestrutura de testes de carga para o Restaurant Cost Manager usando k6.

## 📁 Estrutura

```
load-testing/
├── scripts/           # Scripts de teste k6
├── utils/            # Utilitários e helpers
├── data/             # Dados de teste (users, tokens)
├── results/          # Resultados dos testes
└── README.md
```

## 🚀 Quick Start

### 1. Preparar Dados de Teste

```bash
# Executar seed para popular base de dados
cd ../backend
npm run seed:load-testing
```

### 2. Executar Baseline Test

```bash
cd load-testing
k6 run scripts/baseline.js
```

### 3. Executar Outros Cenários

```bash
# Dashboard morning rush
k6 run scripts/dashboard-rush.js

# Recipe calculation heavy
k6 run scripts/recipe-calculation.js

# Multi-tenant concurrent
k6 run scripts/multi-tenant.js
```

## 📊 Resultados

Os resultados são guardados em `results/` com timestamp:
- `baseline-2024-12-23.json`
- `dashboard-rush-2024-12-23.json`

## ⚙️ Configuração

### Variáveis de Ambiente

Criar ficheiro `.env` na pasta `load-testing/`:

```env
BASE_URL=http://localhost:3001
TEST_TENANT_ID=tenant-test-pequeno
TEST_USER_EMAIL=user@loadtest.com
TEST_USER_PASSWORD=LoadTest123!
```

### Targets de Performance

| Métrica | Target | Max Aceitável |
|---------|--------|---------------|
| API p95 | < 200ms | < 500ms |
| API p99 | < 500ms | < 1s |
| Error Rate | < 0.1% | < 1% |

## 📝 Cenários Disponíveis

### 1. Baseline Test
**Objetivo**: Estabelecer métricas de referência  
**VUs**: 1  
**Duração**: 5 minutos

### 2. Dashboard Rush
**Objetivo**: Simular login matinal simultâneo  
**VUs**: 20  
**Duração**: 10 minutos

### 3. Recipe Calculation
**Objetivo**: Testar queries complexas  
**VUs**: 10  
**Duração**: 15 minutos

### 4. Search Heavy
**Objetivo**: Stress em pesquisas  
**VUs**: 15  
**Duração**: 10 minutos

### 5. Multi-Tenant
**Objetivo**: Validar isolamento entre tenants  
**VUs**: 50 (10 por tenant)  
**Duração**: 20 minutos

## 🔍 Monitoring

Durante os testes, monitorizar:

```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'rcm_db';

-- Slowest queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 20;
```

## 📈 Análise de Resultados

Após cada teste:
1. Verificar `http_req_duration` (p95, p99)
2. Validar `http_req_failed` < 1%
3. Identificar queries lentas
4. Documentar bottlenecks
