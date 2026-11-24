// Cursos pagos: os da MIAI Academy (miaiacademy.com) e a Formação IA Academy (iaacademy.bio).
// O aviso do Stripe (api/stripe-webhook.js) descobre o curso comprado pelo link de pagamento.
//
// MIAI: cada curso tem a sua página de vendas, o seu link de pagamento e as suas aulas; na conta da MIAI, a pessoa
// só vê os cursos que comprou.
//
// Para lançar um curso novo:
//   1. escreva as aulas num arquivo como api/_aulas-iawork.js e importe aqui
//   2. crie o produto e o link de pagamento no Stripe e coloque o id do link (plink_...) em linksPagamento
//
// Preços: em dólar, com o valor em reais fixo para o Brasil (opção de moeda "brl" no preço do Stripe). Quem está no
// Brasil paga o valor em reais de sempre; nos outros países o Stripe converte o preço em dólar para a moeda local.
//
// linksPagamento: o primeiro é o link atual; os seguintes são links antigos do mesmo curso, que continuam liberando
// o acesso de quem abriu o pagamento antes da troca.
//   3. crie a página de vendas em miai/cursos/<endereco>.html e o bloco do curso no CATÁLOGO de miai/miai.js
//   4. curso que libera um plugin do Claude Code: "plugin", "repo" e "descricaoPlugin" (api/_plugins.js e api/_loja.js);
//      o GITHUB_TOKEN da Vercel precisa ler o repositório novo
//   5. paginasVenda: o nome da página de vendas no contador de visitas (data-pagina do contador.js, que precisa estar
//      em PAGINAS de api/visita.js); o painel conta os visitantes delas na parte "Por curso"
//
// Pacotes (o Editefy): em vez de um preço único, o curso tem "pacotes" de minutos, cada um com o seu link de pagamento
// (pagamento único); o aviso do Stripe grava cada compra em editfy_creditos (veja o bloco do Editfy Reels abaixo).
// O Editefy Sort (EDITEFY_SORT, mais abaixo) também é um pacote, mas de tempo ("meses" em vez de "minutos"): cada
// compra vai para editefy_sort_acessos.
//
// Assinatura mensal (usada pelo Editefy até 16/11/2026; nenhum curso vende assim hoje): o curso tem "planos". Cada plano é um produto com preço
// mensal no Stripe e um link de pagamento no modo assinatura, e vira um valor de acessos.curso (ex.: editfy-reels-60).
// Quem assina recebe dois acessos: o do curso (o "id", que libera as aulas e o plugin, igual a uma compra) e o do plano
// (que o Editfy no servidor lê para saber os minutos do mês: variável PLANOS_MINUTOS do servidor, com estes mesmos
// nomes). O aviso do Stripe (api/stripe-webhook.js) acompanha a assinatura: troca o plano no upgrade e no downgrade e
// tira os dois acessos quando ela acaba. Para liberar um plano à mão (cortesia), libere o curso e o plano.
//   planos[].linksPagamento  id do link de pagamento (plink_...) de cada plano: liga o pagamento ao curso e ao plano
//   planos[].produtos        opcional: id do produto (prod_...) de cada plano, que diz o plano da assinatura nas trocas
//                            de plano. Sem ele, o aviso descobre o produto pelos links (vale para os produtos que os
//                            links vendem hoje: ponha aqui o produto antigo se um link passar a vender outro).
//
// Variável de ambiente:
//   MIAI_URL  endereço da MIAI Academy (ex.: https://miaiacademy.com). Enquanto estiver vazia, os e-mails de
//             compra continuam como antes, com o link da área do aluno da IA Academy.
import { CURSO as AULAS_IAWORK } from "./_aulas-iawork.js";
import { CURSO as AULAS_CANAL_DARK } from "./_aulas-canal-dark.js";
import { CURSO as AULAS_EDITFY } from "./_aulas-editfy.js";
import { CURSO as AULAS_EDITFY_REELS } from "./_aulas-editfy-reels.js";
import { CURSO as AULAS_EDITEFY_SORT } from "./_aulas-editefy-sort.js";

