// Etapa final da cadastro.html: a pessoa informa o e-mail que usou para criar a conta na plataforma (Hub).
// Guarda esse e-mail no lead (coluna email_plataforma, com conferencia = "pendente") para você conferir
// depois na lista de indicados da plataforma. Em seguida cria o login, libera o curso gratuito e manda a senha.
//
// Depois de conferir, mude "conferencia" do lead no Supabase (Table Editor → leads):
//   "confirmado"     → mantém o acesso
//   "nao_encontrado" → tira o acesso ao curso gratuito na hora (gatilho no banco)
//
//   POST { lead, nome, email, whatsapp, emailPlataforma } → { liberado, email, emailEnviado, senha? } ou { erro }
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";
import { acharOuCriarLead } from "./_leads.js";
import { liberarAcesso, linkCurso } from "./_alunos.js";
import { enviarEmail } from "./_emails.js";

const PLATAFORMA = process.env.PLATAFORMA || "Hub";
const INTERVALO_MINIMO_MS = 2 * 60 * 1000; // no máximo um e-mail com senha a cada 2 minutos por aluno

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  const corpo = req.body || {};
  const emailPlataforma = normalizarEmail(corpo.emailPlataforma).slice(0, 200);
  if (!EMAIL_VALIDO.test(emailPlataforma)) {
    return res.status(400).json({ erro: `Digite o e-mail que você usou para criar sua conta na ${PLATAFORMA}.` });
  }

  try {
    const db = banco();
    // Quem chegou sem passar pelo formulário entra com o mesmo e-mail que usou na plataforma
    const lead = await acharOuCriarLead({ ...corpo, email: corpo.email || emailPlataforma }, "confirmacao");
    if (!lead) {
      return res.status(400).json({
        erro: "Não encontramos o seu cadastro. Volte à página inicial e preencha o formulário de novo.",
      });
    }

    if (lead.conferencia === "nao_encontrado" && normalizarEmail(lead.email_plataforma) === emailPlataforma) {
      return res.status(200).json({
        liberado: false,
        erro: `Não encontramos uma conta na ${PLATAFORMA} com esse e-mail criada pelo nosso link. Crie sua conta pelo botão da etapa anterior e digite aqui o e-mail que usou.`,
      });
    }

    const { error: erroLead } = await db.from("leads")
      .update({ email_plataforma: emailPlataforma, conferencia: "pendente", etapa: "aprovado" })
      .eq("id", lead.id);
    if (erroLead) throw erroLead;

    // Se a senha acabou de ser enviada, não manda outra (evita e-mails repetidos)
    const { data: aluno, error: erroAluno } = await db
      .from("alunos").select("senha_enviada_em").eq("email", normalizarEmail(lead.email)).maybeSingle();
    if (erroAluno) throw erroAluno;
    const recente = aluno && aluno.senha_enviada_em &&
      Date.now() - new Date(aluno.senha_enviada_em).getTime() < INTERVALO_MINIMO_MS;
    if (recente) {
      return res.status(200).json({ liberado: true, email: lead.email, emailEnviado: true });
    }

    const conta = await liberarAcesso({
      nome: lead.nome, email: lead.email, whatsapp: lead.whatsapp,
      origem: "confirmacao", referencia: lead.id, leadId: lead.id,
    });
    if (conta.bloqueado) {
      return res.status(200).json({ liberado: false, erro: "Seu acesso está bloqueado. Fale com o suporte." });
    }

    const primeiroNome = String(lead.nome || "").trim().split(/\s+/)[0] || "aluno(a)";
    const envio = await enviarEmail(
      "acesso",
      lead.email,
      { NOME: primeiroNome, EMAIL_ALUNO: lead.email, SENHA: conta.senha, LINK_CURSO: linkCurso() },
      `acesso-${lead.id}-${Date.now()}`
    );

    const resposta = { liberado: true, email: lead.email, emailEnviado: envio.ok };
    if (!envio.ok) resposta.senha = conta.senha; // se o e-mail falhar, a senha aparece na tela para a pessoa anotar
    return res.status(200).json(resposta);
  } catch (erro) {
    console.error("Erro ao confirmar o cadastro:", erro);
    return res.status(500).json({ erro: "Não foi possível liberar suas aulas agora. Tente de novo em instantes." });
  }
}
