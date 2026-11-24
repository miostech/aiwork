// Recebe os avisos (webhook) do Stripe sobre as compras dos cursos pagos (Formação IA Academy, IA Work e os da MIAI) e
// sobre as assinaturas (Editfy Reels), e libera ou tira o acesso. O curso é descoberto pelo link de pagamento e, nas
// assinaturas, o plano pelo produto do Stripe (api/_cursos.js).
//
// Compras (preço único):
//   checkout.session.completed               → guarda a compra; se já está paga (cartão) ou saiu de graça com um
//                                              cupom de 100%, libera o acesso
//   checkout.session.async_payment_succeeded → pagamento confirmado depois (Pix): libera o acesso
//   checkout.session.async_payment_failed    → Pix não pago a tempo: marca a compra como "falhou"
//   charge.refunded, refund.created, refund.updated → reembolso total (garantia de 7 dias): tira o acesso
// Ao liberar, cria o login (ou troca a senha de quem já é aluno) e manda o e-mail com a senha: "acesso" para a
// Formação IA Academy; para os cursos da MIAI, "compra_miai" (com MIAI_URL definida) ou "compra".
// A entrega e o reembolso de cada tipo de produto ficam em api/_entregas.js, os mesmos das vendas pela Hotmart.
// O id do cadastro (client_reference_id, preenchido pela página) liga a compra ao lead do formulário.
//
// Pacotes de minutos (cursos com "pacotes" em api/_cursos.js, como o Editefy): pagamento único, como uma compra
//   checkout.session.completed / async_payment_succeeded → cria o login (quem já tem conta continua com a senha),
//                                              grava o pacote em editfy_creditos (o servidor do Editefy lê o saldo de lá)
//                                              e manda emailPacote (conta nova, com a senha) ou emailContaExistente
//   reembolso total                          → tira o pacote (revogado_em em editfy_creditos)
//
// Editefy Sort para computador (o curso de marca "editefy" em api/_cursos.js, um plugin): pagamento único, como uma
//   compra, mas quem já tem conta continua com a senha; cria a licença do plugin e manda emailCompra (conta nova, com
//   a senha) ou emailContaExistente, os dois com os comandos de instalação da loja "editefy". Reembolso: tira o acesso.
//
// Editefy Sort (EDITEFY_SORT em api/_cursos.js, um pacote de 12 meses de acesso): pagamento único, como um pacote
//   checkout.session.completed / async_payment_succeeded → cria o login (quem já tem conta continua com a senha),
//                                              grava a compra em editefy_sort_acessos (o servidor do Sort confere o
//                                              acesso lá) com o vencimento: 12 meses a partir de hoje ou, se ainda falta
//                                              tempo de uma compra anterior, a partir do vencimento atual
//   reembolso total                          → tira aquela compra (revogado_em) e refaz o vencimento das outras
//
// Assinaturas (cursos com "planos" em api/_cursos.js; nenhum curso vende assim hoje):
//   checkout.session.completed               → primeira mensalidade: cria o login e manda a senha, como numa compra
//   customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed
//                                            → acerta os acessos pelo estado da assinatura no Stripe (sempre lido na
//                                              hora, então a ordem dos avisos não importa):
//                                              ativa, ou com pagamento atrasado enquanto o Stripe tenta cobrar de novo
//                                                → o acesso do plano dela (e o do curso, com as aulas e o plugin,
//                                                  menos nos cursos com assinaturaLiberaCurso: false, como o Editefy)
//                                              troca de plano (upgrade ou downgrade) → troca o acesso do plano
//                                              cancelada, não paga de vez, pausada ou expirada → tira os dois
//   invoice.paid                             → também guarda a mensalidade em "compras" (uma linha por fatura in_...)
//   reembolso total de uma mensalidade       → cancela a assinatura na hora (e com isso tira o acesso)
// Quem já tinha o curso por compra única ou cortesia continua com as aulas e o plugin quando a assinatura acaba: a
// assinatura só tira o acesso do curso que ela mesma deu (origem "assinatura" e referência = id da assinatura).
// Para tirar o acesso de quem assina, cancele a assinatura no Stripe ou marque o aluno como bloqueado.
//
// Variáveis de ambiente:
//   STRIPE_SECRET_KEY      chave secreta do Stripe (sk_live_... ou sk_test_...)
//   STRIPE_WEBHOOK_SECRET  segredo do webhook (whsec_...), em Stripe → Desenvolvedores → Webhooks
//   STRIPE_PAYMENT_LINK    opcional: id de mais um link de pagamento do IA Work (plink_...), aceito junto com os de
//                          api/_cursos.js. A conta do Stripe também recebe pagamentos de outros produtos: só as compras
//                          feitas pelos links dos cursos liberam alguma coisa.
//   + as do Supabase (api/_supabase.js), do Resend (api/_emails.js) e as opcionais dos planos (api/_cursos.js)
import Stripe from "stripe";
import { banco, normalizarEmail } from "./_supabase.js";
import { entregarCompra, revogarCompra } from "./_entregas.js";
import { PLANOS, cursoPorLinkPagamento, pacotePorLinkPagamento, planoPorProduto } from "./_cursos.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_nao_configurada");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Assinatura que dá acesso: em dia, em teste grátis ou com a cobrança atrasada enquanto o Stripe tenta de novo
// (o Stripe só desiste depois das novas tentativas, e aí a assinatura vira "canceled" ou "unpaid")
const ASSINATURA_ATIVA = new Set(["active", "trialing", "past_due"]);

