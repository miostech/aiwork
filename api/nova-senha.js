// "Esqueci minha senha": gera uma senha nova e manda por e-mail.
//   POST { email }               → e-mail da IA Academy, com o link da área do aluno
//   POST { email, site: "miai" } → e-mail da MIAI Academy, com o link da conta da MIAI
// Sempre responde { ok: true }, para não revelar quem tem cadastro.
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";
import { trocarSenha, linkCurso } from "./_alunos.js";
import { enviarEmail } from "./_emails.js";
import { linkMiai } from "./_cursos.js";

const INTERVALO_MINIMO_MS = 2 * 60 * 1000; // no máximo uma senha nova a cada 2 minutos por aluno

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  const email = normalizarEmail(req.body && req.body.email);
  const miai = !!(req.body && req.body.site === "miai");
  if (!EMAIL_VALIDO.test(email)) {
    return res.status(400).json({ erro: "Digite um e-mail válido." });
  }

  try {
    const { data: aluno, error } = await banco()
      .from("alunos").select("id, nome, bloqueado, senha_enviada_em").eq("email", email).maybeSingle();
    if (error) throw error;

    const recente = aluno && aluno.senha_enviada_em &&
      Date.now() - new Date(aluno.senha_enviada_em).getTime() < INTERVALO_MINIMO_MS;

    if (aluno && !aluno.bloqueado && !recente) {
      const senha = await trocarSenha(aluno.id);
      const primeiroNome = String(aluno.nome || "").trim().split(/\s+/)[0] || "aluno(a)";
      await enviarEmail(
        miai ? "nova_senha_miai" : "nova_senha",
        email,
        {
          NOME: primeiroNome, EMAIL_ALUNO: email, SENHA: senha,
          LINK_CURSO: miai ? linkMiai("/conta") || "https://miaiacademy.com/conta" : linkCurso(),
        },
        `nova-senha-${aluno.id}-${Date.now()}`
      );
    }
  } catch (erro) {
    console.error("Erro no pedido de nova senha:", erro);
  }
  return res.status(200).json({ ok: true });
}
