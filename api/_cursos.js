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
//
// Variável de ambiente:
//   MIAI_URL  endereço da MIAI Academy (ex.: https://miaiacademy.com). Enquanto estiver vazia, os e-mails de
//             compra continuam como antes, com o link da área do aluno da IA Academy.
import { CURSO as AULAS_IAWORK } from "./_aulas-iawork.js";
import { CURSO as AULAS_CANAL_DARK } from "./_aulas-canal-dark.js";

export const CURSOS_MIAI = [
  {
    endereco: "ia-work",   // miaiacademy.com/ia-work (vendas) e miaiacademy.com/conta/ia-work (aulas)
    id: "pago",            // nome no banco (acessos.curso e compras.curso): o IA Work nasceu como "pago" na IA Academy
    nome: "IA Work",
    // US$ 497 (R$ 497 no Brasil); depois os antigos: US$ 99 e o só em reais
    linksPagamento: ["plink_1UUt0pRY9p8vsUUs8Yq5Miq1", "plink_1UUsf2RY9p8vsUUsv2vZuZMC", "plink_1USLFxRY9p8vsUUshLZlyAb9", process.env.STRIPE_PAYMENT_LINK],
    aulas: AULAS_IAWORK,
  },
  {
    endereco: "canal-dark",  // miaiacademy.com/canal-dark (vendas) e miaiacademy.com/conta/canal-dark (aulas)
    id: "canal-dark",
    nome: "Canal Dark com IA",
    // plugin do Claude Code liberado por este curso: "name" do plugin.json, repositório privado e o texto da loja
    plugin: "canal-dark",
    repo: "miostech/miai-plugin-canal-dark",
    descricaoPlugin: "Vídeos para canal dark (TikTok, Reels, Shorts) narrados em português, com apresentador 2D e voz gratuita.",
    // crie o link de pagamento no Stripe e coloque o id (plink_...) aqui ou em STRIPE_PAYMENT_LINK_CANAL_DARK
    linksPagamento: [process.env.STRIPE_PAYMENT_LINK_CANAL_DARK],
    aulas: AULAS_CANAL_DARK,
  },
];

// IA Academy: a Formação (antes curso gratuito) é paga na página inicial e assistida na área do aluno da IA Academy
// (curso.html). O link de pagamento também está em /formacao.js.
export const CURSOS_IA_ACADEMY = [
  {
    endereco: "formacao",
    id: "gratuito",        // nome no banco: era o curso gratuito (continua assim para manter o histórico e o painel)
    nome: "Formação IA Academy",
    site: "iaacademy",     // e-mail de acesso da IA Academy, com o link da área do aluno de lá
    // US$ 98 (R$ 98 no Brasil); depois os antigos: US$ 19 e o só em reais
    linksPagamento: ["plink_1UUt0oRY9p8vsUUs3WsVrQbX", "plink_1UUsf2RY9p8vsUUs3jVvTTDK", "plink_1UUresRY9p8vsUUs8Pm4dSUd", process.env.STRIPE_PAYMENT_LINK_FORMACAO],
  },
];

export const cursoPorEndereco = (endereco) => CURSOS_MIAI.find((c) => c.endereco === endereco) || null;
export const cursoPorId = (id) => CURSOS_MIAI.find((c) => c.id === id) || null;
export const cursoPorLinkPagamento = (link) =>
  (link && [...CURSOS_MIAI, ...CURSOS_IA_ACADEMY].find((c) => c.linksPagamento.includes(link))) || null;

export const totalDeAulas = (aulas) => aulas.modulos.reduce((soma, m) => soma + m.aulas.length, 0);

// Endereço de uma página da MIAI (ex.: linkMiai("/conta/ia-work")). Vazio quando MIAI_URL não foi definida.
export function linkMiai(caminho = "") {
  const base = String(process.env.MIAI_URL || "").trim().replace(/\/+$/, "");
  return base ? base + caminho : "";
}
