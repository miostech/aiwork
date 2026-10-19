// Números do painel (/painel): funil do curso gratuito e vendas do IA Work.
// Só para os e-mails em ADMIN_EMAILS (separados por vírgula), que entram com o mesmo login da área do aluno.
//   GET /api/painel?dias=7|30|90   (sem "dias" = desde o começo)
// As contas são feitas no banco pela função painel_funil (supabase/schema.sql).
import { banco, normalizarEmail } from "./_supabase.js";

const ADMINS = String(process.env.ADMIN_EMAILS || "").split(",").map(normalizarEmail).filter(Boolean);

// Começo do dia (horário de Brasília) de "dias - 1" dias atrás: "7 dias" = hoje e os 6 dias anteriores
function inicioDoPeriodo(dias) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const inicio = new Date(hoje + "T00:00:00-03:00");
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
  return inicio.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ erro: "Use GET." });
  }
  res.setHeader("Cache-Control", "no-store");

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ erro: "Faça login para ver o painel." });

  try {
    const db = banco();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data || !data.user) return res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });
    if (!ADMINS.includes(normalizarEmail(data.user.email))) {
      return res.status(403).json({ erro: "Este painel é só para a administração da IA Academy." });
    }

    const dias = Number(req.query && req.query.dias);
    const desde = [7, 30, 90].includes(dias) ? inicioDoPeriodo(dias) : null;
    const { data: numeros, error: erroNumeros } = await db.rpc("painel_funil", { desde });
    if (erroNumeros) throw erroNumeros;

    return res.status(200).json({ periodo: { dias: desde ? dias : null, desde }, atualizado_em: new Date().toISOString(), ...numeros });
  } catch (erro) {
    console.error("Erro no painel:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar os números agora." });
  }
}