export const CURSOS_MIAI = [
  {
    endereco: "ia-work",   // miaiacademy.com/ia-work (vendas) e miaiacademy.com/conta/ia-work (aulas)
    id: "pago",            // nome no banco (acessos.curso e compras.curso): o IA Work nasceu como "pago" na IA Academy
    nome: "IA Work",
    paginasVenda: ["aiwork", "miai-ia-work"],   // iaacademy.bio/aiwork e miaiacademy.com/ia-work
    // US$ 497 (R$ 497 no Brasil); depois os antigos: US$ 99 e o só em reais
    linksPagamento: ["plink_1UUt0pRY9p8vsUUs8Yq5Miq1", "plink_1UUsf2RY9p8vsUUsv2vZuZMC", "plink_1USLFxRY9p8vsUUshLZlyAb9", process.env.STRIPE_PAYMENT_LINK],
    aulas: AULAS_IAWORK,
  },
  {
    endereco: "sabido",      // miaiacademy.com/sabido (vendas) e miaiacademy.com/conta/sabido (aulas)
    id: "canal-dark",        // nome no banco (acessos.curso) e na loja dos plugins: o Sabido nasceu como "canal-dark"
    nome: "Sabido",
    paginasVenda: ["miai-sabido", "miai-canal-dark"],   // miaiacademy.com/sabido e o endereço antigo, /canal-dark
    // plugin do Claude Code liberado por este curso: "name" do plugin.json, repositório privado e o texto da loja
    plugin: "sabido",        // "name" do plugin.json (renomeado de canal-dark na versão 0.2.0); o aluno instala com sabido@miai
    repo: "miostech/miai-plugin-canal-dark",
    descricaoPlugin: "Vídeos para canal dark (TikTok, Reels, Shorts) narrados em português, com apresentador 2D e voz gratuita.",
    // US$ 97 (R$ 97 no Brasil); STRIPE_PAYMENT_LINK_CANAL_DARK, se definida, é aceita junto
    linksPagamento: ["plink_1UV9VIRY9p8vsUUsNov5otoO", process.env.STRIPE_PAYMENT_LINK_CANAL_DARK],
    aulas: AULAS_CANAL_DARK,
  },
  {
    endereco: "editfy",      // miaiacademy.com/editfy (vendas) e miaiacademy.com/conta/editfy (aulas)
    id: "editfy",            // nome no banco (acessos.curso) e na loja dos plugins
    nome: "Editfy",
    paginasVenda: ["miai-editfy"],
    // plugin do Claude Code liberado por este curso: "name" do plugin.json, repositório privado e o texto da loja
    plugin: "editfy",        // o aluno instala com editfy@miai
    repo: "miostech/miai-plugin-editfy",
    descricaoPlugin: "Edita as suas videoaulas: legenda, cards, capítulos, inserções de telas e prints e a versão leve para a sua plataforma.",
    // US$ 97 (R$ 97 no Brasil); STRIPE_PAYMENT_LINK_EDITFY, se definida, é aceita junto
    linksPagamento: ["plink_1UVEa7RY9p8vsUUsYbv4uc39", process.env.STRIPE_PAYMENT_LINK_EDITFY].filter(Boolean),
    aulas: AULAS_EDITFY,
  },
  {
    endereco: "editfy-reels", // miaiacademy.com/editfy-reels (vendas) e miaiacademy.com/conta/editfy-reels (aulas)
    id: "editfy-reels",       // nome no banco (acessos.curso) e na loja dos plugins
    nome: "Editfy Reels",
    paginasVenda: ["miai-editfy-reels"],
    plugin: "editfy-reels",   // o aluno instala com editfy-reels@miai
    repo: "miostech/miai-plugin-editfy-reels",
    descricaoPlugin: "Edita os seus vídeos verticais: legenda com a palavra falada em destaque, título, cards e 45 efeitos que seguem o seu rosto, prontos para o Reels, TikTok e Shorts.",
    // Compra única antiga (US$ 97, R$ 97 no Brasil): não é mais vendida (desative o link no Stripe), mas continua
    // liberando quem pagou por ela. Quem comprou assim fica com as aulas e o plugin para sempre, sem o servidor.
    linksPagamento: ["plink_1UVEa9RY9p8vsUUsdFHAlweg", process.env.STRIPE_PAYMENT_LINK_EDITFY_REELS].filter(Boolean),
    // Pacotes de minutos do Editefy (vendidos em editefy.com, com a marca Editefy; desde 16/11/2026, no lugar da
    // assinatura): pagamento único, e cada compra soma os minutos ao saldo e vale 12 meses. Libera só o conector (o
    // Editefy no servidor, pelo Claude e pelo ChatGPT), sem as aulas e o plugin. O aviso do Stripe grava a compra na
    // tabela editfy_creditos (o servidor lê o saldo de lá) e manda o e-mail emailPacote (conta nova, com a senha) ou
    // emailContaExistente (quem já tem conta, sem trocar a senha). O reembolso tira o pacote.
    // As variáveis STRIPE_PAYMENT_LINK_EDITEFY_30/_60/_120, se definidas, são aceitas junto (ex.: links do modo de teste).
    emailPacote: "compra_editefy",
    emailContaExistente: "minutos_editefy",
    linkPacote: "https://www.editefy.com/comecar",
    pacotes: [
      {
        id: "editefy-30",
        nome: "30 minutos",
        minutos: 30,
        // US$ 62 (R$ 62 no Brasil)
        linksPagamento: ["plink_1UcRpFRY9p8vsUUsfCuTpsoo", process.env.STRIPE_PAYMENT_LINK_EDITEFY_30].filter(Boolean),
      },
      {
        id: "editefy-60",
        nome: "60 minutos",
        minutos: 60,
        // US$ 97 (R$ 97 no Brasil)
        linksPagamento: ["plink_1UcRpHRY9p8vsUUs39M1fQF9", process.env.STRIPE_PAYMENT_LINK_EDITEFY_60].filter(Boolean),
      },
      {
        id: "editefy-120",
        nome: "120 minutos",
        minutos: 120,
        // US$ 167 (R$ 167 no Brasil)
        linksPagamento: ["plink_1UcRpIRY9p8vsUUsqFFr71uA", process.env.STRIPE_PAYMENT_LINK_EDITEFY_120].filter(Boolean),
      },
    ],
    aulas: AULAS_EDITFY_REELS,
  },
  {
    // Editefy Sort para computador: o plugin do Claude Code que organiza os arquivos no Mac ou no Windows, sem mandar
    // os arquivos para o servidor. Vendido à parte do Editefy Sort no celular (EDITEFY_SORT, mais abaixo, o conector
    // de 12 meses): um não libera o outro. Compra única que vale para sempre, como o Editfy Reels (reembolso ou
    // bloqueio tiram o acesso). O aviso do Stripe libera o acesso e manda o e-mail compra_miai, com o botão para
    // miaiacademy.com/conta/editefy-sort, onde a aula "Instalar o plugin" mostra os comandos pessoais.
    // Fora da vitrine da MIAI (oculto no CATÁLOGO de miai/miai.js); o vercel.json manda miaiacademy.com/editefy-sort
    // para editefy.com/sort.
    endereco: "editefy-sort",        // miaiacademy.com/conta/editefy-sort (aulas)
    id: "editefy-sort-computador",   // nome no banco (acessos.curso e compras.curso); diferente do Sort do celular
    nome: "Editefy Sort para computador",
    plugin: "editefy-sort",          // "name" do plugin.json; o aluno instala com editefy-sort@miai
    repo: "miostech/miai-plugin-editefy-sort",
    descricaoPlugin: "Organiza no seu computador os vídeos, fotos, prints e áudios: dá a cada arquivo um nome que diz o que tem dentro e coloca na pasta certa, sem mandar os arquivos para o servidor.",
    // US$ 89 (R$ 89 no Brasil): ponha aqui o id do link (plink_...) quando ele for criado no Stripe.
    // STRIPE_PAYMENT_LINK_EDITEFY_SORT_COMPUTADOR, se definida, é aceita junto (ex.: o link do modo de teste).
    linksPagamento: [process.env.STRIPE_PAYMENT_LINK_EDITEFY_SORT_COMPUTADOR].filter(Boolean),
    aulas: AULAS_EDITEFY_SORT,
  },
];

