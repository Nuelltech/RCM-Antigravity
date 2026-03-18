# Especificações Financeiras: Alertas de Erosão vs Hemorragia

Este documento consolida as regras de negócio e fórmulas matemáticas para as duas principais ferramentas de análise de rentabilidade do RCM.

## A Regra de Ouro da Separação Temporal

- **Alertas de Erosão = O Futuro:** Baseia-se no custo **Atual** (Hoje) e projeta perdas futuras usando o volume de vendas passado como base de previsão. Foca-se em **Ação**.
- **Hemorragia = O Passado:** Baseia-se no custo **Histórico** (no momento da venda) comparando com o que devia ter sido. Foca-se em **Análise e Controlo**.

---

## 1. Página "Alertas de Erosão" (O Radar)

Esta página é gerada dinamicamente com base numa "fotografia" diária dos custos face aos últimos 30 dias. Apenas itens com **Aumento de Custo** E **Vendas no último mês** devem gerar alertas.

### Variáveis Necessárias por Item (Receita/Artigo POS):
- **$P_{venda}$**: Preço de Venda atual (sem IVA). *Ex: 15,00€*
- **$C_{hoje}$**: Custo Técnico da Receita calculado **hoje** (com as últimas atualizações de preço de fornecedores). *Ex: 4,00€*
- **$C_{base}$**: Custo da Receita no início do período de referência (ex: há 30 dias). *Ex: 3,00€*
- **$V_{hist}$**: Volume de vendas histórico (Quantidade vendida nos últimos 30 dias). *Ex: 500 unid.*
- **$IVA$**: Taxa de IVA aplicável. *Ex: 13%*

### Os Cálculos (Motor da Página)

**A. Variação de Custo ($\Delta C$)**
Diferença entre o custo hoje e o custo base. Se for $\le 0$, ignorar (não há erosão).
> $\Delta C = C_{hoje} - C_{base}$
> *Exemplo: 4,00€ - 3,00€ = +1,00€*

**B. Margem Atual ($M_{atual}$)**
Lucro bruto em valor absoluto por prato com os custos de hoje.
> $M_{atual} = P_{venda} - C_{hoje}$
> *Exemplo: 15,00€ - 4,00€ = 11,00€/prato*

**C. Projeção de Perda / Risco Financeiro ($Perda_{proj}$)**
Dinheiro que se vai deixar na mesa nos próximos 30 dias se vendermos o mesmo volume mas sofrermos este novo custo. **(Este é o número que dói)**.
> $Perda_{proj} = \Delta C \times V_{hist}$
> *Exemplo: 1,00€ \times 500 = 500,00€ de perda projetada.*

**D. Esforço de Compensação (Pratos Extra)**
Para recuperar a $Perda_{proj}$ (500€), quantos pratos a mais temos de vender com a $M_{atual}$ (11€) só para empatar com o mês passado?
> $Pratos_{extra} = \frac{Perda_{proj}}{M_{atual}}$ *(arredondado para cima)*
> *Exemplo: 500€ / 11,00€ = 45,45 \rightarrow 46 pratos extra.*

**E. Sugestão de Novo Preço ($P_{sugerido}$)**
Qual deveria ser o novo preço de menu para absorver o aumento e manter a margem?
* **Manter Margem Absoluta (€):** $P_{sugerido} = (P_{venda} + \Delta C) \times (1 + IVA)$
* **Manter CMV Alvo (%):** $P_{sugerido} = (\frac{C_{hoje}}{CMV_{alvo}}) \times (1 + IVA)$

### UI/UX da Página "Alertas de Erosão":
O dashboard mostrará uma lista de "Cards" ordenados pela maior $Perda_{proj}$.
Cada Card mostra:
1. **Identificação:** Nome do Prato, $V_{hist}$ (Vol. Vendas 30d).
2. **O Problema:** Gráfico simples a mostrar o custo a subir de $C_{base}$ para $C_{hoje}$.
3. **O Risco:** "Perda projetada para os próximos 30 dias: **-500,00€**".
4. **Resoluções Recomendadas:**
   - Reação de Vendas: "Terá de vender mais **46 pratos** para compensar este aumento."
   - Reação de Preço: "O seu preço atual é 15,00€ (S/IVA). Sugerimos atualizar para **16,00€**."

---

## 2. Página "Hemorragia Financeira" (A Autópsia)

Esta página analisa um mês ou período já fechado. Serve para descobrir onde o dinheiro "desapareceu" devido a desvios entre a Teoria e a Prática.

### Variáveis Necessárias por Item (Agregado ao Mês X):
- **$Faturação$**: Receita total sem IVA gerada pelo artigo nesse mês.
- **$Custo_{real}$**: O custo real dos ingredientes consumidos (idealmente vindo de compras/inventário ou média ponderada de custo histórico durante aquele mês).
- **$CMV_{alvo}$**: A % de Food Cost que o gestor definiu como aceitável para este prato (Ex: 25%).
- **$Custo_{teorico}$**: O custo técnico da ficha técnica com os preços **daquela data**.

### Os Cálculos

**A. Desvio Financeiro por CMV (Hemorragia Principal)**
Quanto gastámos a mais face ao objetivo que definimos?
> $Hemorragia_{cmv} = Custo_{real} - (Faturação \times CMV_{alvo})$
> *Exemplo: Faturou 7500€. O alvo era 25% (1875€). Gastou efetivamente 2400€ a fazer esses pratos.*
> *Hemorragia = 2400€ - 1875€ = **-525€***

**B. Desvio de Operação (Teórico vs Real)**
Avalia se a equipa está a cumprir a ficha técnica (desperdícios, etc).
> $Hemorragia_{op} = Custo_{real} - Custo_{teorico}$
> *Exemplo: Gastou 2400€ de real. Mas a ficha técnica vezes os pratos vendidos daria 2100€ num mundo perfeito.*
> *Hemorragia = 2400€ - 2100€ = **-300€** (Dinheiro deitado ao lixo na cozinha)*

*(A página de hemorragia existirá principalmente para mostrar estes valores consolidados no fim de cada ciclo).*
