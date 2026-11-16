// Simulação dos pacotes de minutos do Editefy no Mac, sem Stripe nem Supabase de verdade: os avisos do Stripe são
// assinados e conferidos de verdade e o banco é falso, em memória.
// Rodar: npm test   (ou: node --test --experimental-test-module-mocks tests/)
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import StripeDeVerdade from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_simulacao";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_simulacao";
process.env.MIAI_URL = "https://www.miaiacademy.com";
process.env.STRIPE_PAYMENT_LINK_EDITEFY_30 = "plink_teste30";
process.env.STRIPE_PAYMENT_LINK_EDITEFY_60 = "plink_teste60";
process.env.STRIPE_PAYMENT_LINK_EDITEFY_120 = "plink_teste120";
const LINK_COMPRA_UNICA = "plink_1UVEa9RY9p8vsUUsdFHAlweg"; // a compra única antiga do curso Editfy Reels
const trocasDeSenha = [];

// ── Banco falso (o pedaço do supabase-js que as funções usam) ──
const tabelas = { alunos: [], acessos: [], compras: [], leads: [], licencas_plugin: [], editfy_creditos: [] };
const unicas = { alunos: [["id"]], acessos: [["aluno_id", "curso"]], compras: [["stripe_sessao"]], licencas_plugin: [["aluno_id"], ["codigo"]], editfy_creditos: [["referencia"]] };
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
      updateUserById: async (id, dados) => { trocasDeSenha.push(id); return { data: {}, error: null }; },
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

// Stripe falso: só a conferência dos avisos (a compra de pacote não lê nada do Stripe)
const webhooks = new StripeDeVerdade("sk_test_simulacao").webhooks;
mock.module("stripe", { defaultExport: class { constructor() { this.webhooks = webhooks; } } });

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

function compra(email, link, valor, extra = {}) {
  return {
    id: "cs_" + crypto.randomBytes(4).toString("hex"), object: "checkout.session", mode: "payment",
    payment_status: "paid", payment_link: link, payment_intent: "pi_" + crypto.randomBytes(4).toString("hex"),
    customer_details: { email, name: "Ana Teste" }, amount_total: valor, currency: "brl",
    total_details: { amount_discount: 0 }, client_reference_id: null, ...extra,
  };
}

const alunoPorEmail = (email) => tabelas.alunos.find((a) => a.email === email);
const creditos = (alunoId) => tabelas.editfy_creditos.filter((c) => c.aluno_id === alunoId);
// O que o servidor do Editefy faz (função editfy_saldo do banco): soma o que sobra dos pacotes não reembolsados
const saldo = (alunoId) => creditos(alunoId).filter((c) => !c.revogado_em).reduce((s, c) => s + c.minutos - (c.usados || 0), 0);
const pluginInstala = async (alunoId) => (await cursosAtivos(db, alunoId)).cursos.some((c) => c.plugin === "editfy-reels");
async function contaDe(alunoId) {
  const res = { codigo: 0, corpo: null, setHeader() {}, status(c) { this.codigo = c; return this; }, json(b) { this.corpo = b; return this; } };
  await conta({ method: "GET", query: {}, headers: { authorization: "Bearer token-" + alunoId } }, res);
  return res.corpo.cursos.find((c) => c.endereco === "editfy-reels");
}

// ── Cenários ──
const ANA = "ana@teste.com";
let ana;

test("comprar o pacote de 60 minutos cria a conta e grava os minutos (aviso repetido não duplica)", async () => {
  const sessao = compra(ANA, "plink_teste60", 9700);
  await aviso("checkout.session.completed", sessao);
  await aviso("checkout.session.completed", sessao); // repetido
  ana = alunoPorEmail(ANA).id;

  assert.equal(creditos(ana).length, 1);
  assert.equal(creditos(ana)[0].pacote, "editefy-60");
  assert.equal(creditos(ana)[0].minutos, 60);
  assert.equal(creditos(ana)[0].referencia, sessao.id);
  assert.equal(saldo(ana), 60);

  assert.equal(emails.length, 1, "um e-mail só");
  assert.equal(emails[0].tipo, "compra_editefy");
  assert.ok(emails[0].dados.SENHA, "conta nova recebe a senha");
  assert.equal(emails[0].dados.MINUTOS, "60");
  assert.equal(emails[0].dados.LINK_CURSO, "https://www.editefy.com/comecar");

  const linha = tabelas.compras.find((c) => c.stripe_sessao === sessao.id);
  assert.equal(linha.curso, "editefy-60");
  assert.equal(linha.status, "pago");
  assert.equal(linha.aluno_id, ana);
  assert.ok(!tabelas.acessos.some((a) => a.aluno_id === ana), "o pacote é só o conector: sem aulas e sem plugin");
  assert.equal(await pluginInstala(ana), false);
  assert.equal(await contaDe(ana), undefined, "não aparece na conta da MIAI");
});

