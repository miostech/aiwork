// Etapa final da cadastro.html: a pessoa informa o e-mail que usou para criar a conta na plataforma (Hub).
// Guarda esse e-mail no lead (coluna email_plataforma, com conferencia = "pendente") para você conferir
// depois na lista de indicados da plataforma (painel → leads).
//
// A Formação IA Academy é paga: o pagamento já liberou as aulas e mandou a senha por e-mail (api/stripe-webhook.js).
// Por isso aqui ninguém ganha senha nova; só segue quem tem o pagamento (ou o acesso) da Formação.
// A conferência "nao_encontrado" só tira o acesso de quem entrou quando o curso era gratuito (gatilho no banco).
//
//   POST { lead, nome, email, whatsapp, emailPlataforma } → { liberado, email, emailEnviado } ou { liberado: false, erro }
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";
import { acharOuCriarLead } from "./_leads.js";

const PLATAFORMA = process.env.PLATAFORMA || "Hub";
const CURSO = "gratuito";   // nome no banco da Formação IA Academy (era o curso gratuito)

// Pagamento da Formação ligado a este cadastro: pelo id do lead (enviado ao Stripe) ou pelo e-mail
async function pagamentoDoLead(db, lead) {
  const { data, error } = await db.from("compras")
    .select("status, email")
    .eq("curso", CURSO)
    .in("status", ["pago", "aguardando"])
    .or(`referencia.eq."${lead.id}",email.eq."${normalizarEmail(lead.email).replace(/"/g, "")}"`)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data || []).find((c) => c.status === "pago") || (data || [])[0] || null;
}

// A pessoa já tem as aulas liberadas (pagou, ou entrou quando o curso era gratuito)?
async function temAcesso(db, email) {
  const { data: aluno, error } = await db.from("alunos").select("id, bloqueado").eq("email", normalizarEmail(email)).maybeSingle();
  if (error) throw error;
  if (!aluno || aluno.bloqueado) return false;
  const { data: acesso, error: erroAcesso } = await db.from("acessos")
    .select("id").eq("aluno_id", aluno.id).eq("curso", CURSO).is("revogado_em", null).maybeSingle();
  if (erroAcesso) throw erroAcesso;
  return !!acesso;
}

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

    const compra = await pagamentoDoLead(db, lead);
    const liberado = (compra && compra.status === "pago") || await temAcesso(db, lead.email);
    if (!liberado) {
      return res.status(200).json({
        liberado: false,
        erro: compra
          ? "Seu pagamento ainda está sendo confirmado. Tente de novo em alguns instantes."
          : "Não encontramos o pagamento da sua vaga neste cadastro. Volte à página inicial para garantir sua vaga.",
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

    // O e-mail com a senha foi enviado no pagamento, para o e-mail usado no Stripe
    return res.status(200).json({ liberado: true, email: (compra && compra.email) || lead.email, emailEnviado: true });
  } catch (erro) {
    console.error("Erro ao confirmar o cadastro:", erro);
    return res.status(500).json({ erro: "Não foi possível confirmar agora. Tente de novo em instantes." });
  }
}
