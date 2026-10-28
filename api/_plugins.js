// Plugins do Claude Code vendidos como cursos da MIAI (ex.: Canal Dark). Cada aluno tem UMA licença, que vale para
// todos os plugins dos cursos que ele comprou; a loja (api/_loja.js) entrega os plugins conferindo a licença aqui.
// Atendido pela função api/conta.js (o site já usa as 12 funções do plano da Vercel): o vercel.json leva
// /api/plugins para /api/conta?plugins=1.
//
//   GET /api/plugins?acao=minha&curso=editfy-reels
//       Authorization: Bearer <token do login>  → { licenca, loja, comandos, plugins: [{ nome, curso }] }
//       Usado pela aula "Instalar o plugin" (miai/aulas.html). Cria a licença na primeira vez.
//       Com "curso" (o endereço), os comandos instalam só o plugin desse curso; sem ele, todos os do aluno.
//
// Variável de ambiente (opcional):
//   PLUGINS_URL   endereço do site onde fica a loja (padrão: MIAI_URL, ou o próprio endereço do pedido)
//   + as do Supabase (api/_supabase.js)
import crypto from "node:crypto";
import { banco } from "./_supabase.js";
import { CURSOS_MIAI, linkMiai } from "./_cursos.js";

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O e 1/I, que se confundem
export const LICENCA = /^MIAI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const CURSOS_COM_PLUGIN = CURSOS_MIAI.filter((c) => c.plugin);

function novaLicenca() {
  const bloco = () => Array.from({ length: 4 }, () => LETRAS[crypto.randomInt(LETRAS.length)]).join("");
  return `MIAI-${bloco()}-${bloco()}-${bloco()}`;
}

// Endereço do site onde a loja responde (os links do catálogo e dos comandos usam ele)
export function enderecoLoja(req) {
  const base = String(process.env.PLUGINS_URL || linkMiai() || "").trim().replace(/\/+$/, "");
  return base || `https://${req.headers.host}`;
}

// Cursos com plugin que o aluno pode usar agora (acesso não revogado e aluno não bloqueado)
export async function cursosAtivos(db, alunoId) {
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
  const ativos = (await cursosAtivos(db, alunoId)).cursos;
  // Cada aula mostra só o plugin do seu curso
  const pedido = String((req.query && req.query.curso) || "");
  const cursos = pedido ? ativos.filter((c) => c.endereco === pedido) : ativos;
  if (!cursos.length) return res.status(403).json({ erro: "Seu acesso a um curso com plugin não está liberado." });

  // Uma licença por aluno: a primeira vez cria (a chave única do banco resolve duas abas abrindo juntas)
  let { data: linha, error: erroBusca } = await db.from("licencas_plugin").select("codigo").eq("aluno_id", alunoId).maybeSingle();
  if (erroBusca) throw erroBusca;
  if (!linha) {
    const { error: erroNova } = await db.from("licencas_plugin").insert({ aluno_id: alunoId, codigo: novaLicenca() });
    if (erroNova && erroNova.code !== "23505") throw erroNova; // 23505 = outra aba criou primeiro
    ({ data: linha, error: erroBusca } = await db.from("licencas_plugin").select("codigo").eq("aluno_id", alunoId).single());
    if (erroBusca) throw erroBusca;
  }

  const loja = `${enderecoLoja(req)}/loja/${linha.codigo}/marketplace.json`;
  return res.status(200).json({
    licenca: linha.codigo,
    loja,
    comandos: [`/plugin marketplace add ${loja}`, ...cursos.map((c) => `/plugin install ${c.plugin}@miai`)],
    plugins: cursos.map((c) => ({ nome: c.plugin, curso: c.endereco })),
  });
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
    return res.status(400).json({ erro: "Ação desconhecida." });
  } catch (erro) {
    console.error("Erro nos plugins:", erro);
    return res.status(500).json({ erro: "Não foi possível responder agora." });
  }
}
