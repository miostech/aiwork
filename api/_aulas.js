// ═══════════════════════════════════════════════════════════════
//  AULAS DO CURSO — edite aqui títulos, descrições e vídeos
// ═══════════════════════════════════════════════════════════════
// Este arquivo fica no servidor: os links dos vídeos só são entregues para quem
// tem o link de acesso. Depois de editar, faça o commit e o push; a Vercel publica sozinha.
//
// video:     link de incorporação (embed) do Panda Video, por exemplo
//            'https://player-vz-xxxxxxxx-xxx.tv.pandavideo.com.br/embed/?v=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
//            Vazio = mostra "vídeo em breve".
// duracao:   texto livre, ex.: '4 min'. Vazio = não mostra.
// materiais: links extras que aparecem embaixo da aula, ex.: [{ titulo: 'Site da empresa', link: 'https://...' }]
//
// As aulas ficam dentro de módulos. Para criar um módulo novo, copie um bloco { titulo, aulas: [...] }.
// Os títulos abaixo são provisórios: troque pelos títulos reais dos módulos e das aulas.
export const CURSO = {
  titulo: "Primeiros passos no treinamento de IA",
  formatoVideo: "16/9", // use '9/16' se as aulas forem gravadas na vertical
  modulos: [
    {
      titulo: "O mercado de treinamento de IA",
      aulas: [
        {
          titulo: "Boas-vindas: o que é o mercado de treinamento de IA",
          descricao: "Entenda o que as empresas de inteligência artificial precisam e por que pagam pessoas comuns para ajudar a treinar seus robôs.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "Como funciona o trabalho de treinar uma IA",
          descricao: "Os tipos de tarefa mais comuns e o que você precisa para começar, mesmo sem experiência.",
          duracao: "",
          video: "",
          materiais: [],
        },
      ],
    },
    {
      titulo: "As 3 empresas",
      aulas: [
        {
          titulo: "Empresa 1: como funciona e como se cadastrar",
          descricao: "Conheça a primeira empresa, o que ela oferece e o passo a passo do cadastro.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "Empresa 2: como funciona e como se cadastrar",
          descricao: "Conheça a segunda empresa, o que ela oferece e o passo a passo do cadastro.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "Empresa 3: como funciona e como se cadastrar",
          descricao: "Conheça a terceira empresa, o que ela oferece e o passo a passo do cadastro.",
          duracao: "",
          video: "",
          materiais: [],
        },
      ],
    },
    {
      titulo: "Primeiros passos e ganhos",
      aulas: [
        {
          titulo: "Como encontrar as melhores oportunidades",
          descricao: "Onde procurar novas vagas de tarefas e como escolher as que valem mais a pena.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "Seus primeiros passos na prática",
          descricao: "O que fazer nos seus primeiros dias para ser aprovado nas tarefas e ganhar ritmo.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "Como receber seus ganhos em dólar",
          descricao: "As formas de recebimento e os cuidados para o dinheiro chegar até você.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "Próximos passos",
          descricao: "Um plano simples para continuar evoluindo depois do curso.",
          duracao: "",
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
