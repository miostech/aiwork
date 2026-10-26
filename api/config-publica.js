// Endereço do Supabase e chave PÚBLICA, usados pelo login da área do curso.
// A chave pública pode ficar no navegador; a secreta nunca sai do servidor.
//
// GET ?pais → { pais: "BR" }: o país de quem está vendo a página (a Vercel descobre pelo IP, que não é guardado),
// usado por /pais.js para mostrar o preço na moeda em que o Stripe cobra: reais no Brasil, dólar fora.
// Fica nesta função para não passar do limite de funções da Vercel.
import { SUPABASE_URL, CHAVE_PUBLICA } from "./_supabase.js";

export default function handler(req, res) {
  if (req.query && "pais" in req.query) {
    const pais = String(req.headers["x-vercel-ip-country"] || "").toUpperCase();
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({ pais: /^[A-Z]{2}$/.test(pais) ? pais : "" });
  }
  if (!SUPABASE_URL || !CHAVE_PUBLICA) {
    return res.status(500).json({ erro: "Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente." });
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({ supabaseUrl: SUPABASE_URL, supabaseChave: CHAVE_PUBLICA });
}
