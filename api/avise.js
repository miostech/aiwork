// Avisos da MIAI Academy, gravados no banco (tabelas fechadas para o navegador):
//   POST { email, origem }                        → { ok: true }  "Avise-me dos próximos cursos" da página inicial
//                                                                  (tabela "interessados"; e-mail repetido não duplica)
//   POST { curso, nome, email, whatsapp, origem } → { ok: true }  lista de espera de um curso
//                                                                  (ex.: miaiacademy.com/ia-work/lista-de-espera;
//                                                                  tabela "lista_espera", uma linha por pessoa e curso)
// As duas ficam nesta função para não passar do limite de funções da Vercel.
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";
import { CURSOS_MIAI } from "./_cursos.js";

const ORIGENS = ["miai"];

function texto(valor, limite) {
  return String(valor || "").trim().replace(/\s+/g, " ").slice(0, limite);
}

// WhatsApp no formato internacional (+5511912345678). Sem o "+", 10 ou 11 dígitos contam como número do Brasil.
function whatsappInternacional(valor) {
  const bruto = String(valor || "").trim();
  let digitos = bruto.replace(/\D/g, "");
  if (!bruto.startsWith("+") && (digitos.length === 10 || digitos.length === 11)) digitos = "55" + digitos;
  return digitos.length >= 10 && digitos.length <= 15 ? "+" + digitos : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  let corpo = req.body;
  if (typeof corpo === "string") { try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; } }
  corpo = corpo || {};

  // Campo escondido que só robôs preenchem
  if (corpo.site) return res.status(200).json({ ok: true });

  const email = normalizarEmail(corpo.email);
  if (!EMAIL_VALIDO.test(email) || email.length > 200) {
    return res.status(400).json({ erro: "Digite um e-mail válido." });
  }

  // ── Lista de espera de um curso
  if (corpo.curso !== undefined) {
    const curso = CURSOS_MIAI.find((c) => c.endereco === corpo.curso);
    if (!curso) return res.status(400).json({ erro: "Curso não encontrado." });
    const nome = texto(corpo.nome, 100);
    if (nome.length < 2) return res.status(400).json({ erro: "Digite o seu nome." });
    const whatsapp = whatsappInternacional(corpo.whatsapp);
    if (!whatsapp) return res.status(400).json({ erro: "Digite o seu WhatsApp com DDD." });
    const origem = /^[a-z0-9-]{1,40}$/.test(corpo.origem || "") ? corpo.origem : null;
    try {
      const { error } = await banco().from("lista_espera")
        .upsert({ curso: curso.endereco, email, nome, whatsapp, origem }, { onConflict: "curso,email" });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    } catch (erro) {
      console.error("Não foi possível guardar na lista de espera:", erro.message || erro);
      return res.status(500).json({ erro: "Não conseguimos guardar agora. Tente de novo em instantes." });
    }
  }

  // ── "Avise-me dos próximos cursos"
  const origem = ORIGENS.includes(corpo.origem) ? corpo.origem : "miai";
  try {
    const { error } = await banco().from("interessados")
      .upsert({ email, origem }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (erro) {
    console.error("Não foi possível guardar o interessado:", erro.message || erro);
    return res.status(500).json({ erro: "Não conseguimos guardar agora. Tente de novo em instantes." });
  }
}
