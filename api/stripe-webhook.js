// Recebe os avisos (webhook) do Stripe sobre as compras dos cursos pagos (Formação IA Academy, IA Work e os próximos
// da MIAI) e libera ou tira o acesso ao curso comprado. O curso é descoberto pelo link de pagamento (api/_cursos.js).
//   checkout.session.completed               → guarda a compra; se já está paga (cartão), libera o acesso
//   checkout.session.async_payment_succeeded → pagamento confirmado depois (Pix): libera o acesso
//   checkout.session.async_payment_failed    → Pix não pago a tempo: marca a compra como "falhou"
//   charge.refunded, refund.created, refund.updated → reembolso total (garantia de 7 dias): tira o acesso
// Ao liberar, cria o login (ou troca a senha de quem já é aluno) e manda o e-mail com a senha: "acesso" para a
// Formação IA Academy; para os cursos da MIAI, "compra_miai" (com MIAI_URL definida) ou "compra".
// O id do cadastro (client_reference_id, preenchido pela página) liga a compra ao lead do formulário.
//
// Variáveis de ambiente:
//   STRIPE_SECRET_KEY      chave secreta do Stripe (sk_live_... ou sk_test_...)
//   STRIPE_WEBHOOK_SECRET  segredo do webhook (whsec_...), em Stripe → Desenvolvedores → Webhooks
//   STRIPE_PAYMENT_LINK    id do link de pagamento do IA Work (plink_...), usado em api/_cursos.js. A conta do Stripe
//                          também recebe pagamentos de outros produtos: só as compras feitas pelos links dos cursos
//                          liberam alguma coisa.
//   + as do Supabase (api/_supabase.js) e do Resend (api/_emails.js)
import Stripe from "stripe";
import { banco, normalizarEmail } from "./_supabase.js";
import { liberarAcesso, linkCurso } from "./_alunos.js";
import { enviarEmail } from "./_emails.js";
import { cursoPorLinkPagamento, linkMiai } from "./_cursos.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_nao_configurada");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O Stripe assina o corpo exatamente como enviou, então a conferência usa o corpo cru (sem ler req.body).
async function corpoBruto(req) {
  const partes = [];
  for await (const parte of req) partes.push(typeof parte === "string" ? Buffer.from(parte) : parte);
  return Buffer.concat(partes);
}

function idDe(valor) {
  return typeof valor === "string" ? valor : (valor && valor.id) || null;
}

// Curso comprado nesta sessão de pagamento, ou null quando é a compra de outro produto da conta do Stripe
function cursoDaSessao(sessao) {
  return cursoPorLinkPagamento(idDe(sessao.payment_link));
}

// Guarda (ou atualiza) a compra. Uma compra paga ou reembolsada nunca volta para "aguardando" ou "falhou",
// mesmo que os avisos do Stripe cheguem fora de ordem.
async function registrarCompra(sessao, curso, status) {
  const db = banco();
  const { data: atual, error: erroBusca } = await db
    .from("compras").select("id, status").eq("stripe_sessao", sessao.id).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (atual && ["pago", "reembolsado"].includes(atual.status) && ["aguardando", "falhou"].includes(status)) {
    return atual;
  }

  const cliente = sessao.customer_details || {};
  const linha = {
    stripe_sessao: sessao.id,
    stripe_pagamento: idDe(sessao.payment_intent),
    status: atual && atual.status === "reembolsado" ? "reembolsado" : status,
    email: normalizarEmail(cliente.email || sessao.customer_email),
    nome: (cliente.name || (sessao.collected_information && sessao.collected_information.individual_name) || "").trim() || null,
    curso: curso.id,
    valor: sessao.amount_total,
    moeda: sessao.currency,
    desconto: sessao.total_details ? sessao.total_details.amount_discount : null,
    referencia: sessao.client_reference_id || null,
  };
  const { data, error } = await db.from("compras")
    .upsert(linha, { onConflict: "stripe_sessao" }).select("id, status").single();
  if (error) throw error;
  return data;
}

