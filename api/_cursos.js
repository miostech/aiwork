// Cursos vendidos na MIAI Academy (miaiacademy.com). Cada curso tem a sua página de vendas, o seu link de
// pagamento no Stripe e as suas aulas; na conta, a pessoa só vê os cursos que comprou.
//
// Para lançar um curso novo:
//   1. escreva as aulas num arquivo como api/_aulas-iawork.js e importe aqui
//   2. crie o produto e o link de pagamento no Stripe e coloque o id do link (plink_...) em linkPagamento
//   3. crie a página de vendas em miai/cursos/<endereco>.html e o bloco do curso no CATÁLOGO de miai/miai.js
//
// Variável de ambiente:
//   MIAI_URL  endereço da MIAI Academy (ex.: https://miaiacademy.com). Enquanto estiver vazia, os e-mails de
//             compra continuam como antes, com o link da área do aluno da IA Academy.
import { CURSO as AULAS_IAWORK } from "./_aulas-iawork.js";

export const CURSOS_MIAI = [
  {
    endereco: "ia-work",   // miaiacademy.com/ia-work (vendas) e miaiacademy.com/conta/ia-work (aulas)
    id: "pago",            // nome no banco (acessos.curso e compras.curso): o IA Work nasceu como "pago" na IA Academy
    nome: "IA Work",
    linkPagamento: process.env.STRIPE_PAYMENT_LINK || "plink_1USLFxRY9p8vsUUshLZlyAb9",
    aulas: AULAS_IAWORK,
  },
];

export const cursoPorEndereco = (endereco) => CURSOS_MIAI.find((c) => c.endereco === endereco) || null;
export const cursoPorId = (id) => CURSOS_MIAI.find((c) => c.id === id) || null;
export const cursoPorLinkPagamento = (link) => (link && CURSOS_MIAI.find((c) => c.linkPagamento === link)) || null;

export const totalDeAulas = (aulas) => aulas.modulos.reduce((soma, m) => soma + m.aulas.length, 0);

// Endereço de uma página da MIAI (ex.: linkMiai("/conta/ia-work")). Vazio quando MIAI_URL não foi definida.
export function linkMiai(caminho = "") {
  const base = String(process.env.MIAI_URL || "").trim().replace(/\/+$/, "");
  return base ? base + caminho : "";
}
