// Simulação das assinaturas do Editfy Reels no Mac, sem Stripe nem Supabase de verdade: um Stripe falso (com a
// conferência da assinatura dos avisos do Stripe de verdade) e um banco falso em memória.
// Rodar: npm test   (ou: node --test --experimental-test-module-mocks tests/)
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import StripeDeVerdade from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_simulacao";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_simulacao";
process.env.MIAI_URL = "https://www.miaiacademy.com";
// Só os links: o produto de cada plano é descoberto pelos links (listLineItems)
process.env.STRIPE_PAYMENT_LINK_EDITFY_REELS_60 = "plink_teste60";
process.env.STRIPE_PAYMENT_LINK_EDITFY_REELS_120 = "plink_teste120";
const LINK_COMPRA_UNICA = "plink_1UVEa9RY9p8vsUUsdFHAlweg";
// O PLANOS_MINUTOS que o Editfy no servidor precisa ter
const PLANOS_MINUTOS = { "editfy-reels-60": 60, "editfy-reels-120": 120 };

// ── Banco falso (o pedaço do supabase-js que as funções usam) ──
const tabelas = { alunos: [], acessos: [], compras: [], leads: [], licencas_plugin: [] };
const unicas = { alunos: [["id"]], acessos: [["aluno_id", "curso"]], compras: [["stripe_sessao"]], licencas_plugin: [["aluno_id"], ["codigo"]] };
const usuarios = []; // auth.users

class Consulta {
  constructor(tabela) {
    this.tabela = tabela; this.filtros = []; this.op = "select"; this.dados = null; this.conflito = null;
    this.modo = "lista"; this.limite = null;
  }
  select() { return this; }
  insert(dados) { this.op = "insert"; this.dados = dados; return this; }
  upsert(dados, opcoes) { this.op = "upsert"; this.dados = dados; this.conflito = (opcoes && opcoes.onConflict || "id").split(","); return this; }
  update(dados) { this.op = "update"; this.dados = dados; return this; }
  eq(c, v) { this.filtros.push((l) => l[c] === v); return this; }
  is(c, v) { this.filtros.push((l) => (l[c] ?? null) === v); return this; }
  in(c, v) { this.filtros.push((l) => v.includes(l[c])); return this; }
  order() { return this; }
  limit(n) { this.limite = n; return this; }
  single() { this.modo = "um"; return this; }
  maybeSingle() { this.modo = "talvez"; return this; }
  then(ok, falha) { return Promise.resolve().then(() => this.executar()).then(ok, falha); }

  novaLinha(dados) {
    return { id: crypto.randomUUID(), criado_em: new Date().toISOString(), revogado_em: null, liberado_em: null, ...dados };
  }
  violaUnica(linha, ignorar) {
    return (unicas[this.tabela] || []).some((cols) =>
      tabelas[this.tabela].some((l) => l !== ignorar && cols.every((c) => l[c] === linha[c])));
  }
  executar() {
    const t = tabelas[this.tabela];
    let linhas;
    if (this.op === "select") {
      linhas = t.filter((l) => this.filtros.every((f) => f(l)));
    } else if (this.op === "insert") {
      const nova = this.novaLinha(this.dados);
      if (this.violaUnica(nova)) return { data: null, error: { code: "23505", message: "duplicada" } };
      t.push(nova);
      linhas = [nova];
    } else if (this.op === "upsert") {
      const existente = t.find((l) => this.conflito.every((c) => l[c] === this.dados[c]));
      if (existente) Object.assign(existente, this.dados);
      else t.push(this.novaLinha(this.dados));
      linhas = [existente || t[t.length - 1]];
    } else if (this.op === "update") {
      linhas = t.filter((l) => this.filtros.every((f) => f(l)));
      linhas.forEach((l) => Object.assign(l, this.dados));
    }
    if (this.limite !== null) linhas = linhas.slice(0, this.limite);
    const copia = linhas.map((l) => ({ ...l }));
    if (this.modo === "um") return copia.length === 1 ? { data: copia[0], error: null } : { data: null, error: { message: "não é uma linha" } };
    if (this.modo === "talvez") return copia.length > 1 ? { data: null, error: { message: "mais de uma linha" } } : { data: copia[0] || null, error: null };
    return { data: copia, error: null };
  }
}