test("comprar mais um pacote soma os minutos e não troca a senha", async () => {
  const antes = trocasDeSenha.length;
  await aviso("checkout.session.completed", compra(ANA, "plink_teste30", 6200));
  assert.equal(creditos(ana).length, 2);
  assert.equal(saldo(ana), 90);
  assert.equal(trocasDeSenha.length, antes, "a senha continua a mesma");
  const ultimo = emails[emails.length - 1];
  assert.equal(ultimo.tipo, "minutos_editefy");
  assert.equal(ultimo.dados.SENHA, "");
  assert.equal(ultimo.dados.MINUTOS, "30");
});

test("Pix: os minutos só entram quando o pagamento é confirmado", async () => {
  const BIA = "bia@teste.com";
  const sessao = compra(BIA, "plink_teste120", 16700, { payment_status: "unpaid" });
  await aviso("checkout.session.completed", sessao);
  assert.equal(alunoPorEmail(BIA), undefined);
  assert.equal(tabelas.compras.find((c) => c.stripe_sessao === sessao.id).status, "aguardando");
  await aviso("checkout.session.async_payment_succeeded", { ...sessao, payment_status: "paid" });
  const bia = alunoPorEmail(BIA).id;
  assert.equal(saldo(bia), 120);
  assert.equal(creditos(bia)[0].pacote, "editefy-120");
});

test("reembolso da garantia tira só o pacote reembolsado", async () => {
  const CAIO = "caio@teste.com";
  const primeira = compra(CAIO, "plink_teste60", 9700);
  const segunda = compra(CAIO, "plink_teste30", 6200);
  await aviso("checkout.session.completed", primeira);
  await aviso("checkout.session.completed", segunda);
  const caio = alunoPorEmail(CAIO).id;
  assert.equal(saldo(caio), 90);

  await aviso("charge.refunded", { id: "ch_1", object: "charge", refunded: true, payment_intent: segunda.payment_intent });
  await aviso("refund.created", { id: "re_1", object: "refund", status: "succeeded", amount: 6200, payment_intent: segunda.payment_intent });
  assert.equal(tabelas.compras.find((c) => c.stripe_sessao === segunda.id).status, "reembolsado");
  assert.ok(creditos(caio).find((c) => c.referencia === segunda.id).revogado_em, "o pacote reembolsado sai");
  assert.ok(!creditos(caio).find((c) => c.referencia === primeira.id).revogado_em, "o outro continua");
  assert.equal(saldo(caio), 60);
});

test("reembolso parcial não tira o pacote", async () => {
  const DANI = "dani@teste.com";
  const sessao = compra(DANI, "plink_teste60", 9700);
  await aviso("checkout.session.completed", sessao);
  const dani = alunoPorEmail(DANI).id;
  await aviso("refund.created", { id: "re_2", object: "refund", status: "succeeded", amount: 1000, payment_intent: sessao.payment_intent });
  assert.equal(saldo(dani), 60);
});

test("a compra única antiga do curso continua liberando as aulas e o plugin, sem minutos", async () => {
  const EVA = "eva@teste.com";
  await aviso("checkout.session.completed", compra(EVA, LINK_COMPRA_UNICA, 9700));
  const eva = alunoPorEmail(EVA).id;
  assert.equal(tabelas.acessos.find((a) => a.aluno_id === eva && a.curso === "editfy-reels").origem, "stripe");
  assert.ok(await pluginInstala(eva));
  assert.equal(creditos(eva).length, 0);
});

test("compra de outro produto da conta não mexe em nada", async () => {
  const antes = JSON.stringify([tabelas.acessos, tabelas.editfy_creditos]);
  await aviso("checkout.session.completed", compra("outra@teste.com", "plink_outro", 5000));
  assert.equal(JSON.stringify([tabelas.acessos, tabelas.editfy_creditos]), antes);
  assert.ok(!tabelas.compras.some((c) => c.email === "outra@teste.com"));
});
