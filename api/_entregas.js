// Entrega e reembolso das compras pagas, iguais para o Stripe (api/stripe-webhook.js) e a Hotmart
// (api/hotmart-webhook.js). Quem chama já guardou a compra em "compras" e reservou a entrega (liberado_em).
//
//   entregarCompra: cria o login (ou troca a senha), libera o que foi comprado e manda o e-mail
//     curso (compra única)            → acesso em "acessos" (aulas e plugin). Plugin da Editefy (o Sort para
//                                       computador, com emailCompra): quem já tem conta continua com a senha, e o
//                                       e-mail leva a licença e os comandos de instalação da loja "editefy"
//     pacote de minutos (o Editefy)   → uma linha em editfy_creditos
//     pacote de meses (o Editefy Sort) → uma linha em editefy_sort_acessos, com o vencimento somado
//     assinatura (só no Stripe)       → quem chama passa "sincronizar", que acerta os acessos pelo estado no Stripe
//   revogarCompra: no reembolso, tira o que aquela compra deu
//
// "origem" ('stripe' ou 'hotmart') e "referencia" (a sessão cs_... do Stripe ou a transação HP... da Hotmart) ficam
// gravadas em cada linha: a referência liga o reembolso à compra.
import { liberarAcesso, linkCurso } from "./_alunos.js";
import { enviarEmail } from "./_emails.js";
import { comandosEditefy, licencaDoAluno } from "./_plugins.js";
import { linkMiai, pacotePorId } from "./_cursos.js";

// ── Editefy Sort: acesso por tempo, em editefy_sort_acessos ──

// Data mais "meses" meses; se o dia não existe no mês final, fica no último dia (31/01 + 1 mês = 28/02), como o
// interval do Postgres
function somarMeses(data, meses) {
  const d = new Date(data);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimoDia));
  return d;
}

// Refaz o vencimento das compras do Sort de um aluno, na ordem em que foram feitas: cada compra (do Stripe ou da
// Hotmart) vale os meses do pacote a partir do dia da compra ou, se ainda faltava tempo, a partir do vencimento
// anterior (renovar antes de vencer não perde nada). As linhas feitas à mão (cortesias, origem 'manual') ficam como
// estão e contam como tempo que ainda falta. Roda de novo depois de um reembolso, para as compras seguintes perderem o
// tempo da compra reembolsada. Pode rodar quantas vezes for preciso. Devolve o vencimento do acesso (o último), ou
// null se não sobrou nenhuma linha.
async function acertarVencimentosSort(db, alunoId) {
  const { data, error } = await db.from("editefy_sort_acessos")
    .select("id, pacote, origem, criado_em, vence_em, revogado_em").eq("aluno_id", alunoId);
  if (error) throw error;
  const linhas = (data || []).filter((l) => !l.revogado_em)
    .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em) || String(a.id).localeCompare(String(b.id)));
  let fim = null;
  for (const linha of linhas) {
    let vence = linha.vence_em ? new Date(linha.vence_em) : null;
    if (linha.origem !== "manual") {
      const criado = new Date(linha.criado_em);
      const meses = (pacotePorId(linha.pacote) || { pacote: {} }).pacote.meses || 12;
      vence = somarMeses(fim && fim > criado ? fim : criado, meses);
      if (!linha.vence_em || new Date(linha.vence_em).getTime() !== vence.getTime()) {
        const { error: erro } = await db.from("editefy_sort_acessos")
          .update({ vence_em: vence.toISOString() }).eq("id", linha.id);
        if (erro) throw erro;
      }
    }
    if (vence && (!fim || vence > fim)) fim = vence;
  }
  return fim;
}

// Grava a compra do Sort (uma linha por compra) e devolve até quando o acesso vale
async function liberarSort(db, alunoId, pacote, referencia, origem) {
  const { error } = await db.from("editefy_sort_acessos").upsert(
    { aluno_id: alunoId, pacote: pacote.id, origem, referencia },
    { onConflict: "referencia" }
  );
  if (error) throw error;
  return acertarVencimentosSort(db, alunoId);
}

// Reembolso de uma compra do Sort: tira a linha dela e refaz o vencimento das outras
async function revogarSort(db, referencia) {
  const { data: linha, error } = await db.from("editefy_sort_acessos")
    .select("id, aluno_id, revogado_em").eq("referencia", referencia).maybeSingle();
  if (error) throw error;
  if (!linha) return;
  if (!linha.revogado_em) {
    const { error: erro } = await db.from("editefy_sort_acessos")
      .update({ revogado_em: new Date().toISOString() }).eq("id", linha.id);
    if (erro) throw erro;
  }
  await acertarVencimentosSort(db, linha.aluno_id);
}

// Data do vencimento no e-mail, no horário de Brasília (ex.: 24/11/2027)
const dataCurta = (data) =>
  data ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(data)) : "";

