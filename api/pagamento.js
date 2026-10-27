// Confere o pagamento da Formação IA Academy quando o Stripe devolve a pessoa para a cadastro.html.
//   GET /api/pagamento?sessao=cs_... → { status: "pago" | "aguardando" | "nao_pago", email, nome }
//     pago       → pagamento confirmado: o cadastro segue para as orientações
//     aguardando → pedido feito, pagamento ainda não confirmado (ex.: Pix): a página confere de novo
//     nao_pago   → sessão de outro produto, não encontrada ou não paga
// Quem libera as aulas e manda a senha é o aviso do Stripe (api/stripe-webhook.js); aqui só se lê a sessão.
import Stripe from "stripe";
import { CURSOS_IA_ACADEMY } from "./_cursos.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_nao_configurada");
const LINKS = CURSOS_IA_ACADEMY.flatMap((c) => c.linksPagamento).filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ erro: "Use GET." });
  }
  res.setHeader("Cache-Control", "no-store");

  const sessao = String((req.query && req.query.sessao) || "");
  if (!/^cs_(live|test)_\w{10,200}$/.test(sessao)) return res.status(400).json({ status: "nao_pago" });

  try {
    const s = await stripe.checkout.sessions.retrieve(sessao);
    const link = typeof s.payment_link === "string" ? s.payment_link : s.payment_link && s.payment_link.id;
    if (!LINKS.includes(link)) return res.status(200).json({ status: "nao_pago" });
    const status = s.payment_status === "paid" || s.payment_status === "no_payment_required"
      ? "pago"
      : s.status === "complete" ? "aguardando" : "nao_pago";
    const cliente = s.customer_details || {};
    // nome e e-mail do pagamento: o cadastro usa para quem comprou sem passar pelo formulário (ex.: pela MIAI)
    return res.status(200).json({ status, email: cliente.email || "", nome: cliente.name || "" });
  } catch (erro) {
    if (erro && (erro.statusCode === 404 || erro.code === "resource_missing")) {
      return res.status(200).json({ status: "nao_pago" });
    }
    console.error("Não foi possível conferir o pagamento:", erro.message || erro);
    return res.status(503).json({ status: "erro" });
  }
}
