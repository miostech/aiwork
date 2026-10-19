// Endereço do Supabase e chave PÚBLICA, usados pelo login da área do curso.
// A chave pública pode ficar no navegador; a secreta nunca sai do servidor.
import { SUPABASE_URL, CHAVE_PUBLICA } from "./_supabase.js";

export default function handler(req, res) {
  if (!SUPABASE_URL || !CHAVE_PUBLICA) {
    return res.status(500).json({ erro: "Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente." });
  }
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({ supabaseUrl: SUPABASE_URL, supabaseChave: CHAVE_PUBLICA });
}