// O Stripe assina o corpo exatamente como enviou, então a conferência usa o corpo cru (sem ler req.body).
async function corpoBruto(req) {
  const partes = [];
  for await (const parte of req) partes.push(typeof parte === "string" ? Buffer.from(parte) : parte);
  return Buffer.concat(partes);
}

function idDe(valor) {
  return typeof valor === "string" ? valor : (valor && valor.id) || null;
}

// Curso comprado nesta sessão de pagamento, ou null quando é a compra de outro produto da conta do Stripe.
// Num pacote de minutos, o curso vem com o id do pacote (o que fica em compras.curso) e o pacote em "pacote".
function cursoDaSessao(sessao) {
  const link = idDe(sessao.payment_link);
  const achado = pacotePorLinkPagamento(link);
  if (achado) return { ...achado.curso, id: achado.pacote.id, pacote: achado.pacote };
  return cursoPorLinkPagamento(link);
}

// ── Assinaturas ──

// Plano de um produto (prod_...): pelos ids de api/_cursos.js ou, se não estiver lá, pelos produtos que os links de
// pagamento dos planos vendem (lidos no Stripe uma vez por instância). Assim basta o id do link de cada plano.
let produtosDosLinks = null;
async function planoDoProduto(produto) {
  if (!produto) return null;
  const achado = planoPorProduto(produto);
  if (achado) return achado;
  if (!produtosDosLinks) {
    const mapa = new Map();
    let completo = true;
    for (const item of PLANOS) {
      for (const link of item.plano.linksPagamento) {
        try {
          const linhas = await stripe.paymentLinks.listLineItems(link, { limit: 10 });
          for (const linha of linhas.data) {
            const prod = idDe(linha.price && linha.price.product);
            if (prod) mapa.set(prod, item);
          }
        } catch (erro) {
          console.error(`Não li os produtos do link ${link} (${item.plano.id}):`, erro.message);
          if (erro.code !== "resource_missing") completo = false; // falha passageira: tenta de novo no próximo aviso
        }
      }
    }
    if (!completo) return mapa.get(produto) || null;
    produtosDosLinks = mapa;
  }
  return produtosDosLinks.get(produto) || null;
}

// { curso, plano } da assinatura, pelo produto dos itens dela, ou null quando é de outro produto da conta
async function planoDaAssinatura(assinatura) {
  for (const item of (assinatura.items && assinatura.items.data) || []) {
    const achado = await planoDoProduto(idDe(item.price && item.price.product) || idDe(item.plan && item.plan.product));
    if (achado) return achado;
  }
  return null;
}

// Assinatura de uma fatura (a versão nova da API do Stripe guarda em parent.subscription_details)
function assinaturaDaFatura(fatura) {
  const detalhes = fatura.parent && fatura.parent.subscription_details;
  return idDe(fatura.subscription) || idDe(detalhes && detalhes.subscription) || null;
}