// ── Entrega ──

// curso: o de api/_cursos.js; num pacote, com o id do pacote e o pacote em "pacote" (como compras.curso guarda).
// Devolve a conta ({ alunoId, senha, ... } de liberarAcesso).
export async function entregarCompra(db, { compraId, nome, email, curso, origem, referencia, leadId = null, assinatura = null, sincronizar = null }) {
  const pacote = curso.pacote || null;
  // Plugin vendido com a marca da Editefy (o Sort para computador): e-mail próprio com os comandos de instalação
  const daEditefy = !pacote && !assinatura && !!curso.emailCompra;
  // Assinatura: aqui só o login; os acessos (curso e plano) vêm da sincronização logo abaixo.
  // Pacote: só o login (quem já tem conta continua com a senha); os minutos vão para editfy_creditos e o tempo do
  // Sort, para editefy_sort_acessos. Plugin da Editefy: o acesso, como numa compra, mas sem trocar a senha.
  const conta = await liberarAcesso({
    nome, email, curso: assinatura || pacote ? null : curso.id,
    origem: assinatura ? "assinatura" : origem, referencia: assinatura || referencia, leadId,
    manterSenha: !!pacote || daEditefy,
  });
  await db.from("compras").update({ aluno_id: conta.alunoId }).eq("id", compraId);
  const vence = pacote && pacote.meses ? await liberarSort(db, conta.alunoId, pacote, referencia, origem) : null;
  if (pacote && !pacote.meses) {
    // Uma linha por compra (referencia = sessão ou transação): vale 12 meses a partir de agora (padrão do banco)
    const { error: erroPacote } = await db.from("editfy_creditos").upsert(
      { aluno_id: conta.alunoId, pacote: pacote.id, minutos: pacote.minutos, origem, referencia },
      { onConflict: "referencia" }
    );
    if (erroPacote) throw erroPacote;
  }
  if (assinatura) await sincronizar(assinatura, conta.alunoId);

  // Plugin da Editefy: a licença do aluno (criada agora, se ainda não tem) e os comandos da loja "editefy"
  const comandos = daEditefy ? comandosEditefy(await licencaDoAluno(db, conta.alunoId), [curso]).comandos : [];

  const primeiroNome = String(nome || "").trim().split(/\s+/)[0] || "aluno(a)";
  // Pacote, assinatura ou plugin com e-mail próprio (o Editefy e os dois Sorts, com a marca e o passo a passo) ou o
  // da escola. No pacote e no plugin da Editefy de quem já tem conta, o e-mail não leva senha (ela continua a mesma).
  const proprio = pacote ? (conta.senha ? curso.emailPacote : curso.emailContaExistente)
    : daEditefy ? (conta.senha ? curso.emailCompra : curso.emailContaExistente)
    : assinatura && curso.emailAssinatura;
  const envio = await enviarEmail(
    proprio || (curso.site === "iaacademy" ? "acesso" : linkMiai() ? "compra_miai" : "compra"),
    email,
    { NOME: primeiroNome, EMAIL_ALUNO: email, SENHA: conta.senha || "", CURSO: curso.nome,
      MINUTOS: pacote && pacote.minutos ? String(pacote.minutos) : "", VENCE: dataCurta(vence),
      COMANDO_LOJA: comandos[0] || "", COMANDO_INSTALAR: comandos[1] || "",
      LINK_CURSO: pacote ? curso.linkPacote : daEditefy ? curso.linkCompra : proprio ? curso.linkAssinatura : linkCurso(curso.id) },
    `compra-${referencia}`
  );
  if (!envio.ok) {
    console.error(`Compra ${referencia} liberada, mas o e-mail com a senha não foi enviado. O aluno pode usar "Esqueci minha senha".`);
  }
  return conta;
}

// ── Reembolso ──

// Tira o que a compra deu: num pacote de minutos, o pacote (o que sobrava sai do saldo); no Sort, o tempo daquela
// compra; num curso, o acesso (aulas e plugin). curso = compras.curso; referencia = a da compra (cs_... ou HP...).
export async function revogarCompra(db, { alunoId, curso, referencia }) {
  const doPacote = pacotePorId(curso);
  if (doPacote && doPacote.pacote.meses) {
    await revogarSort(db, referencia);
    return;
  }
  if (doPacote) {
    const { error } = await db.from("editfy_creditos")
      .update({ revogado_em: new Date().toISOString() })
      .eq("referencia", referencia).is("revogado_em", null);
    if (error) throw error;
    return;
  }
  if (!alunoId) return;
  const { error } = await db.from("acessos")
    .update({ revogado_em: new Date().toISOString() })
    .eq("aluno_id", alunoId).eq("curso", curso).is("revogado_em", null);
  if (error) throw error;
}