const db = {
  from: (tabela) => new Consulta(tabela),
  auth: {
    getUser: async (token) => {
      const u = usuarios.find((x) => "token-" + x.id === token);
      return u ? { data: { user: u }, error: null } : { data: null, error: { status: 401 } };
    },
    admin: {
      createUser: async ({ email }) => {
        if (usuarios.some((u) => u.email === email)) return { data: null, error: { code: "email_exists" } };
        const user = { id: crypto.randomUUID(), email };
        usuarios.push(user);
        return { data: { user }, error: null };
      },
      updateUserById: async () => ({ data: {}, error: null }),
      listUsers: async () => ({ data: { users: usuarios }, error: null }),
    },
  },
};

mock.module("../api/_supabase.js", {
  namedExports: {
    banco: () => db,
    normalizarEmail: (email) => String(email || "").trim().toLowerCase(),
    EMAIL_VALIDO: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    SUPABASE_URL: "http://simulacao", CHAVE_PUBLICA: "simulacao",
  },
});

const emails = [];
mock.module("../api/_emails.js", {
  namedExports: { enviarEmail: async (tipo, para, dados) => { emails.push({ tipo, para, dados }); return { ok: true, id: "simulado" }; } },
});

// ── Stripe falso: guarda assinaturas, faturas e links; os avisos são assinados e conferidos de verdade ──
const webhooks = new StripeDeVerdade("sk_test_simulacao").webhooks;
const stripe = {
  assinaturas: new Map(),     // sub_ → { id, status, customer, produto }
  clientes: new Map(),        // cus_ → { id, email }
  faturas: new Map(),         // in_ → { id, assinatura, pagamento }
  links: new Map([["plink_teste60", "prod_60"], ["plink_teste120", "prod_120"]]),
  leiturasDeLinks: 0,
  cancelamentos: 0,
};
const objetoAssinatura = (a, comCliente) => ({
  id: a.id, object: "subscription", status: a.status,
  customer: comCliente ? { id: a.customer, email: stripe.clientes.get(a.customer).email } : a.customer,
  items: { object: "list", data: [{ price: { id: "price_" + a.produto, product: a.produto } }] },
  latest_invoice: a.ultimaFatura || null,
});
class StripeFalso {
  constructor() {
    this.webhooks = webhooks;
    this.subscriptions = {
      retrieve: async (id, opcoes) => {
        const a = stripe.assinaturas.get(id);
        if (!a) throw Object.assign(new Error("No such subscription"), { code: "resource_missing" });
        return objetoAssinatura(a, opcoes && opcoes.expand && opcoes.expand.includes("customer"));
      },
      cancel: async (id) => { stripe.cancelamentos++; stripe.assinaturas.get(id).status = "canceled"; return {}; },
    };
    this.invoices = {
      retrieve: async (id) => {
        const f = stripe.faturas.get(id);
        return { id, parent: { type: "subscription_details", subscription_details: { subscription: f.assinatura } } };
      },
    };
    this.invoicePayments = {
      list: async ({ invoice }) => {
        const f = stripe.faturas.get(invoice);
        return { data: f && f.pagamento ? [{ status: "paid", payment: { type: "payment_intent", payment_intent: f.pagamento } }] : [] };
      },
    };
    this.paymentLinks = {
      listLineItems: async (link) => {
        stripe.leiturasDeLinks++;
        if (!stripe.links.has(link)) throw Object.assign(new Error("No such payment link"), { code: "resource_missing" });
        return { data: [{ price: { id: "price_x", product: stripe.links.get(link) } }] };
      },
    };
  }
}
mock.module("stripe", { defaultExport: StripeFalso });

const { default: webhook } = await import("../api/stripe-webhook.js");
const { default: conta } = await import("../api/conta.js");
const { cursosAtivos } = await import("../api/_plugins.js");