// Libera o curso comprado e manda a senha por e-mail, uma única vez por compra
// (o Stripe pode mandar o mesmo aviso mais de uma vez).
async function liberarCompra(sessao, curso) {
  const db = banco();
  const compra = await registrarCompra(sessao, curso, "pago");
  if (compra.status !== "pago") return;

  const { data: reservada, error: erroReserva } = await db.from("compras")
    .update({ liberado_em: new Date().toISOString() })
    .eq("id", compra.id).is("liberado_em", null).select("id, email, nome").maybeSingle();
  if (erroReserva) throw erroReserva;
  if (!reservada) return; // já liberada antes

  try {
    const leadId = UUID.test(String(sessao.client_reference_id || "")) ? sessao.client_reference_id : null;
    const conta = await liberarAcesso({
      nome: reservada.nome, email: reservada.email, curso: curso.id, origem: "stripe", referencia: sessao.id, leadId,
    });
    await db.from("compras").update({ aluno_id: conta.alunoId }).eq("id", compra.id);

    const primeiroNome = String(reservada.nome || "").trim().split(/\s+/)[0] || "aluno(a)";
    const envio = await enviarEmail(
      curso.site === "iaacademy" ? "acesso" : linkMiai() ? "compra_miai" : "compra",
      reservada.email,
      { NOME: primeiroNome, EMAIL_ALUNO: reservada.email, SENHA: conta.senha, LINK_CURSO: linkCurso(curso.id), CURSO: curso.nome },
      `compra-${sessao.id}`
    );
    if (!envio.ok) {
      console.error(`Compra ${sessao.id} liberada, mas o e-mail com a senha não foi enviado. O aluno pode usar "Esqueci minha senha".`);
    }
  } catch (erro) {
    // Desfaz a reserva para o próximo aviso do Stripe tentar de novo
    await db.from("compras").update({ liberado_em: null }).eq("id", compra.id);
    throw erro;
  }
}

// Reembolso total: marca a compra e tira o acesso ao curso comprado.
// valorReembolsado (em centavos) vem dos eventos refund.*; se for menor que o valor pago, é parcial e o acesso continua.
async function marcarReembolso(pagamento, valorReembolsado = null) {
  if (!pagamento) return;
  const db = banco();
  const { data: compras, error } = await db.from("compras").select("id, valor, aluno_id, curso").eq("stripe_pagamento", pagamento);
  if (error) throw error;
  if (!compras || !compras.length) return; // pagamento de outro produto da conta
  for (const compra of compras) {
    if (valorReembolsado !== null && compra.valor && valorReembolsado < compra.valor) {
      console.log(`Reembolso parcial em ${pagamento}: o acesso continua liberado.`);
      continue;
    }
    const { error: erroCompra } = await db.from("compras").update({ status: "reembolsado" }).eq("id", compra.id);
    if (erroCompra) throw erroCompra;
    if (!compra.aluno_id) continue;
    const { error: erroAcesso } = await db.from("acessos")
      .update({ revogado_em: new Date().toISOString() })
      .eq("aluno_id", compra.aluno_id).eq("curso", compra.curso).is("revogado_em", null);
    if (erroAcesso) throw erroAcesso;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("Defina STRIPE_WEBHOOK_SECRET nas variáveis de ambiente.");
    return res.status(500).json({ erro: "Webhook não configurado." });
  }

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(await corpoBruto(req), req.headers["stripe-signature"], segredo);
  } catch (erro) {
    console.error("Aviso do Stripe com assinatura inválida:", erro.message);
    return res.status(400).json({ erro: "Assinatura inválida." });
  }

  try {
    const objeto = evento.data.object;
    const curso = evento.type.startsWith("checkout.session.") ? cursoDaSessao(objeto) : null;
    switch (evento.type) {
      case "checkout.session.completed":
        if (!curso) break;
        if (objeto.payment_status === "paid") await liberarCompra(objeto, curso);
        else await registrarCompra(objeto, curso, "aguardando"); // Pix: espera a confirmação
        break;
      case "checkout.session.async_payment_succeeded":
        if (curso) await liberarCompra(objeto, curso);
        break;
      case "checkout.session.async_payment_failed":
        if (curso) await registrarCompra(objeto, curso, "falhou");
        break;
      case "charge.refunded":
        if (objeto.refunded) await marcarReembolso(idDe(objeto.payment_intent));
        else console.log(`Reembolso parcial em ${objeto.id}: o acesso continua liberado.`);
        break;
      case "refund.created":
      case "refund.updated":
        if (objeto.status === "succeeded") await marcarReembolso(idDe(objeto.payment_intent), objeto.amount);
        break;
      default:
        break; // outros avisos não mudam nada aqui
    }
    return res.status(200).json({ recebido: true });
  } catch (erro) {
    console.error(`Erro ao processar ${evento.type} (${evento.id}):`, erro);
    return res.status(500).json({ erro: "Falha ao processar o aviso. O Stripe vai tentar de novo." });
  }
}
