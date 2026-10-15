// Link de acesso pessoal à área do curso.
// Quem é aprovado na validação recebe um código assinado; a área do curso só mostra
// as aulas para quem apresenta um código válido. Arquivos com "_" no início não viram
// endereço público na Vercel: este só é usado pelas outras funções.
//
// Variável de ambiente recomendada (Vercel → Settings → Environment Variables):
//   SEGREDO_ACESSO  um texto longo e aleatório. Sem ela, a assinatura usa uma chave
//                   derivada da ANTHROPIC_API_KEY; se essa chave for trocada, os links
//                   de acesso já enviados deixam de funcionar.
import crypto from "node:crypto";

function chave() {
  if (process.env.SEGREDO_ACESSO) return process.env.SEGREDO_ACESSO;
  if (process.env.ANTHROPIC_API_KEY) {
    return crypto.createHash("sha256").update("aiwork-acesso:" + process.env.ANTHROPIC_API_KEY).digest("hex");
  }
  throw new Error("Defina SEGREDO_ACESSO nas variáveis de ambiente da Vercel.");
}

function assinar(corpo) {
  return crypto.createHmac("sha256", chave()).update(corpo).digest();
}

// extra: campos opcionais guardados no código (ex.: { f: 1 } quando a conferência falhou)
export function criarAcesso(extra = {}) {
  const dados = { v: 1, id: crypto.randomBytes(9).toString("base64url"), t: Date.now(), ...extra };
  const corpo = Buffer.from(JSON.stringify(dados)).toString("base64url");
  return corpo + "." + assinar(corpo).toString("base64url");
}

// Devolve os dados do código se a assinatura for válida, ou null.
export function lerAcesso(codigo) {
  if (typeof codigo !== "string" || codigo.length > 500) return null;
  const [corpo, assinatura] = codigo.split(".");
  if (!corpo || !assinatura) return null;
  const esperada = assinar(corpo);
  const recebida = Buffer.from(assinatura, "base64url");
  if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) return null;
  try {
    return JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