// IA Academy: a Formação (antes curso gratuito) é paga na página inicial e assistida na área do aluno da IA Academy
// (curso.html). O link de pagamento também está em /formacao.js.
export const CURSOS_IA_ACADEMY = [
  {
    endereco: "formacao",
    id: "gratuito",        // nome no banco: era o curso gratuito (continua assim para manter o histórico e o painel)
    nome: "Formação IA Academy",
    paginasVenda: ["inicio", "miai-ia-academy"],   // a página inicial de iaacademy.bio e miaiacademy.com/ia-academy
    site: "iaacademy",    // e-mail de acesso da IA Academy, com o link da área do aluno de lá
    enderecoMiai: "ia-academy",                 // também à venda em miaiacademy.com/ia-academy
    linkAulas: "https://www.iaacademy.bio/curso", // na conta da MIAI, o curso leva para as aulas de lá
    // US$ 98 (R$ 98 no Brasil); depois os antigos: US$ 19 e o só em reais
    linksPagamento: ["plink_1UUt0oRY9p8vsUUs3WsVrQbX", "plink_1UUsf2RY9p8vsUUs3jVvTTDK", "plink_1UUresRY9p8vsUUs8Pm4dSUd", process.env.STRIPE_PAYMENT_LINK_FORMACAO],
  },
];