// Pagamento (pi_...) de uma fatura, usado para achar a mensalidade no reembolso
async function pagamentoDaFatura(fatura) {
  if (!fatura) return null;
  if (typeof fatura === "object" && fatura.payment_intent) return idDe(fatura.payment_intent); // versão antiga da API
  const { data } = await stripe.invoicePayments.list({ invoice: idDe(fatura), limit: 10 });
  const pago = (data || []).find((p) => p.status === "paid") || (data || [])[0];
  return (pago && pago.payment && idDe(pago.payment.payment_intent)) || null;
}

function emailDoCliente(assinatura) {
  const cliente = assinatura.customer;
  return cliente && typeof cliente === "object" && !cliente.deleted ? cliente.email || null : null;
}

// Aluno da assinatura: quem já tem um acesso dela ou, na primeira vez, o aluno com o e-mail do cliente no Stripe
async function alunoDaAssinatura(db, assinatura) {
  const { data: acesso, error } = await db.from("acessos").select("aluno_id")
    .eq("referencia", assinatura.id).limit(1).maybeSingle();
  if (error) throw error;
  if (acesso) return acesso.aluno_id;
  const email = normalizarEmail(emailDoCliente(assinatura) || "");
  if (!email) return null;
  const { data: aluno, error: erroAluno } = await db.from("alunos").select("id").eq("email", email).maybeSingle();
  if (erroAluno) throw erroAluno;
  return aluno ? aluno.id : null;
}

// Deixa os acessos do aluno iguais ao estado atual da assinatura no Stripe. Pode rodar quantas vezes for preciso.
// Devolve { curso, plano, alunoId, ativa, email }, ou null quando a assinatura não é de nenhum plano.
async function sincronizarAssinatura(id, alunoConhecido = null) {
  const assinatura = await stripe.subscriptions.retrieve(id, { expand: ["customer"] });
  const achado = await planoDaAssinatura(assinatura);
  if (!achado) {
    console.log(`Assinatura ${id} não é de nenhum plano dos cursos: nada mudou.`);
    return null;
  }
  const { curso, plano } = achado;
  const db = banco();
  const alunoId = alunoConhecido || (await alunoDaAssinatura(db, assinatura));
  const resultado = { curso, plano, alunoId, ativa: ASSINATURA_ATIVA.has(assinatura.status), email: emailDoCliente(assinatura) };
  if (!alunoId) {
    // Ainda sem login: o checkout.session.completed cria a conta, manda a senha e sincroniza de novo
    console.log(`Assinatura ${id} (${assinatura.status}) ainda sem aluno: espera o pagamento do checkout.`);
    return resultado;
  }
  const agora = new Date().toISOString();

  // Plano: só o plano atual fica ativo (os outros planos que esta assinatura deu são tirados)
  for (const p of curso.planos) {
    if (resultado.ativa && p.id === plano.id) {
      const { error } = await db.from("acessos").upsert(
        { aluno_id: alunoId, curso: p.id, origem: "assinatura", referencia: id, revogado_em: null },
        { onConflict: "aluno_id,curso" }
      );
      if (error) throw error;
    } else {
      const { error } = await db.from("acessos").update({ revogado_em: agora })
        .eq("aluno_id", alunoId).eq("curso", p.id).eq("referencia", id).is("revogado_em", null);
      if (error) throw error;
    }
  }

  // Curso (aulas e plugin): a assinatura libera (menos onde assinaturaLiberaCurso é false, como no Editefy, que é só
  // o conector), mas só tira o que ela mesma liberou
  const liberaCurso = curso.assinaturaLiberaCurso !== false;
  const { data: acesso, error: erroBusca } = await db.from("acessos")
    .select("id, origem, referencia, revogado_em").eq("aluno_id", alunoId).eq("curso", curso.id).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (resultado.ativa && liberaCurso) {
    if (!acesso) {
      const { error } = await db.from("acessos")
        .insert({ aluno_id: alunoId, curso: curso.id, origem: "assinatura", referencia: id });
      if (error && error.code !== "23505") throw error; // 23505 = outro aviso criou ao mesmo tempo
    } else if (acesso.revogado_em) {
      // volta com o mesmo registro, então o progresso nas aulas continua
      const { error } = await db.from("acessos")
        .update({ origem: "assinatura", referencia: id, revogado_em: null }).eq("id", acesso.id);
      if (error) throw error;
    }
    // já ativo (por compra única, cortesia ou esta assinatura): fica como está
  } else if (acesso && !acesso.revogado_em && acesso.origem === "assinatura" && acesso.referencia === id) {
    const { error } = await db.from("acessos").update({ revogado_em: agora }).eq("id", acesso.id);
    if (error) throw error;
  }

  console.log(`Assinatura ${id} (${assinatura.status}): ${resultado.ativa ? `plano ${plano.id} ativo` : "acesso tirado"}.`);
  return resultado;
}

