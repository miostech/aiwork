// Conexão com o Supabase usada pelas funções do servidor (chave secreta: nunca vai para o navegador).
// Variáveis de ambiente (a integração da Vercel com o Supabase pode usar os nomes antigos):
//   SUPABASE_URL                                         endereço do projeto
//   SUPABASE_SECRET_KEY      (ou SUPABASE_SERVICE_ROLE_KEY)  chave secreta, só no servidor
//   SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY)          chave pública, usada no login da área do curso
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const CHAVE_PUBLICA =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const CHAVE_SECRETA = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let cliente = null;

export function banco() {
  if (!cliente) {
    if (!SUPABASE_URL || !CHAVE_SECRETA) {
      throw new Error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY nas variáveis de ambiente.");
    }
    cliente = createClient(SUPABASE_URL, CHAVE_SECRETA, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
}

export function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
