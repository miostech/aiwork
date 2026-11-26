// Entrega as aulas de um curso para quem está logado e tem acesso liberado, e guarda o progresso do aluno.
// Usado pela curso.html (IA Academy) e pela área de aulas da MIAI, que mandam o token do login no cabeçalho Authorization.
//   GET  /api/aulas                 → curso gratuito (aulas em api/_aulas.js)
//   GET  /api/aulas?curso=pago      → IA Work pelo nome no banco (como a curso.html da IA Academy pede)
//   GET  /api/aulas?curso=ia-work   → um curso da MIAI pelo endereço (lista em api/_cursos.js)
//   POST /api/aulas?curso=...  { concluidas: [0, 1, 4] } → grava as aulas concluídas (posição na lista, 0 = primeira)
// O GET marca quando o aluno entrou no curso e devolve o progresso salvo ("progresso.concluidas") e
// quais cursos o aluno tem ("cursos"), para a página mostrar o atalho para o outro.
// Esses dados alimentam o painel (/painel): quem entrou no curso e quem concluiu todas as aulas.
//
//   GET  /api/aulas?aberta=<código> → a Formação sem login, para a página aberta (aulas-abertas.html, no endereço
//                                     escondido www.iaacademy.bio/aulas/<código>), sem as aulas com "aberta: false".
//                                     Não guarda progresso nem conta visita.
import { createHash } from "node:crypto";
import { banco } from "./_supabase.js";
import { CURSO as CURSO_GRATUITO } from "./_aulas.js";
import { CURSOS_MIAI, cursoPorEndereco, totalDeAulas } from "./_cursos.js";

// Aulas de cada curso pelo nome no banco (acessos.curso). Os produtos sem aulas (marca "editefy") ficam de fora.
const CURSOS = { gratuito: CURSO_GRATUITO, ...Object.fromEntries(CURSOS_MIAI.filter((c) => c.aulas).map((c) => [c.id, c.aulas])) };

// Links escondidos da página aberta (www.iaacademy.bio/aulas/<código>). O repositório é público, então aqui fica só
// o resumo (SHA-256) de cada código, nunca o código. Para criar um link novo, rode no Terminal:
//   node -e 'const c=require("node:crypto");const L="abcdefghjkmnpqrstuvwxyz23456789";let s="";for(let i=0;i<10;i++)s+=L[c.randomInt(L.length)];console.log(s,c.createHash("sha256").update(s).digest("hex"))'
// O primeiro texto é o código do link; o segundo, o resumo que entra nesta lista. Para desligar um link, apague o resumo dele.
const LINKS_ABERTOS = [
  "c8ea088dec485fb3752bf94aea9261669eecc9a3d6c64a6d4709f655febbaf32", // primeiro link, criado em 26/11/2026
];

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erro: "Use GET ou POST." });
  }
  res.setHeader("Cache-Control", "no-store");

  // Página aberta: a Formação inteira para quem tem o link escondido, sem login
  if (req.method === "GET" && req.query && req.query.aberta !== undefined) {
    const codigo = String(req.query.aberta).trim().toLowerCase().slice(0, 64);
    const resumo = createHash("sha256").update(codigo).digest("hex");
    if (!codigo || !LINKS_ABERTOS.includes(resumo)) return res.status(404).json({ erro: "Link não encontrado." });
    // Sem as aulas marcadas com "aberta: false" em api/_aulas.js (e sem os módulos que ficarem vazios)
    const modulos = CURSO_GRATUITO.modulos
      .map((modulo) => ({ ...modulo, aulas: modulo.aulas.filter((aula) => aula.aberta !== false) }))
      .filter((modulo) => modulo.aulas.length);
    return res.status(200).json({ curso: { ...CURSO_GRATUITO, modulos } });
  }

  const pedido = String((req.query && req.query.curso) || "");
  const doEndereco = cursoPorEndereco(pedido);
  const curso = Object.hasOwn(CURSOS, pedido) ? pedido : doEndereco && doEndereco.aulas ? doEndereco.id : "gratuito";
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ erro: "Faça login para ver as aulas." });

  try {
    const db = banco();
    const { data, error } = await db.auth.getUser(token);
    // Só é "sessão expirada" quando o Supabase recusa o token; falha passageira dele não desloga ninguém
    if (error && error.status !== 401 && error.status !== 403) {
      console.error("Não foi possível conferir o login:", error.message);
      return res.status(503).json({ erro: "Não foi possível confirmar o seu login agora. Tente de novo." });
    }
    if (error || !data || !data.user) return res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });
    const usuario = data.user;

    const { data: aluno, error: erroAluno } = await db
      .from("alunos").select("nome, bloqueado").eq("id", usuario.id).maybeSingle();
    if (erroAluno) throw erroAluno;
    if (!aluno || aluno.bloqueado) return res.status(403).json({ erro: "Seu acesso não está liberado.", cursos: [] });

    const { data: acessos, error: erroAcesso } = await db
      .from("acessos").select("id, curso, primeiro_acesso_em, aulas_concluidas, concluido_em")
      .eq("aluno_id", usuario.id).is("revogado_em", null);
    if (erroAcesso) throw erroAcesso;
    const cursos = (acessos || []).map((a) => a.curso).filter((c) => Object.hasOwn(CURSOS, c));
    const acesso = (acessos || []).find((a) => a.curso === curso);
    if (!acesso) return res.status(403).json({ erro: "Seu acesso não está liberado.", cursos });

    const agora = new Date().toISOString();

    if (req.method === "POST") {
      const total = totalDeAulas(CURSOS[curso]);
      const lista = req.body && Array.isArray(req.body.concluidas) ? req.body.concluidas : null;
      if (!lista) return res.status(400).json({ erro: "Envie a lista de aulas concluídas." });
      const concluidas = [...new Set(lista.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < total))].sort((a, b) => a - b);
      const mudancas = { aulas_concluidas: concluidas, ultimo_acesso_em: agora };
      if (concluidas.length === total && !acesso.concluido_em) mudancas.concluido_em = agora;
      const { error: erroProgresso } = await db.from("acessos").update(mudancas).eq("id", acesso.id);
      if (erroProgresso) throw erroProgresso;
      return res.status(200).json({ ok: true, concluido: concluidas.length === total });
    }

    const { error: erroEntrada } = await db.from("acessos")
      .update({ primeiro_acesso_em: acesso.primeiro_acesso_em || agora, ultimo_acesso_em: agora })
      .eq("id", acesso.id);
    if (erroEntrada) console.error("Não foi possível marcar a entrada no curso:", erroEntrada.message);

    return res.status(200).json({
      curso: CURSOS[curso],
      aluno: { nome: aluno.nome },
      cursos,
      progresso: { concluidas: acesso.aulas_concluidas },
    });
  } catch (erro) {
    console.error("Erro na área do aluno:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as aulas agora." });
  }
}
