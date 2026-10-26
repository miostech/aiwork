// Conta uma visita de página para o painel (/painel). Chamado pelo contador.js de cada página.
//   POST { pagina, visitante, utm_source, referencia } → 204
// Guarda só a página, um número anônimo do navegador, o país (a Vercel descobre pelo IP, que não é guardado),
// a origem do anúncio e o site de onde a pessoa veio. Cada visitante conta uma vez por página por dia.
import { banco } from "./_supabase.js";

const PAGINAS = [
  "inicio", "cadastro", "aiwork", "aiwork-obrigado", "curso",                    // IA Academy
  "miai-inicio", "miai-ia-work", "miai-obrigado", "miai-conta", "miai-aulas",     // MIAI Academy
  "miai-lista-espera",
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROBOS = /bot|crawl|spider|preview|headless|lighthouse|pingdom|monitor/i;

function texto(valor, limite) {
  return String(valor || "").trim().slice(0, limite) || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }
  let corpo = req.body;
  if (typeof corpo === "string") { try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; } }
  corpo = corpo || {};

  if (!PAGINAS.includes(corpo.pagina) || !UUID.test(String(corpo.visitante || "")) || ROBOS.test(req.headers["user-agent"] || "")) {
    return res.status(204).end();
  }

  const pais = String(req.headers["x-vercel-ip-country"] || "").toUpperCase();
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  try {
    const { error } = await banco().from("visitas").upsert({
      dia,
      pagina: corpo.pagina,
      visitante: corpo.visitante.toLowerCase(),
      pais: /^[A-Z]{2}$/.test(pais) ? pais : null,
      utm_source: texto(corpo.utm_source, 100),
      referencia: texto(corpo.referencia, 100),
    }, { onConflict: "pagina,visitante,dia", ignoreDuplicates: true });
    if (error) console.error("Não foi possível contar a visita:", error.message);
  } catch (erro) {
    console.error("Erro ao contar a visita:", erro);
  }
  return res.status(204).end();
}
