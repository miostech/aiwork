// ═══════════════════════════════════════════════════════════════
//  AULAS DO CURSO — edite aqui títulos, descrições e vídeos
// ═══════════════════════════════════════════════════════════════
// Este arquivo fica no servidor: os links dos vídeos só são entregues para quem
// tem o link de acesso. Depois de editar, faça o commit e o push; a Vercel publica sozinha.
//
// video:     link do arquivo .mp4 no Azure (espaços viram %20), ex.:
//            'https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%201%20-%20iaacademy.mp4'
//            ou link de incorporação (embed) do Panda Video. Vazio = mostra "vídeo em breve".
// duracao:   texto livre, ex.: '4 min'. Vazio = não mostra.
// materiais: links extras que aparecem embaixo da aula, ex.: [{ titulo: 'Site da empresa', link: 'https://...' }]
//
// As aulas ficam dentro de módulos. Para criar um módulo novo, copie um bloco { titulo, aulas: [...] }.
// descricao: texto curto embaixo do título da aula. Vazio = não mostra.
export const CURSO = {
  titulo: "Primeiros passos no treinamento de IA",
  formatoVideo: "16/9", // use '9/16' se as aulas forem gravadas na vertical
  modulos: [
    {
      titulo: "O mercado de treinamento de IA",
      aulas: [
        {
          titulo: "Por que empresas de IA pagam em dólar para você gravar a sua rotina",
          descricao: "",
          duracao: "9 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%201%20-%20iaacademy.mp4",
          materiais: [],
        },
        {
          titulo: "O kit para começar com o celular que você já tem",
          descricao: "",
          duracao: "4 min",
          video: "",
          materiais: [],
        },
      ],
    },
    {
      titulo: "As 3 empresas",
      aulas: [
        {
          titulo: "Hub: libere a sua conta e grave o primeiro vídeo",
          descricao: "",
          duracao: "5 min",
          video: "",
          materiais: [],
        },
        {
          titulo: "O segredo dos vídeos aprovados (e os 3 erros que bloqueiam a sua conta)",
          descricao: "",
          duracao: "6 min",
          video: "",
          materiais: [],
        },
        {
          titulo: "Claru: grave para o laboratório criado por ex-pesquisadores do Google",
          descricao: "",
          duracao: "4 min",
          video: "",
          materiais: [],
        },
        {
          titulo: "Claru: dólares na conta a cada duas semanas",
          descricao: "",
          duracao: "3 min",
          video: "",
          materiais: [],
        },
        {
          titulo: "Mimix: a carta na manga de quem mora fora do Brasil",
          descricao: "",
          duracao: "4 min",
          video: "",
          materiais: [],
        },
      ],
    },
    {
      titulo: "Primeiros passos e ganhos",
      aulas: [
        {
          titulo: "Dólar no bolso: como sacar sem perder dinheiro (e sem problemas com o Leão)",
          descricao: "",
          duracao: "4 min",
          video: "",
          materiais: [],
        },
        {
          titulo: "O próximo nível: empresas que pagam acima de US$ 20 por hora",
          descricao: "",
          duracao: "6 min",
          video: "",
          materiais: [],
          // Chamada para o curso pago, mostrada abaixo da descrição desta aula
          oferta: {
            titulo: "Conheça o IA Work",
            texto: "O curso completo para usar a sua área de conhecimento em tarefas profissionais de IA, que pagam acima de US$ 20 por hora.",
            botao: "Quero conhecer o IA Work",
            link: "/aiwork?origem=curso",   // ?origem=curso já preenche o cupom do gratuito no pagamento
          },
        },
      ],
    },
  ],
};
