import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Criterio Ocupacao, Estrutura e Regras de Decisão...");

  // 1. Ocupacao
  const criteriosOcupacao = [
    { percentagem_min: 0, percentagem_max: 30, nivel: "Crítico", cor_ux: "#ef4444", descricao_pratica: "Problema grave de procura" },
    { percentagem_min: 30, percentagem_max: 50, nivel: "Fraco", cor_ux: "#f97316", descricao_pratica: "Não cobre custos fixos na maioria dos casos" },
    { percentagem_min: 50, percentagem_max: 65, nivel: "Médio", cor_ux: "#eab308", descricao_pratica: "Sobrevive, mas margem apertada" },
    { percentagem_min: 65, percentagem_max: 80, nivel: "Bom", cor_ux: "#84cc16", descricao_pratica: "Operação saudável" },
    { percentagem_min: 80, percentagem_max: 90, nivel: "Muito Bom", cor_ux: "#22c55e", descricao_pratica: "Alta eficiência" },
    { percentagem_min: 90, percentagem_max: 200, nivel: "Excelente", cor_ux: "#3b82f6", descricao_pratica: "Casa cheia" }
  ];

  await prisma.criterioOcupacao.deleteMany();
  for (const c of criteriosOcupacao) await prisma.criterioOcupacao.create({ data: c });

  // 2. Estrutura
  const criteriosEstrutura = [
    { percentagem_min: 0, percentagem_max: 30, nivel: "Eficiente", cor_ux: "#22c55e", descricao_pratica: "Estrutura muito leve" },
    { percentagem_min: 30, percentagem_max: 35, nivel: "Controlado", cor_ux: "#84cc16", descricao_pratica: "Operação eficiente" },
    { percentagem_min: 35, percentagem_max: 40, nivel: "Aceitável", cor_ux: "#eab308", descricao_pratica: "Pressão na margem" },
    { percentagem_min: 40, percentagem_max: 45, nivel: "Alto", cor_ux: "#f97316", descricao_pratica: "Estrutura pesada" },
    { percentagem_min: 45, percentagem_max: 55, nivel: "Crítico", cor_ux: "#ef4444", descricao_pratica: "Negócio frágil" },
    { percentagem_min: 55, percentagem_max: 999, nivel: "Insustentável", cor_ux: "#7f1d1d", descricao_pratica: "Pagar para trabalhar" }
  ];

  await prisma.criterioEstrutura.deleteMany();
  for (const c of criteriosEstrutura) await prisma.criterioEstrutura.create({ data: c });

  // 3. Regras de Decisão
  const regras = [
    // --- LUCRO POSITIVO ---
    // A. CMV Controlado
    { lucro: true, cmv_ok: true, ocupacao: "Bom", estrutura: "Eficiente", msg: "Tudo perfeito! 🚀 Tem casa cheia e custos controlados. O negócio está a dar o lucro máximo possível.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Muito Bom", estrutura: "Eficiente", msg: "Tudo perfeito! 🚀 Tem casa cheia e custos controlados. O negócio está a dar o lucro máximo possível.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Excelente", estrutura: "Eficiente", msg: "Tudo perfeito! 🚀 Tem casa cheia e custos controlados. O negócio está a dar o lucro máximo possível.", p: 10 },
    
    { lucro: true, cmv_ok: true, ocupacao: "Bom", estrutura: "Controlado", msg: "Tudo perfeito! 🚀 Tem casa cheia e custos controlados. O negócio está a dar o lucro máximo possível.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Muito Bom", estrutura: "Controlado", msg: "Tudo perfeito! 🚀 Tem casa cheia e custos controlados. O negócio está a dar o lucro máximo possível.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Excelente", estrutura: "Controlado", msg: "Tudo perfeito! 🚀 Tem casa cheia e custos controlados. O negócio está a dar o lucro máximo possível.", p: 10 },

    { lucro: true, cmv_ok: true, ocupacao: "Crítico", estrutura: "Eficiente", msg: "Consegue ter lucro porque controla bem os custos, mas a sala está vazia. O foco agora é marketing para atrair pessoas.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Fraco", estrutura: "Eficiente", msg: "Consegue ter lucro porque controla bem os custos, mas a sala está vazia. O foco agora é marketing para atrair pessoas.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Médio", estrutura: "Eficiente", msg: "Consegue ter lucro porque controla bem os custos, mas a sala está vazia. O foco agora é marketing para atrair pessoas.", p: 10 },

    { lucro: true, cmv_ok: true, ocupacao: "Bom", estrutura: "Alto", msg: "Lucra e tem clientes, mas atenção: as despesas mensais (rendas, salários fixos) estão altas. Tente baixar custos fixos.", p: 10 },
    { lucro: true, cmv_ok: true, ocupacao: "Excelente", estrutura: "Crítico", msg: "Lucra e tem clientes, mas atenção: as despesas mensais (rendas, salários fixos) estão altas. Tente baixar custos fixos.", p: 10 },

    { lucro: true, cmv_ok: true, ocupacao: "Crítico", estrutura: "Crítico", msg: "Tem lucro por sorte! A comida está bem gerida, mas a sala está vazia demais para pagar as suas despesas altíssimas.", p: 10 },

    // B. CMV Mau
    { lucro: true, cmv_ok: false, ocupacao: "Bom", estrutura: "Eficiente", msg: "Vende muito e gere bem a sua equipa, mas perde muito dinheiro na roda dos pratos (desperdícios ou compras caras). Reveja preçário.", p: 10 },
    { lucro: true, cmv_ok: false, ocupacao: "Crítico", estrutura: "Eficiente", msg: "Ganha muito pouco. A casa tem poucos clientes e os pratos dão-lhe pouco dinheiro. Só sobrevive porque a sua estrutura é barata.", p: 10 },
    { lucro: true, cmv_ok: false, ocupacao: "Excelente", estrutura: "Insustentável", msg: "Trabalha para aquecer. Tem casa cheia, contudo a comida fica cara e as despesas fixas são gigantes. Corte no desperdício já.", p: 10 },
    { lucro: true, cmv_ok: false, ocupacao: "Crítico", estrutura: "Crítico", msg: "Zona de Perigo! O lucro é minúsculo. Custos da comida altíssimos, despesas fixas caras e não tem clientes suficientes.", p: 10 },

    // Fallbacks
    { lucro: true, cmv_ok: true, ocupacao: null, estrutura: null, msg: "Trabalho saudável. Está a dar lucro e os custos da ementa estão bem marginais. Preencha 'Lugares' para mais detalhes.", p: 0 },
    { lucro: true, cmv_ok: false, ocupacao: null, estrutura: null, msg: "Lucra no total, mas exagera no que gasta com cozinha e fornecedores. Os custos dos pratos superam o estipulado.", p: 0 },

    // --- PREJUÍZO ---
    // C. CMV Controlado
    { lucro: false, cmv_ok: true, ocupacao: "Crítico", estrutura: "Alto", msg: "Prejuízo. A culpa NÃO é da comida. As despesas certas são altas para os tão poucos clientes que tem. Mais clientes, ou cortes urgentes.", p: 10 },
    { lucro: false, cmv_ok: true, ocupacao: "Crítico", estrutura: "Insustentável", msg: "Prejuízo esmagador. Comida excelente, mas a sua colossal despesa fixa aliada a uma sala vazia dita que o negócio não se paga a si mesmo. Exige reformulação estrutural gigante.", p: 10 },
    { lucro: false, cmv_ok: true, ocupacao: "Fraco", estrutura: "Insustentável", msg: "Prejuízo esmagador. Comida excelente, mas a sua despesa fixa ditam que o negócio não se sustenta com poucos clientes. Exige reformulação estrutural.", p: 10 },
    { lucro: false, cmv_ok: true, ocupacao: "Excelente", estrutura: "Insustentável", msg: "Sinal vermelho: Sala cheia mas perde dinheiro! As suas despesas mensais fixas estão pura e simplesmente incomportáveis.", p: 10 },
    { lucro: false, cmv_ok: true, ocupacao: "Crítico", estrutura: "Eficiente", msg: "Perde dinheiro devido pura e simplesmente à falta brutal de clientes. Os custos estão saudáveis.", p: 10 },
    { lucro: false, cmv_ok: true, ocupacao: "Excelente", estrutura: "Eficiente", msg: "Situação estranha: Sala enche, despesas controladas, margem cumpre objetivo, mas declara prejuízo. Verifique faturas escondidas ou furtos.", p: 10 },

    // D. CMV Mau
    { lucro: false, cmv_ok: false, ocupacao: "Crítico", estrutura: "Crítico", msg: "Alarme Geral! É a tempestade perfeita: Ausência de clientes, preços dos pratos muito baixos e contas fixas altíssimas.", p: 10 },
    { lucro: false, cmv_ok: false, ocupacao: "Fraco", estrutura: "Insustentável", msg: "Alarme Geral! É a tempestade perfeita: Ausência de clientes, preços dos pratos muito baixos e contas fixas altíssimas.", p: 10 },
    { lucro: false, cmv_ok: false, ocupacao: "Excelente", estrutura: "Crítico", msg: "Literalmente, está a pagar para lhe comerem lá. Sala cheia mas custos fixos mais CMV arrastam forte prejuízo. Reformule ementa.", p: 10 },
    { lucro: false, cmv_ok: false, ocupacao: "Crítico", estrutura: "Eficiente", msg: "Mesmo com despesas mensais baratas não escapou da tragédia: as compras aos fornecedores estão absurdamente dadas num mar de poucos clientes.", p: 10 },
    { lucro: false, cmv_ok: false, ocupacao: "Bom", estrutura: "Eficiente", msg: "Tem clientes no balcão e despesas de renda boas. O erro letal é a má formação de preços da sua ementa principal. Subir preços resolve.", p: 10 },

    // Fallbacks
    { lucro: false, cmv_ok: true, ocupacao: null, estrutura: null, msg: "Prejuízo inusitado. A comida dá retorno nos objetivos previstos. O encargo está escondido ou não comunicou os seus custos fixos na plataforma.", p: 0 },
    { lucro: false, cmv_ok: false, ocupacao: null, estrutura: null, msg: "Vermelho total. Acumula perdas totais em conjunto com ementas com desperdícios gigantes. Analise o quadro de Desafios Operacionais ao lado.", p: 0 },
  ];

  await prisma.regraDecisaoDashboard.deleteMany();
  for (const r of regras) {
    await prisma.regraDecisaoDashboard.create({
      data: {
        lucro_positivo: r.lucro,
        cmv_controlado: r.cmv_ok,
        nivel_ocupacao: r.ocupacao,
        nivel_estrutura: r.estrutura,
        mensagem: r.msg,
        prioridade: r.p
      }
    });
  }

  console.log("Seeding concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
