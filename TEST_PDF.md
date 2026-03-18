# 🚀 Como Testar os PDFs - Guia Rápido

## 1️⃣ Instalar Dependências

**No terminal do Codespaces:**

```bash
cd app/frontend
npm install @react-pdf/renderer date-fns
```

> ⏱️ Tempo: ~30 segundos

---

## 2️⃣ Iniciar Servidor (se não estiver a correr)

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd app/frontend
npm run dev
```

---

## 3️⃣ Testar Dashboard PDF

1. Abrir http://localhost:3000/dashboard
2. Fazer login (se necessário)
3. No topo da página, vai ver:
   - **Date Range Selector**: Dois campos de data
   - **Botão "Exportar"** (dropdown)

4. Selecionar intervalo de datas desejado
5. Clicar em "Exportar" → "PDF"
6. PDF vai ser gerado e fazer download automático

**Nome do ficheiro:** `dashboard-2025-12-10-2026-01-09.pdf`

---

## 4️⃣ O que Vai Ver no PDF do Dashboard

```
┌──────────────────────────────────────────┐
│ RCM                [Nome do Restaurante] │
│ Restaurant Cost Manager                  │
├──────────────────────────────────────────┤
│      RELATÓRIO DASHBOARD                 │
│ Período: 10/12/2025 até 09/01/2026       │
├──────────────────────────────────────────┤
│                                          │
│ INDICADORES PRINCIPAIS                   │
│ ┌──────────┬──────────┬──────────┐      │
│ │ Vendas   │ CMV      │ CMV %    │      │
│ │ €12,450  │ €3,890   │ 31.2%    │      │
│ └──────────┴──────────┴──────────┘      │
│                                          │
│ TOP RECEITAS/ITEMS                       │
│ [Tabela com top 5]                       │
│                                          │
│ ALERTAS ATIVOS                           │
│ ⚠️ [Lista de alertas]                   │
│                                          │
│ ANÁLISE DO PERÍODO                       │
│ • Vendas totais: €...                    │
│ • CMV manteve-se em...                   │
├──────────────────────────────────────────┤
│ Gerado por RCM     Página 1 de 1        │
│ www.rcm-app.com                          │
└──────────────────────────────────────────┘
```

---

## 5️⃣ Testar Receita PDF (Opcional)

**NOTA:** Para testar receitas, preciso primeiro adicionar o botão à página de receitas.

Quer que adicione agora? (Responda "sim" e eu faço)

---

## 🐛 Problemas Comuns

### "Exportar" button não aparece
**Causa:** Dependências não instaladas  
**Solução:** `npm install @react-pdf/renderer date-fns`

### "Loading..." infinito
**Causa:** Componentes PDF não carregaram  
**Solução:** Refrescar página (F5)

### PDF vazio ou com erro
**Causa:** Dados não carregados do backend  
**Solução:** Verificar se backend está a correr e stats foram carregados

### Erros TypeScript no IDE
**Causa:** Dependências não instaladas  
**Solução:** Normal - desaparecem após `npm install`

---

## ✅ Checklist

- [ ] Dependências instaladas (`npm install`)
- [ ] Backend a correr (`npm run dev` em `backend`)
- [ ] Frontend a correr (`npm run dev` em `app/frontend`)
- [ ] Dashboard aberto (http://localhost:3000/dashboard)
- [ ] Login feito
- [ ] Botão "Exportar" visível no topo
- [ ] Date range selecionado
- [ ] Clicado em "Exportar" → "PDF"
- [ ] PDF gerado e descarregado
- [ ] PDF aberto e verificado

---

## 💬 Feedback

Depois de testar, por favor confirme:

1. ✅ PDF foi gerado com sucesso?
2. 📊 KPIs aparecem corretamente?
3. 🏢 Nome do restaurante está correto?
4. 📅 Date range aparece no PDF?
5. 🎨 Cores e layout estão OK?
6. 📄 Header e footer aparecem?

**O que quer ajustar?** (cores, layout, conteúdo, etc.)
