// Recebe os avisos (webhook) da Hotmart sobre as vendas feitas por lá: os links que a Camila divulga nas redes
// sociais. No site, o pagamento continua no Stripe (api/stripe-webhook.js). Cada venda libera ou tira o acesso do mesmo
// jeito que uma compra pelo Stripe (api/_entregas.js): cria o login, libera o produto, manda o e-mail e, no reembolso,
// tira o que a compra deu. O produto é descoberto pelo id dele na Hotmart (PRODUTOS_HOTMART em api/_cursos.js); venda
// de outro produto da conta não mexe em nada.
//
// Eventos de pedido (Webhook 2.0.0 da Hotmart, developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook):
//   PURCHASE_APPROVED, PURCHASE_COMPLETE      → compra paga: libera e manda o e-mail, uma vez só por transação
//   PURCHASE_BILLET_PRINTED                   → boleto gerado, ainda sem pagamento: guarda a compra como "aguardando"
//   PURCHASE_EXPIRED                          → boleto ou Pix não pago a tempo: "falhou"
//   PURCHASE_CANCELED                         → não paga: "falhou"; se já estava paga, conta como reembolso
//   PURCHASE_REFUNDED, PURCHASE_CHARGEBACK    → reembolso ou contestação no cartão: tira o acesso (reembolso parcial,
//                                               status PARTIALLY_REFUNDED, não tira)
//   PURCHASE_PROTEST, PURCHASE_DELAYED        → pedido de reembolso aberto ou cobrança atrasada: nada muda
// A compra fica em "compras" com a transação da Hotmart (HP...) na coluna stripe_sessao, e as linhas de editfy_creditos,
// editefy_sort_acessos e acessos ficam com origem 'hotmart' e a transação em "referencia".
// A Hotmart manda o mesmo aviso de novo quando a resposta não é 2xx: tudo aqui pode rodar mais de uma vez.
//
// Variáveis de ambiente:
//   HOTMART_HOTTOK  o token da conta na Hotmart (Ferramentas → Webhook). Chega no cabeçalho X-HOTMART-HOTTOK de cada
//                   aviso; sem ele (ou diferente), o aviso é recusado.
//   + as do Supabase (api/_supabase.js) e do Resend (api/_emails.js)
import crypto from "node:crypto";
import { banco, normalizarEmail } from "./_supabase.js";
import { entregarCompra, revogarCompra } from "./_entregas.js";
import { produtoHotmart } from "./_cursos.js";

const PAGA = new Set(["PURCHASE_APPROVED", "PURCHASE_COMPLETE"]);
const REEMBOLSO = new Set(["PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK"]);

// O corpo cru (como no aviso do Stripe), lido uma vez só
async function corpoBruto(req) {
  const partes = [];
  for await (const parte of req) partes.push(typeof parte === "string" ? Buffer.from(parte) : parte);
  return Buffer.concat(partes);
}

