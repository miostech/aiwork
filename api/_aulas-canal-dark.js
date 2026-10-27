// ═══════════════════════════════════════════════════════════════
//  AULAS DO SABIDO (canal dark com IA: curso + plugin do Claude Code) — edite aqui títulos, descrições e vídeos
// ═══════════════════════════════════════════════════════════════
// Funciona igual a api/_aulas-iawork.js. A área do aluno abre este curso em miaiacademy.com/conta/sabido.
//
// instalacao: true → a aula mostra o comando pessoal de instalação do plugin (a licença do aluno, gerada por
//             api/plugins.js), com botão de copiar. Deixe essa aula em primeiro.
// video, duracao, materiais, aviso: como em api/_aulas.js.
export const CURSO = {
  titulo: "Sabido",
  formatoVideo: "16/9",
  modulos: [
    {
      titulo: "Comece aqui",
      aulas: [
        {
          titulo: "Instalar o plugin no Claude Code",
          descricao: "Você só precisa do Claude Code, com uma assinatura do Claude. Cole os dois comandos abaixo e o plugin cuida do resto: se faltar alguma coisa no seu computador, o próprio Claude avisa e ajuda a instalar.",
          duracao: "",
          video: "",
          instalacao: true,
          materiais: [{ titulo: "Baixar o Claude Code", texto: "Terminal, app para desktop ou VS Code", link: "https://claude.com/claude-code" }],
        },
        {
          titulo: "Configurar o seu canal",
          descricao: "Rode /sabido:configurar-canal: nicho, tom, nome, bordão, voz e o apresentador 2D.",
          duracao: "",
          video: "",
          materiais: [],
        },
        {
          titulo: "O seu primeiro vídeo",
          descricao: "Do tema ao video.mp4: pesquisa, roteiro, narração, conferência e o texto do post.",
          duracao: "",
          video: "",
          materiais: [],
        },
      ],
    },
    {
      titulo: "Formatos que prendem",
      aulas: [
        { titulo: "Gráficos animados e timelapse", descricao: "Rankings, corridas de barras, linhas no tempo e mapas que crescem.", duracao: "", video: "", materiais: [] },
        { titulo: "O apresentador explicando", descricao: "Vídeos com o avatar 2D falando, fotos de época e desenhos.", duracao: "", video: "", materiais: [] },
        { titulo: "Top 5 e quiz", descricao: "Os formatos que mais seguram até o fim, com gancho forte.", duracao: "", video: "", materiais: [] },
      ],
    },
    {
      titulo: "O seu avatar e o seu estilo",
      aulas: [
        { titulo: "Criar um apresentador próprio", descricao: "Avatar com o seu rosto de desenho, poses e figurinos (/sabido:criar-avatar).", duracao: "", video: "", materiais: [] },
        { titulo: "Ajustes finos", descricao: "Trocar voz, ritmo, bordão e pedir mudanças num vídeo pronto.", duracao: "", video: "", materiais: [] },
      ],
    },
    {
      titulo: "Publicar e crescer",
      aulas: [
        { titulo: "Postar no TikTok, Reels e Shorts", descricao: "Legenda, hashtags, fontes e o que derruba vídeo nas plataformas.", duracao: "", video: "", materiais: [] },
      ],
    },
  ],
};
