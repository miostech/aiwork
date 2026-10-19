// Guarda os leads do formulário da página inicial e o avanço deles no funil.
//   POST { acao: "criar", nome, email, whatsapp, origem }  → { lead }
//   POST { acao: "etapa", lead, etapa: "abriu_plataforma" } → { ok }
import { banco, normalizarEmail, EMAIL_VALIDO } from "./_supabase.js";

const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const ETAPAS_DO_NAVEGADOR = ["abriu_plataforma"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(valor, limite) {
  return String(valor || "").trim().slice(0, limite);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  const corpo = req.body || {};

  try {
    if (corpo.acao === "criar") {
      const nome = texto(corpo.nome, 120);
      const email = normalizarEmail(corpo.email).slice(0, 200);
      if (nome.length < 2 || !EMAIL_VALIDO.test(email)) {
        return res.status(400).json({ erro: "Nome ou e-mail inválido." });
      }
      // Parâmetros do link (até 20, só textos curtos)
      const origem = {};
      Object.entries(corpo.origem && typeof corpo.origem === "object" ? corpo.origem : {})
        .slice(0, 20)
        .forEach(([chave, valor]) => { origem[texto(chave, 40)] = texto(valor, 200); });

      const linha = { nome, email, whatsapp: texto(corpo.whatsapp, 30) || null, origem };
      UTMS.forEach((u) => { if (origem[u]) linha[u] = origem[u]; });

      const { data, error } = await banco().from("leads").insert(linha).select("id").single();
      if (error) throw error;
      return res.status(200).json({ lead: data.id });
    }

    if (corpo.acao === "etapa") {
      if (!UUID.test(String(corpo.lead || "")) || !ETAPAS_DO_NAVEGADOR.includes(corpo.etapa)) {
        return res.status(400).json({ erro: "Pedido inválido." });
      }
      // Só avança quem ainda está no começo do funil
      const { error } = await banco().from("leads")
        .update({ etapa: corpo.etapa })
        .eq("id", corpo.lead)
        .eq("etapa", "formulario");
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ erro: "Ação desconhecida." });
  } catch (erro) {
    console.error("Erro ao gravar o lead:", erro);
    return res.status(500).json({ erro: "Não foi possível salvar agora." });
  }
}