// ── Ajudantes ──
let numeroEvento = 0;
async function aviso(tipo, objeto) {
  const corpo = JSON.stringify({ id: "evt_" + ++numeroEvento, object: "event", type: tipo, data: { object: objeto } });
  const req = {
    method: "POST",
    headers: { "stripe-signature": webhooks.generateTestHeaderString({ payload: corpo, secret: "whsec_simulacao" }) },
    async *[Symbol.asyncIterator]() { yield Buffer.from(corpo); },
  };
  const res = { codigo: 0, corpo: null, setHeader() {}, status(c) { this.codigo = c; return this; }, json(b) { this.corpo = b; return this; } };
  await webhook(req, res);
  assert.equal(res.codigo, 200, `${tipo} respondeu ${res.codigo}: ${JSON.stringify(res.corpo)}`);
  return res;
}

let contador = 0;
function novaAssinatura(email, produto) {
  const n = ++contador;
  const a = { id: "sub_" + n, status: "active", customer: "cus_" + n, produto };
  stripe.clientes.set(a.customer, { id: a.customer, email });
  stripe.assinaturas.set(a.id, a);
  return a;
}
function novaFatura(a, valor, motivo, formatoAntigo = false) {
  const f = { id: "in_" + crypto.randomBytes(4).toString("hex"), assinatura: a.id, pagamento: "pi_" + crypto.randomBytes(4).toString("hex") };
  stripe.faturas.set(f.id, f);
  a.ultimaFatura = f.id;
  const email = stripe.clientes.get(a.customer).email;
  // a versão nova da API (parent.subscription_details) e a antiga (subscription e payment_intent na fatura)
  const objeto = formatoAntigo
    ? { id: f.id, object: "invoice", subscription: a.id, payment_intent: f.pagamento }
    : { id: f.id, object: "invoice", parent: { type: "subscription_details", subscription_details: { subscription: a.id } } };
  return Object.assign(objeto, { amount_paid: valor, currency: "brl", billing_reason: motivo, customer_email: email, customer_name: "Ana Teste", total_discount_amounts: [] });
}
function sessaoAssinatura(a, link, fatura, extra = {}) {
  return {
    id: "cs_" + crypto.randomBytes(4).toString("hex"), object: "checkout.session", mode: "subscription",
    payment_status: "paid", payment_link: link, subscription: a.id, invoice: fatura.id, payment_intent: null,
    customer_details: { email: stripe.clientes.get(a.customer).email, name: "Ana Teste" },
    amount_total: fatura.amount_paid, currency: "brl", total_details: { amount_discount: 0 }, client_reference_id: null, ...extra,
  };
}

const alunoPorEmail = (email) => tabelas.alunos.find((a) => a.email === email);
const acesso = (alunoId, curso) => tabelas.acessos.find((a) => a.aluno_id === alunoId && a.curso === curso);
const ativo = (alunoId, curso) => !!(acesso(alunoId, curso) && !acesso(alunoId, curso).revogado_em);
// O que o Editfy no servidor faz: o maior plano ativo
const minutosNoServidor = (alunoId) => Math.max(0, ...tabelas.acessos
  .filter((a) => a.aluno_id === alunoId && !a.revogado_em && PLANOS_MINUTOS[a.curso]).map((a) => PLANOS_MINUTOS[a.curso]));
const pluginInstala = async (alunoId) => (await cursosAtivos(db, alunoId)).cursos.some((c) => c.plugin === "editfy-reels");
async function contaDe(alunoId) {
  const res = { codigo: 0, corpo: null, setHeader() {}, status(c) { this.codigo = c; return this; }, json(b) { this.corpo = b; return this; } };
  await conta({ method: "GET", query: {}, headers: { authorization: "Bearer token-" + alunoId } }, res);
  return res.corpo.cursos.find((c) => c.endereco === "editfy-reels");
}

// ── Cenários ──
const ANA = "ana@teste.com";
let ana, assinaturaAna;

