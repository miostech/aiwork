// ═══════════════════════════════════════════════════════════════
//  AULAS DO CURSO — edite aqui títulos, descrições e vídeos
// ═══════════════════════════════════════════════════════════════
// Este arquivo fica no servidor: os links dos vídeos só são entregues para quem
// tem o link de acesso. Depois de editar, faça o commit e o push; a Vercel publica sozinha.
//
// video:     link do arquivo .mp4 no Azure (espaços viram %20), ex.:
//            'https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%201%20-%20iaacademy.mp4'
//            ou link de incorporação (embed) do Panda Video. Vazio = mostra "vídeo em breve".
// capa:      imagem que aparece antes do play (ex.: '/capas/aula-2.jpg', na pasta capas/ do site).
//            Sem capa, o navegador mostra o comecinho do vídeo.
// duracao:   texto livre, ex.: '4 min'. Vazio = não mostra.
// materiais: links que aparecem em "Links da aula", embaixo do título, ex.:
//            [{ titulo: 'Site da empresa', texto: 'frase opcional embaixo', link: 'https://...' }]
// aviso:     aula sem vídeo, só com material: texto que aparece no lugar do player,
//            ex.: 'Baixe o PDF abaixo'. Sem vídeo e sem aviso = mostra "vídeo em breve".
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
          capa: "/capas/aula-1.jpg",
          materiais: [
            {
              titulo: "Criar minha conta grátis na Hub",
              texto: "Para quem ainda não fez o cadastro na Hub",
              link: "https://ai.hub.xyz/r/IAACAD",
            },
          ],
        },
        {
          titulo: "O kit para começar com o celular que você já tem",
          descricao: "",
          duracao: "9 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%202%20-%20iaacademy.mp4",
          capa: "/capas/aula-2.jpg",
          materiais: [
            {
              titulo: "Suporte de cabeça simples",
              texto: "O baratinho que eu uso, para começar enquanto o da Hub não chega",
              link: "https://s.click.aliexpress.com/e/_c31OQYRd",
            },
            {
              titulo: "Suporte de cabeça profissional Ulanzi",
              texto: "Mais confortável para gravar muitas horas por dia",
              link: "https://s.click.aliexpress.com/e/_c42BTHqJ",
            },
          ],
        },
      ],
    },
    {
      titulo: "As 3 empresas",
      aulas: [
        {
          titulo: "Hub: libere a sua conta e grave o primeiro vídeo",
          descricao: "",
          duracao: "8 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%203%20-%20iaacademy.mp4",
          capa: "/capas/aula-3.jpg",
          materiais: [
            {
              titulo: "Criar minha conta grátis na Hub",
              texto: "Para quem ainda não fez o cadastro na Hub",
              link: "https://ai.hub.xyz/r/IAACAD",
            },
            {
              titulo: "Hub Capture para iPhone",
              texto: "Baixar o app da Hub na App Store",
              link: "https://apps.apple.com/br/app/hub-capture/id6772285040",
            },
            {
              titulo: "Hub Capture para Android",
              texto: "Baixar o app da Hub no Google Play",
              link: "https://play.google.com/store/apps/details?id=xyz.hub.mobile",
            },
            {
              titulo: "Minute para iPhone",
              texto: "Baixar o Minute Data na App Store",
              link: "https://apps.apple.com/br/app/minute-data/id6760918280",
            },
            {
              titulo: "Minute para Android",
              texto: "Baixar o Minute Data no Google Play",
              link: "https://play.google.com/store/apps/details?id=com.bakerdata.minute",
            },
          ],
        },
        {
          titulo: "O segredo dos vídeos aprovados (e os 3 erros que bloqueiam a sua conta)",
          descricao: "",
          duracao: "11 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%204%20-%20iaacademy.mp4",
          capa: "/capas/aula-4.jpg",
          materiais: [
            {
              titulo: "Checklist antes de gravar",
              texto: "Em PDF, para imprimir ou salvar no celular",
              link: "/materiais/checklist-antes-de-gravar.pdf",
            },
          ],
        },
        {
          titulo: "Claru: grave para o laboratório criado por ex-pesquisadores do Google",
          descricao: "",
          duracao: "4 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%205%20-%20iaacademy.mp4",
          capa: "/capas/aula-5.jpg",
          materiais: [
            {
              titulo: "Criar minha conta grátis na Claru",
              texto: "Para quem ainda não fez o cadastro na Claru",
              link: "https://app.claru.ai/signup?ref=2e58qws8",
            },
          ],
        },
        {
          titulo: "Mimix: a carta na manga de quem mora fora do Brasil",
          descricao: "",
          duracao: "4 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%206%20-%20iaacademy.mp4",
          capa: "/capas/aula-6.jpg",
          materiais: [
            {
              titulo: "Criar minha conta grátis na Mimix",
              texto: "Para quem ainda não fez o cadastro na Mimix",
              link: "https://mimix-ai.xyz/register?ref=iaacademy",
            },
          ],
        },
        {
          titulo: "Você já tem as 3 plataformas: o que vem agora",
          descricao: "",
          duracao: "1 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%207%20-%20iaacademy.mp4",
          capa: "/capas/aula-7.jpg",
          materiais: [],
        },
      ],
    },
    {
      titulo: "Primeiros passos e ganhos",
      aulas: [
        {
          titulo: "Checklist completo e as minhas indicações de cada plataforma",
          descricao: "",
          duracao: "PDF",
          video: "",
          aviso: "Baixe o PDF abaixo",
          materiais: [
            {
              titulo: "Checklist completo (PDF)",
              texto: "O checklist de gravação e os links das 3 plataformas",
              link: "/materiais/checklist-completo.pdf",
            },
          ],
        },
        {
          titulo: "O próximo nível: empresas que pagam acima de US$ 20 por hora",
          descricao: "",
          duracao: "10 min",
          video: "https://cursiversostorage.blob.core.windows.net/iaacademy/Aula%209%20-%20iaacademy.mp4",
          capa: "/capas/aula-9.jpg",
          materiais: [
            {
              titulo: "Conhecer o IA Work",
              texto: "A página do curso completo, com o desconto de quem fez a Formação",
              link: "/aiwork?origem=curso",
            },
            {
              titulo: "Canal da IA Academy no WhatsApp",
              texto: "Novidades, vagas e dicas das plataformas",
              link: "https://whatsapp.com/channel/0029Vb9E7Ow0rGiEGxEOY30F",
            },
          ],
          // Chamada para o curso pago, mostrada abaixo da descrição desta aula
          oferta: {
            titulo: "Conheça o IA Work",
            texto: "O curso completo para usar a sua área de conhecimento em tarefas profissionais de IA, que pagam acima de US$ 20 por hora.",
            botao: "Quero conhecer o IA Work",
            link: "/aiwork?origem=curso",   // ?origem=curso já preenche o cupom ACADEMY de quem fez a Formação
          },
        },
      ],
    },
  ],
};