export const cursoPorEndereco = (endereco) => CURSOS_MIAI.find((c) => c.endereco === endereco) || null;
export const cursoPorId = (id) => CURSOS_MIAI.find((c) => c.id === id) || null;

// Planos de assinatura de todos os cursos, cada um com o seu curso: [{ curso, plano }]
export const PLANOS = CURSOS_MIAI.flatMap((curso) => (curso.planos || []).map((plano) => ({ curso, plano })));
// { curso, plano } do link de pagamento (plink_...) ou do produto (prod_...) do Stripe, ou null
export const planoPorLinkPagamento = (link) => (link && PLANOS.find((p) => p.plano.linksPagamento.includes(link))) || null;
export const planoPorProduto = (produto) => (produto && PLANOS.find((p) => p.plano.produtos.includes(produto))) || null;

// Editefy Sort (vendido em editefy.com, à parte do Editefy): organiza uma pilha de vídeos, fotos e áudios conversando,
// num conector próprio (sort.editefy.com, com o mesmo login do Editefy). Pagamento único que dá 12 meses de acesso,
// sem minutos (o Sort não gasta os minutos do Editefy). Não é um curso: sem aulas, sem plugin e fora da conta da MIAI
// e do painel. O aviso do Stripe grava cada compra em editefy_sort_acessos (o servidor do Sort confere o acesso lá):
// quem compra com tempo sobrando de uma compra anterior ganha os 12 meses somados ao vencimento atual. O reembolso
// tira o acesso daquela compra. E-mails: emailPacote (conta nova, com a senha) ou emailContaExistente (quem já tem
// conta, sem trocar a senha), os dois com o vencimento e o passo a passo para conectar.
// STRIPE_PAYMENT_LINK_EDITEFY_SORT, se definida, é aceita junto (ex.: o link do modo de teste).
export const EDITEFY_SORT = {
  id: "editefy-sort",
  nome: "Editefy Sort",
  emailPacote: "compra_editefy_sort",
  emailContaExistente: "acesso_editefy_sort",
  linkPacote: "https://www.editefy.com/sort#conectar",   // o botão do e-mail: o passo a passo do Claude, ChatGPT e Grok
  pacotes: [
    {
      id: "sort-12-meses",   // editefy_sort_acessos.pacote e compras.curso
      nome: "12 meses",
      meses: 12,
      // US$ 98 (R$ 98 no Brasil), produto "Editefy Sort" no Stripe (buy.stripe.com/7sY7sN56e3CpdLhf1M67S0c)
      linksPagamento: ["plink_1UfO11RY9p8vsUUss2DcyVuY", process.env.STRIPE_PAYMENT_LINK_EDITEFY_SORT].filter(Boolean),
    },
  ],
};

// Pacotes de todos os cursos e do Sort, cada um com o seu curso (ou produto): [{ curso, pacote }]
export const PACOTES = [...CURSOS_MIAI, EDITEFY_SORT]
  .flatMap((curso) => (curso.pacotes || []).map((pacote) => ({ curso, pacote })));
// { curso, pacote } do link de pagamento (plink_...) do Stripe, ou null
export const pacotePorLinkPagamento = (link) => (link && PACOTES.find((p) => p.pacote.linksPagamento.includes(link))) || null;
// { curso, pacote } pelo id do pacote (o que fica em compras.curso), ou null
export const pacotePorId = (id) => PACOTES.find((p) => p.pacote.id === id) || null;
export const ehPacote = (id) => !!pacotePorId(id);

// Curso do link de pagamento: o de uma compra única, o de um pacote de minutos ou o de um plano de assinatura
export const cursoPorLinkPagamento = (link) =>
  (link && [...CURSOS_MIAI, ...CURSOS_IA_ACADEMY].find((c) => c.linksPagamento.includes(link)))
  || (pacotePorLinkPagamento(link) || {}).curso || (planoPorLinkPagamento(link) || {}).curso || null;

export const totalDeAulas = (aulas) => aulas.modulos.reduce((soma, m) => soma + m.aulas.length, 0);

// Endereço de uma página da MIAI (ex.: linkMiai("/conta/ia-work")). Vazio quando MIAI_URL não foi definida.
export function linkMiai(caminho = "") {
  const base = String(process.env.MIAI_URL || "").trim().replace(/\/+$/, "");
  return base ? base + caminho : "";
}