// Compara o token sem dar pistas pelo tempo de resposta
function mesmoToken(recebido, esperado) {
  const a = Buffer.from(String(recebido || "")), b = Buffer.from(String(esperado || ""));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

// Guarda (ou atualiza) a compra. Uma compra paga ou reembolsada nunca volta para "aguardando" ou "falhou", mesmo que
// os avisos cheguem fora de ordem; uma reembolsada nunca volta para "pago".
async function registrarCompra(dados, curso, status) {
  const db = banco();
  const transacao = dados.purchase.transaction;
  const { data: atual, error: erroBusca } = await db
    .from("compras").select("id, status").eq("stripe_sessao", transacao).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (atual && ["pago", "reembolsado"].includes(atual.status) && ["aguardando", "falhou"].includes(status)) return atual;

  const comprador = dados.buyer || {};
  const preco = dados.purchase.price || dados.purchase.full_price || {};
  const linha = {
    stripe_sessao: transacao,
    status: atual && atual.status === "reembolsado" ? "reembolsado" : status,
    email: normalizarEmail(comprador.email || ""),
    nome: String(comprador.name || "").trim() || null,
    curso: curso.id,
    valor: Number.isFinite(Number(preco.value)) ? Math.round(Number(preco.value) * 100) : null,   // em centavos
    moeda: preco.currency_value ? String(preco.currency_value).toLowerCase() : null,
    desconto: null,
    referencia: null,
  };
  const { data, error } = await db.from("compras")
    .upsert(linha, { onConflict: "stripe_sessao" }).select("id, status").single();
  if (error) throw error;
  return data;
}

// Libera a compra paga e manda o e-mail, uma única vez por transação
async function liberarCompra(dados, curso) {
  const db = banco();
  const transacao = dados.purchase.transaction;
  const compra = await registrarCompra(dados, curso, "pago");
  if (compra.status !== "pago") return;

  const { data: reservada, error: erroReserva } = await db.from("compras")
    .update({ liberado_em: new Date().toISOString() })
    .eq("id", compra.id).is("liberado_em", null).select("id, email, nome").maybeSingle();
  if (erroReserva) throw erroReserva;
  if (!reservada) return; // já liberada antes

  try {
    await entregarCompra(db, {
      compraId: compra.id, nome: reservada.nome, email: reservada.email, curso, origem: "hotmart", referencia: transacao,
    });
  } catch (erro) {
    // Desfaz a reserva para o próximo aviso da Hotmart tentar de novo
    await db.from("compras").update({ liberado_em: null }).eq("id", compra.id);
    throw erro;
  }
}

// Reembolso, contestação ou cancelamento depois de paga: marca a compra e tira o que ela deu
async function reembolsar(dados, curso) {
  const db = banco();
  const transacao = dados.purchase.transaction;
  const { data: compra, error } = await db.from("compras")
    .select("id, aluno_id, curso").eq("stripe_sessao", transacao).maybeSingle();
  if (error) throw error;
  if (!compra) {
    // O aviso da compra não chegou (ou chegou depois): guarda já como reembolsada, e ela nunca é liberada
    await registrarCompra(dados, curso, "reembolsado");
    return;
  }
  const { error: erroCompra } = await db.from("compras").update({ status: "reembolsado" }).eq("id", compra.id);
  if (erroCompra) throw erroCompra;
  await revogarCompra(db, { alunoId: compra.aluno_id, curso: compra.curso, referencia: transacao });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  const segredo = process.env.HOTMART_HOTTOK;
  if (!segredo) {
    console.error("Defina HOTMART_HOTTOK nas variáveis de ambiente.");
    return res.status(500).json({ erro: "Webhook não configurado." });
  }
  if (!mesmoToken(req.headers["x-hotmart-hottok"], segredo)) {
    console.error("Aviso da Hotmart com o hottok errado ou sem ele.");
    return res.status(401).json({ erro: "Token inválido." });
  }

  let aviso;
  try {
    aviso = JSON.parse((await corpoBruto(req)).toString("utf8"));
  } catch (erro) {
    return res.status(400).json({ erro: "Corpo inválido." });
  }
  const evento = String(aviso.event || "");
  const dados = aviso.data || {};
  const transacao = dados.purchase && dados.purchase.transaction;
  const produto = dados.product || {};
  const curso = produtoHotmart(produto.id, produto.ucode);
  if (!curso || !transacao) {
    console.log(`Aviso ${evento} da Hotmart de outro produto (${produto.id || "?"}): nada mudou.`);
    return res.status(200).json({ recebido: true });
  }

  try {
    if (PAGA.has(evento)) {
      if (!dados.buyer || !dados.buyer.email) {
        console.error(`Venda ${transacao} da Hotmart sem o e-mail do comprador: não deu para liberar.`);
      } else {
        await liberarCompra(dados, curso);
      }
    } else if (REEMBOLSO.has(evento)) {
      if (dados.purchase.status === "PARTIALLY_REFUNDED") console.log(`Reembolso parcial em ${transacao}: o acesso continua.`);
      else await reembolsar(dados, curso);
    } else if (evento === "PURCHASE_CANCELED") {
      const { data: compra, error } = await banco().from("compras")
        .select("status").eq("stripe_sessao", transacao).maybeSingle();
      if (error) throw error;
      if (compra && compra.status === "pago") await reembolsar(dados, curso);
      else await registrarCompra(dados, curso, "falhou");
    } else if (evento === "PURCHASE_BILLET_PRINTED") {
      await registrarCompra(dados, curso, "aguardando");
    } else if (evento === "PURCHASE_EXPIRED") {
      await registrarCompra(dados, curso, "falhou");
    } else {
      console.log(`Aviso ${evento} da Hotmart em ${transacao}: nada mudou.`);
    }
    return res.status(200).json({ recebido: true });
  } catch (erro) {
    console.error(`Erro ao processar ${evento} da Hotmart (${aviso.id || transacao}):`, erro);
    return res.status(500).json({ erro: "Falha ao processar o aviso. A Hotmart vai tentar de novo." });
  }
}
