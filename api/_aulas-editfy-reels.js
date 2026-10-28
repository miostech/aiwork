// ═══════════════════════════════════════════════════════════════
//  AULAS DO EDITFY REELS (edição de vídeos verticais com IA: curso + plugin do Claude Code) — edite aqui títulos e textos
// ═══════════════════════════════════════════════════════════════
// Funciona igual a api/_aulas-editfy.js. A área do aluno abre este curso em miaiacademy.com/conta/editfy-reels.
//
// instalacao: true → a aula mostra o comando pessoal de instalação do plugin (a licença do aluno, gerada por
//             api/plugins.js), com botão de copiar. Deixe essa aula em primeiro.
// primeiroComando / ondeRodar: o que a nota da instalação manda rodar depois.
// passos: lista numerada embaixo da descrição (aula em texto); trechos entre `crases` viram código.
// aviso: texto no lugar do player quando a aula não tem vídeo. video, duracao, materiais: como em api/_aulas.js.
const TEXTO = "Aula em texto: siga os passos abaixo";

export const CURSO = {
  titulo: "Editfy Reels",
  formatoVideo: "16/9",
  modulos: [
    {
      titulo: "Comece aqui",
      aulas: [
        {
          titulo: "Instalar o plugin no Claude Code",
          descricao: "Você só precisa do Claude Code, com uma assinatura do Claude, num computador Mac ou Windows. Cole os dois comandos abaixo e o plugin cuida do resto: no primeiro vídeo ele instala sozinho o que faltar no seu computador (leva alguns minutos e precisa de uns 6 GB livres). Já usa o Editfy de aulas? O Editfy Reels aproveita o mesmo ambiente e o mesmo perfil.",
          duracao: "",
          video: "",
          instalacao: true,
          primeiroComando: "/editfy-reels:configurar",
          ondeRodar: "para colocar o seu nome, o seu @ e as suas cores",
          materiais: [{ titulo: "Baixar o Claude Code", texto: "Terminal, app para desktop ou VS Code", link: "https://claude.com/claude-code" }],
        },
        {
          titulo: "Configurar o seu perfil",
          descricao: "Uma vez só: o Editfy Reels guarda o seu nome, o seu @, a sua marca, as cores e a pasta onde salvar os vídeos editados.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Abra o Claude Code e digite `/editfy-reels:configurar`.",
            "Responda: o nome que aparece na plaquinha, o @ do perfil onde você posta e a sua marca (pode ficar em branco).",
            "Escolha as cores (ou mande as cores da sua marca) e a pasta onde salvar. A cor de destaque pinta a palavra falada na legenda.",
            "Confira a amostra que o Claude mostra e peça ajustes até ficar do seu jeito.",
            "Para mudar depois, é só pedir: \"troca a cor da legenda\" ou \"muda o meu @\".",
          ],
          materiais: [],
        },
        {
          titulo: "Editar o seu primeiro vídeo",
          descricao: "Grave na vertical, falando para a câmera, e mande o arquivo. O Editfy Reels transcreve, monta a legenda, o título do gancho e os efeitos, confere tudo e entrega o vídeo pronto para postar.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Grave com um pouco de espaço em volta da cabeça: os efeitos que ficam atrás de você precisam de fundo para aparecer.",
            "Deixe o vídeo num lugar fácil, como a pasta Downloads ou a Mesa.",
            "No Claude Code, escreva: `edita esse reel: ` e arraste o arquivo para a conversa.",
            "O Claude propõe os cortes de pausas, respirações e frases repetidas (quando você erra e repete, fica a última tentativa) e só corta depois que você aprovar. O vídeo termina na sua última palavra.",
            "Depois ele sugere o título dos primeiros segundos e os efeitos, e pergunta o que precisar.",
            "Antes de renderizar, ele confere quadros dos efeitos e uma prévia com as áreas que o app cobre e o seu rosto marcados.",
            "No fim você recebe o vídeo 1080x1920, o tamanho, o que entrou na edição e uma sugestão de descrição para o post.",
          ],
          materiais: [],
        },
      ],
    },
    {
      titulo: "Deixando o vídeo melhor",
      aulas: [
        {
          titulo: "Os 45 efeitos e quando usar cada um",
          descricao: "Os efeitos seguem o seu rosto e, quando iam cobrir você, ficam atrás: a palavra gigante, o holofote, os prints girando em volta da cabeça, a checklist, as mensagens e mais 40.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Peça pelo nome ou descrevendo: \"coloca a palavra DÓLAR gigante atrás de mim quando eu falar dólar\" ou \"usa o holofote no começo\".",
            "Para ver todos, peça: \"me mostra a lista de efeitos do Editfy Reels\".",
            "Use de 1 a 4 efeitos num vídeo de até 1 minuto, cada um por 1,5 a 4 segundos, no momento da fala.",
            "Efeitos com os seus vídeos ou prints (órbita, leque, carrossel, grade do perfil): mande uma pasta com as imagens.",
            "Gráficos e contadores só com os seus números de verdade: diga quais são.",
          ],
          materiais: [],
        },
        {
          titulo: "Legenda, título, cards e prints",
          descricao: "Ajuste a edição conversando: o Claude refaz só o que você pedir.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Legenda: \"quero 2 palavras por vez\", \"sem maiúsculas\" ou \"corrige o nome, é Claru\".",
            "Título do gancho: \"muda o título para 3 sites que pagam em dólar, com dólar em destaque\".",
            "Cards: \"coloca um card com os 3 passos quando eu explico o cadastro\".",
            "Prints e telas: mande os arquivos e diga quando entram. Peça para esconder e-mails e dados pessoais.",
            "Mostrou o celular para a câmera e o texto ficou espelhado? O Editfy Reels dá um zoom desespelhado nesses momentos.",
          ],
          materiais: [],
        },
        {
          titulo: "Escolher o que entra em cada vídeo (e salvar padrões)",
          descricao: "Cada vídeo pode pedir uma edição diferente: às vezes só cortar, às vezes tudo. A cada vídeo novo o Claude pergunta o que entra, e você pode salvar as combinações que mais usa.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Ao mandar um vídeo, o Claude pergunta qual padrão usar: Completo, Legenda e cortes, Só cortes ou um dos seus.",
            "Ou escolha item por item: cortes, legenda, título, plaquinha, efeitos, imagens de apoio, cards, zoom, áudio tratado, efeitos sonoros e música.",
            "Gostou da combinação? Responda \"Sim, salvar\" e dê um nome, como \"Reels de dica\". Da próxima vez é uma pergunta só.",
            "Já sabe o que quer? Diga no pedido: `edita esse reel com o padrão Reels de dica` ou `só corta esse vídeo`.",
            "Para mudar ou apagar um padrão, é só pedir: \"apaga o padrão Reels de dica\".",
          ],
          materiais: [],
        },
        {
          titulo: "Montagem de b-roll para narrar",
          descricao: "Tem vários vídeos sem fala (viagem, comida, rotina, bastidores)? O Editfy Reels escolhe os melhores momentos de cada um e monta um vídeo vertical sem áudio, para você gravar a narração no próprio Instagram.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Mande os vídeos na conversa. Se não ficar claro, o Claude pergunta se é você falando ou vídeos sem fala para narrar.",
            "Escolha a duração (15, 20 ou 30 s), o ritmo dos cortes, a ordem e se quer câmera lenta nos vídeos gravados a 60 quadros por segundo.",
            "A ordem pode contar uma história (o Claude olha cada vídeo: abre com a imagem mais forte, passa pelo lugar e pelos detalhes e fecha com um final), seguir a hora em que você gravou ou a ordem em que mandou.",
            "Já tem o texto da narração? Cole na conversa: as cenas entram na ordem do que você vai falar, cada uma pelo tempo da frase.",
            "O Claude analisa cada vídeo (foco, tremor, movimento e luz), mostra a sequência com o motivo da ordem e só monta depois que você aprovar.",
            "No Instagram, ao criar o Reels, toque em Áudio → Narração e grave a sua voz por cima. No TikTok, use Narração no editor.",
          ],
          materiais: [],
        },
      ],
    },
    {
      titulo: "Postar",
      aulas: [
        {
          titulo: "Postar no Reels, TikTok e Shorts",
          descricao: "O vídeo sai em 1080x1920, com o volume no padrão das redes, e nada importante embaixo da descrição ou dos botões do app.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "O vídeo sai em `reels/<nome do vídeo>.mp4`, na pasta que você escolheu no perfil.",
            "Assista antes de postar: a IA faz o rascunho, você aprova.",
            "Mande o arquivo para o celular (AirDrop, Google Drive ou WhatsApp como documento, para não perder qualidade) e poste.",
            "Use a sugestão de descrição do Claude e ajuste com o seu jeito de falar.",
            "Depois de postar, pode apagar a pasta de trabalho do vídeo para liberar espaço.",
          ],
          materiais: [],
        },
      ],
    },
  ],
};
