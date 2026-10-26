// "Avise-me dos próximos cursos" da página inicial da MIAI: guarda o e-mail de quem quer saber dos lançamentos.
//   POST { email, origem } → { ok: true } (o mesmo e-mail pedido de novo não duplica)
// Os e-mails ficam na tabela "interessados" (supabase/schema.sql), fechada para o navegador.
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";

const ORIGENS = ["miai"];

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
