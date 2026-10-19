// Entrega as aulas do curso para quem está logado e tem acesso liberado.
// Usado pela curso.html, que manda o token do login no cabeçalho Authorization.
// As aulas ficam em api/_aulas.js.
import { banco } from "./_supabase.js";
import { CURSO } from "./_aulas.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erro: "Use GET." });
  }
  res.setHeader("Cache-Control", "no-store");

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ erro: "Faça login para ver as aulas." });

  try {
    const db = banco();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data || !data.user) return res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });
    const usuario = data.user;

    const { data: aluno, error: erroAluno } = await db
      .from("alunos").select("nome, bloqueado").eq("id", usuario.id).maybeSingle();
    if (erroAluno) throw erroAluno;
    if (!aluno || aluno.bloqueado) return res.status(403).json({ erro: "Seu acesso não está liberado." });

    const { data: acesso, error: erroAcesso } = await db
      .from("acessos").select("id")
      .eq("aluno_id", usuario.id).eq("curso", "gratuito").is("revogado_em", null)
      .maybeSingle();
    if (erroAcesso) throw erroAcesso;
    if (!acesso) return res.status(403).json({ erro: "Seu acesso não está liberado." });

    return res.status(200).json({ curso: CURSO, aluno: { nome: aluno.nome } });
  } catch (erro) {
    console.error("Erro ao carregar as aulas:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar as aulas agora." });
  }
}
