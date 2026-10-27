// ═══════════════════════════════════════════════════════════════
//  AULAS DO EDITFY (edição de videoaulas com IA: curso + plugin do Claude Code) — edite aqui títulos e textos
// ═══════════════════════════════════════════════════════════════
// Funciona igual a api/_aulas-canal-dark.js. A área do aluno abre este curso em miaiacademy.com/conta/editfy.
//
// instalacao: true → a aula mostra o comando pessoal de instalação do plugin (a licença do aluno, gerada por
//             api/plugins.js), com botão de copiar. Deixe essa aula em primeiro.
// primeiroComando / ondeRodar: o que a nota da instalação manda rodar depois (padrão: o do Sabido).
// passos: lista numerada embaixo da descrição (aula em texto); trechos entre `crases` viram código.
// aviso: texto no lugar do player quando a aula não tem vídeo. video, duracao, materiais: como em api/_aulas.js.
const TEXTO = "Aula em texto: siga os passos abaixo";

export const CURSO = {
  titulo: "Editfy",
  formatoVideo: "16/9",
  modulos: [
    {
      titulo: "Comece aqui",
      aulas: [
        {
          titulo: "Instalar o plugin no Claude Code",
          descricao: "Você só precisa do Claude Code, com uma assinatura do Claude, num computador Mac ou Windows. Cole os dois comandos abaixo e o plugin cuida do resto: na primeira aula ele instala sozinho o que faltar no seu computador (leva alguns minutos e precisa de uns 5 GB livres).",
          duracao: "",
          video: "",
          instalacao: true,
          primeiroComando: "/editfy:configurar",
          ondeRodar: "para colocar o seu nome, a sua marca e as suas cores",
          materiais: [{ titulo: "Baixar o Claude Code", texto: "Terminal, app para desktop ou VS Code", link: "https://claude.com/claude-code" }],
        },
        {
          titulo: "Configurar o seu perfil",
          descricao: "Uma vez só: o Editfy guarda o seu nome, a sua marca, o total de aulas do curso, as cores e a pasta onde salvar as aulas editadas.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Abra o Claude Code e digite `/editfy:configurar`.",
            "Responda: o nome que aparece na plaquinha do começo das aulas e a sua marca ou escola (pode ficar em branco).",
            "Escolha o total de aulas, as cores (ou mande as cores da sua marca) e a pasta onde salvar.",
            "Confira a amostra que o Claude mostra e peça ajustes até ficar do seu jeito.",
            "Para mudar depois, é só pedir: \"troca as cores do Editfy\" ou \"muda o total de aulas para 12\".",
          ],
          materiais: [],
        },
        {
          titulo: "Editar a sua primeira aula",
          descricao: "Grave a aula na horizontal, falando para a câmera, e mande o arquivo. O Editfy transcreve, monta a edição, confere tudo e entrega a versão leve, pronta para subir.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Deixe o vídeo num lugar fácil, como a pasta Downloads ou a Mesa.",
            "No Claude Code, escreva: `edita a aula 1: ` e arraste o arquivo para a conversa.",
            "O Claude propõe os cortes de pausas, respirações e frases repetidas (quando você erra e repete, fica a última tentativa) e só corta depois que você aprovar.",
            "Depois ele pergunta o que precisar: nomes que o Whisper errou, links que você citou, prints prometidos na fala.",
            "Antes de renderizar, ele confere uma prévia com os cards e a legenda sobre o seu vídeo e evita cobrir as suas mãos.",
            "No fim você recebe o arquivo pronto, o tamanho, o que entrou na edição e os capítulos com os minutos para a página do curso.",
          ],
          materiais: [],
        },
      ],
    },
    {
      titulo: "Deixando a aula melhor",
      aulas: [
        {
          titulo: "Prints, telas e o celular na câmera",
          descricao: "Mostre o que você explica: prints, gravações de tela e o app no celular entram na aula enquanto a sua voz continua.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Mande os prints e as gravações de tela na conversa, ou salve na Mesa e diga o nome do arquivo.",
            "Diga em que momento entram: \"quando eu falo do cadastro, mostra a gravação da tela\".",
            "Peça para esconder dados: \"desfoca os meus e-mails e o nome dos projetos\". O Claude recorta ou desfoca e confere em tamanho real.",
            "Mostrou o celular para a câmera e o texto ficou espelhado? O Editfy dá um zoom desespelhado nesses momentos para dar para ler.",
            "Use só imagens suas ou que você tem autorização para usar.",
          ],
          materiais: [],
        },
        {
          titulo: "Cards, capítulos, legenda e errata",
          descricao: "Ajuste a edição conversando: o Claude refaz só o que você pedir.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Cards: \"coloca um card com os 3 passos quando eu explico o cadastro\" ou \"tira o card do minuto 2\".",
            "Capítulos: \"cria um capítulo Pagamentos quando eu começo a falar disso\".",
            "Legenda: \"corrige o nome da plataforma, é Claru\". A legenda segue a sua fala; erros de nome e número o Claude corrige.",
            "Falou um dado errado? Peça um card de errata: \"no minuto 1:49 coloca errata: é a partir do iPhone 12\".",
            "Depois de cada ajuste, o Claude confere de novo a sincronia antes de entregar.",
          ],
          materiais: [],
        },
      ],
    },
    {
      titulo: "Publicar",
      aulas: [
        {
          titulo: "Subir a aula na sua plataforma",
          descricao: "A versão leve (1080p, uns 3 a 4 Mbps) carrega rápido para o aluno e cabe nas plataformas de curso.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "A aula sai em `aula-N-1080p/Aula N - sua marca.mp4`, na pasta que você escolheu no perfil.",
            "Suba esse arquivo na sua plataforma (Hotmart, Kiwify, Panda, YouTube não listado, Azure...).",
            "Cole os capítulos que o Claude entregou na descrição da aula, se a plataforma aceitar.",
            "Depois de subir, pode apagar a pasta de trabalho da aula para liberar espaço.",
          ],
          materiais: [],
        },
      ],
    },
  ],
};