test("assinar o plano de 60 minutos (avisos fora de ordem e repetidos)", async () => {
  assinaturaAna = novaAssinatura(ANA, "prod_60");
  const fatura = novaFatura(assinaturaAna, 9700, "subscription_create");
  // o Stripe pode mandar a assinatura e a fatura antes do checkout: ainda sem aluno, nada é liberado
  await aviso("customer.subscription.created", objetoAssinatura(assinaturaAna));
  await aviso("invoice.paid", fatura);
  assert.equal(alunoPorEmail(ANA), undefined);
  const sessao = sessaoAssinatura(assinaturaAna, "plink_teste60", fatura);
  await aviso("checkout.session.completed", sessao);
  await aviso("checkout.session.completed", sessao); // repetido
  ana = alunoPorEmail(ANA).id;

  assert.equal(emails.length, 1, "um e-mail com a senha");
  assert.equal(emails[0].tipo, "compra_editefy", "e-mail com a marca do Editefy");
  assert.equal(emails[0].dados.LINK_CURSO, "https://www.editefy.com/comecar");
  assert.ok(!acesso(ana, "editfy-reels"), "a assinatura do Editefy é só o conector: sem aulas e sem plugin");
  assert.ok(ativo(ana, "editfy-reels-60"));
  assert.ok(!acesso(ana, "editfy-reels-120"));
  assert.equal(minutosNoServidor(ana), 60);
  assert.equal(await pluginInstala(ana), false);
  assert.equal(await contaDe(ana), undefined, "não aparece na conta da MIAI");

  const compras = tabelas.compras.filter((c) => c.email === ANA);
  assert.equal(compras.length, 1, "a primeira mensalidade conta uma vez só");
  assert.equal(compras[0].stripe_sessao, fatura.id);
  assert.equal(compras[0].status, "pago");
  assert.equal(compras[0].aluno_id, ana);
  assert.ok(compras[0].liberado_em);
  assert.equal(compras[0].stripe_pagamento, stripe.faturas.get(fatura.id).pagamento);
  assert.equal(stripe.leiturasDeLinks, 2, "os produtos dos links são lidos uma vez só");
});

test("renovação do mês: guarda a mensalidade, sem e-mail nem senha nova", async () => {
  await aviso("invoice.paid", novaFatura(assinaturaAna, 9700, "subscription_cycle", true));
  assert.equal(tabelas.compras.filter((c) => c.email === ANA && c.status === "pago").length, 2);
  assert.equal(emails.length, 1);
  assert.equal(minutosNoServidor(ana), 60);
});

test("upgrade para 120 minutos e downgrade de volta para 60", async () => {
  assinaturaAna.produto = "prod_120";
  await aviso("customer.subscription.updated", objetoAssinatura(assinaturaAna));
  await aviso("invoice.paid", novaFatura(assinaturaAna, 7000, "subscription_update")); // diferença do upgrade
  assert.ok(ativo(ana, "editfy-reels-120"));
  assert.ok(!ativo(ana, "editfy-reels-60"));
  assert.ok(!acesso(ana, "editfy-reels"));
  assert.equal(minutosNoServidor(ana), 120);
  assert.equal(await pluginInstala(ana), false);

  assinaturaAna.produto = "prod_60";
  // aviso com o plano antigo chegando depois: vale o estado atual da assinatura no Stripe
  await aviso("customer.subscription.updated", { ...objetoAssinatura(assinaturaAna), items: { data: [{ price: { product: "prod_120" } }] } });
  await aviso("invoice.paid", novaFatura(assinaturaAna, 0, "subscription_update")); // crédito: fatura zerada
  assert.ok(ativo(ana, "editfy-reels-60"));
  assert.ok(!ativo(ana, "editfy-reels-120"));
  assert.equal(minutosNoServidor(ana), 60);
  assert.equal(tabelas.compras.filter((c) => c.email === ANA).length, 3, "fatura zerada não entra em compras");
});

test("pagamento falha: o acesso continua nas novas tentativas e sai quando o Stripe desiste", async () => {
  assinaturaAna.status = "past_due";
  await aviso("invoice.payment_failed", { ...novaFatura(assinaturaAna, 0, "subscription_cycle"), attempt_count: 1 });
  await aviso("customer.subscription.updated", objetoAssinatura(assinaturaAna));
  assert.ok(ativo(ana, "editfy-reels-60"));
  assert.equal(minutosNoServidor(ana), 60);

  assinaturaAna.status = "unpaid"; // as tentativas acabaram
  await aviso("customer.subscription.updated", objetoAssinatura(assinaturaAna));
  assert.ok(!ativo(ana, "editfy-reels-60"));
  assert.equal(minutosNoServidor(ana), 0);

  // pagou depois: o plano volta
  assinaturaAna.status = "active";
  await aviso("invoice.paid", novaFatura(assinaturaAna, 9700, "subscription_cycle"));
  assert.ok(ativo(ana, "editfy-reels-60"));
  assert.ok(!acesso(ana, "editfy-reels"));
  assert.equal(minutosNoServidor(ana), 60);
});

