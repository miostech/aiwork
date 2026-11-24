// ═══════════════════════════════════════════════════════════════
//  AULAS DO EDITEFY SORT PARA COMPUTADOR (plugin do Claude Code que organiza vídeos, fotos, prints e áudios no
//  computador) — edite aqui títulos e textos
// ═══════════════════════════════════════════════════════════════
// Funciona igual a api/_aulas-editfy-reels.js. Quem compra abre estas aulas em miaiacademy.com/conta/editefy-sort
// (o botão do e-mail de compra leva para lá): a primeira aula mostra os comandos pessoais para instalar o plugin.
//
// instalacao: true → a aula mostra o comando pessoal de instalação do plugin (a licença do aluno, gerada por
//             api/_plugins.js), com botão de copiar. Deixe essa aula em primeiro.
// primeiroComando / ondeRodar: o que a nota da instalação manda rodar depois.
// passos: lista numerada embaixo da descrição (aula em texto); trechos entre `crases` viram código.
// aviso: texto no lugar do player quando a aula não tem vídeo. video, duracao, materiais: como em api/_aulas.js.
const TEXTO = "Aula em texto: siga os passos abaixo";

export const CURSO = {
  titulo: "Editefy Sort para computador",
  formatoVideo: "16/9",
  modulos: [
    {
      titulo: "Comece aqui",
      aulas: [
        {
          titulo: "Instalar o plugin no Claude Code",
          descricao: "Você só precisa do Claude Code, com uma assinatura do Claude, num computador Mac ou Windows com uns 3 GB livres. Cole os dois comandos abaixo e o plugin cuida do resto: no primeiro pedido ele instala sozinho o que faltar no seu computador (leva alguns minutos). No Mac sem Homebrew, o Claude pede para você colar um comando no Terminal e digitar a senha do Mac. Já usa o Editfy Reels? O Sort aproveita o mesmo ambiente e instala menos coisa. Para receber as melhorias sozinho, ligue a atualização automática da loja: no Claude Code, digite `/plugin`, abra Marketplaces → miai e escolha Enable auto-update.",
          duracao: "",
          video: "",
          instalacao: true,
          primeiroComando: "/editefy-sort:organizar",
          ondeRodar: "(ou só escreva \"organiza\") para criar a pasta Editefy Sort na sua Área de Trabalho",
          materiais: [{ titulo: "Baixar o Claude Code", texto: "App para desktop (aba Code) ou terminal", link: "https://claude.com/claude-code" }],
        },
        {
          titulo: "Organizar os seus arquivos",
          descricao: "Jogue os vídeos, fotos, prints e áudios na pasta Organizar e peça \"organiza\". O Claude olha e escuta cada arquivo, dá um nome que diz o que tem dentro e coloca na pasta certa. No fim abre uma animação com tudo voando para as pastas.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Abra a Área de Trabalho → Editefy Sort → Organizar (no Mac em português de Portugal, a Área de Trabalho se chama Mesa).",
            "Arraste ou copie para lá os arquivos que quer organizar: vídeos, fotos, prints e áudios, quantos quiser.",
            "No Claude Code, escreva `organiza`. Ele diz quantos arquivos são e quanto tempo leva (no Mac com chip Apple, uns 15 segundos por vídeo com fala; no Windows e no Mac Intel, até uns 40).",
            "Cada arquivo ganha um nome que diz o que tem, com a data da gravação na frente, como `2026-11-20_por-que-parei-de-me-comparar.mov`.",
            "As pastas padrão são Falando, Narração, B-roll, Fotos, Prints, Músicas, Sons, Editados e Outros.",
            "No fim, a animação abre no navegador. Para ver de novo, abra Ver organização na pasta Editefy Sort.",
          ],
          materiais: [],
        },
        {
          titulo: "Suas pastas, correções e privacidade",
          descricao: "Troque as pastas pelas suas, corrija o que ficou no lugar errado e saiba o que sai do seu computador.",
          duracao: "",
          video: "",
          aviso: TEXTO,
          passos: [
            "Pastas suas: escreva `pastas novas: Viagem, Clientes, Bastidor`. A escolha fica salva para as próximas vezes (Outros sempre existe a mais).",
            "Ficou no lugar errado? É só dizer: \"esse vídeo é B-roll\" ou \"muda o nome desse para reunião com a cliente\".",
            "Nada é apagado nem sobrescrito. Cada nome trocado fica anotado no arquivo nomes antigos.txt, dentro de Organizar.",
            "Quer a pasta Editefy Sort em outro lugar (outro disco, Documentos)? Peça: \"muda a pasta do Sort para Documentos\".",
            "Privacidade: os arquivos não saem do computador. Para dar os nomes, o Claude vê só as prévias: 3 quadros de cada vídeo, uma cópia pequena de cada foto e o começo da fala, transcrito no seu computador.",
          ],
          materiais: [],
        },
      ],
    },
  ],
};