// Guarda uma mensalidade paga em "compras" (a linha é a da fatura; a primeira o checkout também preenche, com o
// nome e o lead). Fatura zerada (crédito de troca de plano, cupom de 100%) não entra.
async function registrarMensalidade(fatura, assinatura) {
  if (!fatura.amount_paid) return;
  const db = banco();
  const { data: atual, error: erroBusca } = await db
    .from("compras").select("id, status").eq("stripe_sessao", fatura.id).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (atual && atual.status === "reembolsado") return;

  const email = normalizarEmail(fatura.customer_email || assinatura.email || "");
  if (!email) {
    console.error(`Mensalidade ${fatura.id} sem e-mail do cliente: não guardei em compras.`);
    return;
  }
  const linha = {
    stripe_sessao: fatura.id,
    status: "pago",
    email,
    curso: assinatura.curso.id,
    valor: fatura.amount_paid,
    moeda: fatura.currency,
    desconto: (fatura.total_discount_amounts || []).reduce((soma, d) => soma + (d.amount || 0), 0),
  };
  if (!atual && fatura.customer_name) linha.nome = fatura.customer_name.trim() || null;
  if (assinatura.alunoId) linha.aluno_id = assinatura.alunoId;
  const pagamento = await pagamentoDaFatura(fatura);
  if (pagamento) linha.stripe_pagamento = pagamento;
  const { error } = await db.from("compras").upsert(linha, { onConflict: "stripe_sessao" });
  if (error) throw error;
}

// Reembolso total de uma mensalidade: cancela a assinatura na hora e acerta os acessos
async function cancelarAssinaturaDaFatura(idFatura) {
  const id = assinaturaDaFatura(await stripe.invoices.retrieve(idFatura));
  if (!id) return;
  const assinatura = await stripe.subscriptions.retrieve(id);
  if (!["canceled", "incomplete_expired"].includes(assinatura.status)) {
    await stripe.subscriptions.cancel(id);
    console.log(`Assinatura ${id} cancelada pelo reembolso da fatura ${idFatura}.`);
  }
  await sincronizarAssinatura(id);
}

// ── Compras ──

// Fatura da primeira mensalidade de uma sessão de assinatura
async function faturaDaSessao(sessao) {
  if (sessao.mode !== "subscription") return null;
  if (sessao.invoice) return idDe(sessao.invoice);
  if (!sessao.subscription) return null;
  return idDe((await stripe.subscriptions.retrieve(idDe(sessao.subscription))).latest_invoice);
}