test("cancelar a assinatura tira o plano", async () => {
  assinaturaAna.status = "canceled";
  await aviso("customer.subscription.deleted", objetoAssinatura(assinaturaAna));
  assert.ok(!ativo(ana, "editfy-reels"));
  assert.ok(!ativo(ana, "editfy-reels-60"));
  assert.equal(minutosNoServidor(ana), 0);
  assert.equal(await pluginInstala(ana), false);
});

test("quem comprou uma vez continua com o plugin e só ganha minutos se assinar", async () => {
  const BIA = "bia@teste.com";
  // compra única antiga, pelo link de antes
  await aviso("checkout.session.completed", {
    id: "cs_unica", object: "checkout.session", mode: "payment", payment_status: "paid", payment_link: LINK_COMPRA_UNICA,
    payment_intent: "pi_unica", customer_details: { email: BIA, name: "Bia Teste" }, amount_total: 9700, currency: "brl",
  });
  const bia = alunoPorEmail(BIA).id;
  assert.equal(acesso(bia, "editfy-reels").origem, "stripe");
  assert.ok(await pluginInstala(bia));
  assert.equal(minutosNoServidor(bia), 0, "sem assinatura, sem servidor");
  assert.equal((await contaDe(bia)).plano, undefined);

  const a = novaAssinatura(BIA, "prod_120");
  const fatura = novaFatura(a, 16700, "subscription_create");
  await aviso("checkout.session.completed", sessaoAssinatura(a, "plink_teste120", fatura));
  assert.equal(minutosNoServidor(bia), 120);
  assert.equal(acesso(bia, "editfy-reels").origem, "stripe", "a compra única não vira assinatura");

  a.status = "canceled";
  await aviso("customer.subscription.deleted", objetoAssinatura(a));
  assert.equal(minutosNoServidor(bia), 0);
  assert.ok(ativo(bia, "editfy-reels"), "continua com as aulas e o plugin");
  assert.ok(await pluginInstala(bia));
});

test("reembolso da garantia cancela a assinatura e tira o acesso", async () => {
  const CAIO = "caio@teste.com";
  const a = novaAssinatura(CAIO, "prod_60");
  const fatura = novaFatura(a, 9700, "subscription_create");
  await aviso("checkout.session.completed", sessaoAssinatura(a, "plink_teste60", fatura));
  const caio = alunoPorEmail(CAIO).id;
  assert.equal(minutosNoServidor(caio), 60);

  const pagamento = stripe.faturas.get(fatura.id).pagamento;
  await aviso("charge.refunded", { id: "ch_1", object: "charge", refunded: true, payment_intent: pagamento });
  await aviso("refund.created", { id: "re_1", object: "refund", status: "succeeded", amount: 9700, payment_intent: pagamento });
  assert.equal(stripe.assinaturas.get(a.id).status, "canceled");
  assert.equal(stripe.cancelamentos, 1, "cancela uma vez só");
  assert.equal(tabelas.compras.find((c) => c.stripe_sessao === fatura.id).status, "reembolsado");
  assert.ok(!ativo(caio, "editfy-reels"));
  assert.equal(minutosNoServidor(caio), 0);
});

test("assinatura de outro produto da conta não mexe em nada", async () => {
  const antes = JSON.stringify(tabelas.acessos);
  const a = novaAssinatura("outra@teste.com", "prod_outro");
  await aviso("customer.subscription.created", objetoAssinatura(a));
  await aviso("invoice.paid", novaFatura(a, 5000, "subscription_create"));
  assert.equal(JSON.stringify(tabelas.acessos), antes);
  assert.ok(!tabelas.compras.some((c) => c.email === "outra@teste.com"));
});
