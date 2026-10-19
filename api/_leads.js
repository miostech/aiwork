// Leads do funil (tabela "leads"), usados pelas funções da cadastro.html.
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lead da pessoa: o do formulário ou, se ele se perdeu no navegador, um novo com os dados enviados.
// "via" fica gravado na origem do lead novo, para saber em que etapa ele foi criado.
export async function acharOuCriarLead({ lead, nome, email, whatsapp }, via = "validacao") {
  const db = banco();
  const campos = "id, nome, email, whatsapp, email_plataforma, conferencia";
  if (UUID.test(String(lead || ""))) {
    const { data, error } = await db.from("leads").select(campos).eq("id", lead).maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  const emailNorm = normalizarEmail(email);
  const nomeLimpo = String(nome || "").trim().slice(0, 120);
  if (!EMAIL_VALIDO.test(emailNorm) || nomeLimpo.length < 2) return null;
  const { data, error } = await db.from("leads")
    .insert({ nome: nomeLimpo, email: emailNorm, whatsapp: String(whatsapp || "").slice(0, 30) || null, origem: { via } })
    .select(campos).single();
  if (error) throw error;
  return data;
}