// Guarda (ou atualiza) a compra. Uma compra paga ou reembolsada nunca volta para "aguardando" ou "falhou",
// mesmo que os avisos do Stripe cheguem fora de ordem. Nas assinaturas, a linha é a da fatura da primeira
// mensalidade (in_...), a mesma que o invoice.paid preenche: o pagamento conta uma vez só.
async function registrarCompra(sessao, curso, status) {
  const db = banco();
  const fatura = await faturaDaSessao(sessao);
  const chave = fatura || sessao.id;
  const { data: atual, error: erroBusca } = await db
    .from("compras").select("id, status").eq("stripe_sessao", chave).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (atual && ["pago", "reembolsado"].includes(atual.status) && ["aguardando", "falhou"].includes(status)) {
    return atual;
  }

  const cliente = sessao.customer_details || {};
  const linha = {
    stripe_sessao: chave,
    status: atual && atual.status === "reembolsado" ? "reembolsado" : status,
    email: normalizarEmail(cliente.email || sessao.customer_email),
    nome: (cliente.name || (sessao.collected_information && sessao.collected_information.individual_name) || "").trim() || null,
    curso: curso.id,
    valor: sessao.amount_total,
    moeda: sessao.currency,
    desconto: sessao.total_details ? sessao.total_details.amount_discount : null,
    referencia: sessao.client_reference_id || null,
  };
  // Sem o pagamento, não apaga o que o invoice.paid já guardou
  const pagamento = fatura ? await pagamentoDaFatura(fatura) : idDe(sessao.payment_intent);
  if (pagamento) linha.stripe_pagamento = pagamento;
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
    const assinatura = sessao.mode === "subscription" ? idDe(sessao.subscription) : null;
    await entregarCompra(db, {
      compraId: compra.id, nome: reservada.nome, email: reservada.email, curso, origem: "stripe", referencia: sessao.id,
      leadId, assinatura,
      sincronizar: async (id, alunoId) => {
        if (!(await sincronizarAssinatura(id, alunoId))) {
          throw new Error(`A assinatura ${id} não é de nenhum plano: confira os links dos planos em api/_cursos.js.`);
        }
      },
    });
  } catch (erro) {
    // Desfaz a reserva para o próximo aviso do Stripe tentar de novo
    await db.from("compras").update({ liberado_em: null }).eq("id", compra.id);
    throw erro;
  }
}

// Reembolso total: marca a compra e tira o acesso ao curso comprado. Num pacote de minutos, tira o pacote (o que
// sobrava sai do saldo). No Sort, tira o tempo daquela compra. Numa mensalidade, cancela a assinatura (a
// sincronização tira o plano e o curso que ela deu; quem também comprou o curso uma vez continua com ele).
// valorReembolsado (em centavos) vem dos eventos refund.*; se for menor que o valor pago, é parcial e o acesso continua.
async function marcarReembolso(pagamento, valorReembolsado = null) {
  if (!pagamento) return;
  const db = banco();
  const { data: compras, error } = await db.from("compras")
    .select("id, valor, aluno_id, curso, stripe_sessao").eq("stripe_pagamento", pagamento);
  if (error) throw error;
  if (!compras || !compras.length) return; // pagamento de outro produto da conta
  for (const compra of compras) {
    if (valorReembolsado !== null && compra.valor && valorReembolsado < compra.valor) {
      console.log(`Reembolso parcial em ${pagamento}: o acesso continua liberado.`);
      continue;
    }
    const { error: erroCompra } = await db.from("compras").update({ status: "reembolsado" }).eq("id", compra.id);
    if (erroCompra) throw erroCompra;
    if (String(compra.stripe_sessao).startsWith("in_")) {
      await cancelarAssinaturaDaFatura(compra.stripe_sessao);
      continue;
    }
    await revogarCompra(db, { alunoId: compra.aluno_id, curso: compra.curso, referencia: compra.stripe_sessao });
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
        // "no_payment_required": cupom de 100% (ex.: TESTDEV), total zero e nada a cobrar; libera como uma compra paga
        if (objeto.payment_status === "paid" || objeto.payment_status === "no_payment_required") await liberarCompra(objeto, curso);
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
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await sincronizarAssinatura(objeto.id);
        break;
      case "invoice.paid": {
        const assinatura = assinaturaDaFatura(objeto);
        const sincronizada = assinatura ? await sincronizarAssinatura(assinatura) : null;
        if (sincronizada) await registrarMensalidade(objeto, sincronizada);
        break;
      }
      case "invoice.payment_failed": {
        // O Stripe tenta cobrar de novo; enquanto isso a assinatura fica "past_due" e o acesso continua
        const assinatura = assinaturaDaFatura(objeto);
        const sincronizada = assinatura ? await sincronizarAssinatura(assinatura) : null;
        if (sincronizada) console.log(`Cobrança da fatura ${objeto.id} falhou (tentativa ${objeto.attempt_count || 1}).`);
        break;
      }
      default:
        break; // outros avisos não mudam nada aqui
    }
    return res.status(200).json({ recebido: true });
  } catch (erro) {
    console.error(`Erro ao processar ${evento.type} (${evento.id}):`, erro);
    return res.status(500).json({ erro: "Falha ao processar o aviso. O Stripe vai tentar de novo." });
  }
}
