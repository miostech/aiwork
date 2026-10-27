// Plugins do Claude Code vendidos como cursos da MIAI (ex.: Canal Dark). Atendido pela função api/conta.js (o site
// já usa as 12 funções do plano da Vercel): o vercel.json leva /api/plugins para /api/conta?plugins=1. Cada aluno tem UMA licença, que vale para
// todos os plugins dos cursos que ele comprou; a loja (Worker do repositório miostech/miai-plugins) pergunta aqui o
// que cada licença libera. Reembolso tira o acesso ao curso (api/stripe-webhook.js) e o plugin para de funcionar.
//
//   GET /api/plugins?acao=minha
//       Authorization: Bearer <token do login>  → { licenca, loja, comandos, plugins: [{ nome, curso }] }
//       Usado pela aula "Instalar o plugin" (miai/aulas.html). Cria a licença na primeira vez.
//   GET /api/plugins?acao=licenca&codigo=MIAI-XXXX-XXXX-XXXX
//       X-Loja-Segredo: <LOJA_SEGREDO>          → { ativa, cursos: ["canal-dark", ...], motivo }
//       Usado só pela loja (o segredo impede que qualquer um consulte licenças).
//
// Variáveis de ambiente:
//   PLUGINS_URL   endereço da loja (ex.: https://plugins.miaiacademy.com)
//   LOJA_SEGREDO  segredo combinado com a loja (o mesmo valor no Worker)
//   + as do Supabase (api/_supabase.js)
import crypto from "node:crypto";
import { banco } from "./_supabase.js";
import { CURSOS_MIAI } from "./_cursos.js";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, que se confundem
const LICENCA = /^MIAI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const CURSOS_COM_PLUGIN = CURSOS_MIAI.filter((c) => c.plugin);

function novaLicenca() {
  const bloco = () => Array.from({ length: 4 }, () => LETRAS[crypto.randomInt(LETRAS.length)]).join("");
  return `MIAI-${bloco()}-${bloco()}-${bloco()}`;
}

function iguais(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Cursos com plugin que o aluno pode usar agora (acesso não revogado e aluno não bloqueado)
async function cursosAtivos(db, alunoId) {
  const { data: aluno, error: erroAluno } = await db.from("alunos").select("bloqueado").eq("id", alunoId).maybeSingle();
  if (erroAluno) throw erroAluno;
  if (!aluno || aluno.bloqueado) return { cursos: [], motivo: "acesso bloqueado" };
  const { data: acessos, error } = await db.from("acessos").select("curso")
    .eq("aluno_id", alunoId).is("revogado_em", null);
  if (error) throw error;
  const ids = new Set((acessos || []).map((a) => a.curso));
  const cursos = CURSOS_COM_PLUGIN.filter((c) => ids.has(c.id));
  return { cursos, motivo: cursos.length ? "" : "acesso retirado" };
}

async function minha(req, res, db) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ erro: "Faça login." });
  const { data, error } = await db.auth.getUser(token);
  if (error && error.status !== 401 && error.status !== 403) {
    console.error("Não foi possível conferir o login:", error.message);
    return res.status(503).json({ erro: "Não foi possível confirmar o seu login agora. Tente de novo." });
  }
  if (error || !data || !data.user) return res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });

  const alunoId = data.user.id;
  const { cursos } = await cursosAtivos(db, alunoId);
  if (!cursos.length) return res.status(403).json({ erro: "Seu acesso a um curso com plugin não está liberado." });

  const base = String(process.env.PLUGINS_URL || "").trim().replace(/\/+$/, "");
  if (!base) {
    console.error("Defina PLUGINS_URL nas variáveis de ambiente.");
    return res.status(503).json({ erro: "A instalação do plugin ainda não está disponível. Tente mais tarde." });
  }

  // Uma licença por aluno: a primeira vez cria (a chave única do banco resolve duas abas abrindo juntas)
  let { data: linha, error: erroBusca } = await db.from("licencas_plugin").select("codigo").eq("aluno_id", alunoId).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (!linha) {
    const { error: erroNova } = await db.from("licencas_plugin").insert({ aluno_id: alunoId, codigo: novaLicenca() });
    if (erroNova && erroNova.code !== "23505") throw erroNova; // 23505 = outra aba criou primeiro
    ({ data: linha, error: erroBusca } = await db.from("licencas_plugin").select("codigo").eq("aluno_id", alunoId).single());
    if (erroBusca) throw erroBusca;
  }

  const loja = `${base}/loja/${linha.codigo}/marketplace.json`;
  return res.status(200).json({
    licenca: linha.codigo,
    loja,
    comandos: [`/plugin marketplace add ${loja}`, ...cursos.map((c) => `/plugin install ${c.plugin}@miai`)],
    plugins: cursos.map((c) => ({ nome: c.plugin, curso: c.endereco })),
  });
}

async function licenca(req, res, db) {
  const segredo = process.env.LOJA_SEGREDO || "";
  if (!segredo || !iguais(req.headers["x-loja-segredo"] || "", segredo)) return res.status(401).json({ erro: "Não autorizado." });
  const codigo = String((req.query && req.query.codigo) || "");
  if (!LICENCA.test(codigo)) return res.status(404).json({ ativa: false, cursos: [], motivo: "licença não encontrada" });

  const { data: linha, error } = await db.from("licencas_plugin").select("aluno_id").eq("codigo", codigo).maybeSingle();
  if (error) throw error;
  if (!linha) return res.status(404).json({ ativa: false, cursos: [], motivo: "licença não encontrada" });
  const { cursos, motivo } = await cursosAtivos(db, linha.aluno_id);
  return res.status(200).json({ ativa: cursos.length > 0, cursos: cursos.map((c) => c.id), motivo });
}

export async function atenderPlugins(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ erro: "Use GET." });
  }
  res.setHeader("Cache-Control", "no-store");
  try {
    const db = banco();
    const acao = String((req.query && req.query.acao) || "");
    if (acao === "minha") return await minha(req, res, db);
    if (acao === "licenca") return await licenca(req, res, db);
    return res.status(400).json({ erro: "Ação desconhecida." });
  } catch (erro) {
    console.error("Erro nos plugins:", erro);
    return res.status(500).json({ erro: "Não foi possível responder agora." });
  }
}
