// Conta do aluno na MIAI Academy: quais cursos da MIAI ele comprou e quanto já assistiu de cada um.
// Usado pela miai/conta.html, que manda o token do login no cabeçalho Authorization.
//   GET /api/conta → { aluno: { nome }, cursos: [{ endereco, nome, concluidas, total }] }
// Só entram os cursos da MIAI (api/_cursos.js) com acesso liberado; o curso gratuito da IA Academy fica de fora.
import { banco } from "./_supabase.js";
import { CURSOS_MIAI, totalDeAulas } from "./_cursos.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ erro: "Use GET." });
  }
  res.setHeader("Cache-Control", "no-store");

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ erro: "Faça login para ver a sua conta." });

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
    if (!aluno || aluno.bloqueado) return res.status(200).json({ aluno: { nome: (aluno && aluno.nome) || "" }, cursos: [] });

    const { data: acessos, error: erroAcesso } = await db
      .from("acessos").select("curso, aulas_concluidas")
      .eq("aluno_id", usuario.id).is("revogado_em", null);
    if (erroAcesso) throw erroAcesso;

    const cursos = CURSOS_MIAI
      .map((curso) => {
        const acesso = (acessos || []).find((a) => a.curso === curso.id);
        if (!acesso) return null;
        const total = totalDeAulas(curso.aulas);
        const concluidas = (acesso.aulas_concluidas || []).filter((i) => i >= 0 && i < total).length;
        return { endereco: curso.endereco, nome: curso.nome, concluidas, total };
      })
      .filter(Boolean);

    return res.status(200).json({ aluno: { nome: aluno.nome || "" }, cursos });
  } catch (erro) {
    console.error("Erro na conta da MIAI:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar a sua conta agora." });
  }
}
