// Painel (/painel): números do funil e das vendas, lista de leads e conferência da Hub.
// Só para os e-mails em ADMIN_EMAILS (separados por vírgula), que entram com o mesmo login da área do aluno.
//   GET  /api/painel?dias=7|30|90                       → números (sem "dias" = desde o começo)
//   GET  /api/painel?leads=1&filtro=pendente&busca=&pagina=0 → lista de leads (50 por página)
//   POST /api/painel { lead, conferencia }              → muda a conferência da Hub do lead:
//        "confirmado", "nao_encontrado" (tira o acesso só de quem entrou quando o curso era gratuito) ou "pendente"
// As contas e a lista vêm das funções painel_funil e painel_leads (supabase/schema.sql).
import { banco, normalizarEmail } from "./_supabase.js";
import { CURSO as CURSO_GRATUITO } from "./_aulas.js";

const ADMINS = String(process.env.ADMIN_EMAILS || "").split(",").map(normalizarEmail).filter(Boolean);
const FILTROS = ["pendente", "confirmado", "nao_encontrado", "todos"];
const CONFERENCIAS = ["pendente", "confirmado", "nao_encontrado"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POR_PAGINA = 50;
const TOTAL_AULAS = CURSO_GRATUITO.modulos.reduce((soma, m) => soma + m.aulas.length, 0);

// Começo do dia (horário de Brasília) de "dias - 1" dias atrás: "7 dias" = hoje e os 6 dias anteriores
function inicioDoPeriodo(dias) {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const inicio = new Date(hoje + "T00:00:00-03:00");
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
  return inicio.toISOString();
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erro: "Use GET ou POST." });
  }
  res.setHeader("Cache-Control", "no-store");

  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ erro: "Faça login para ver o painel." });

  try {
    const db = banco();
    const { data, error } = await db.auth.getUser(token);
    // Só é "sessão expirada" quando o Supabase recusa o token; falha passageira dele não desloga ninguém
    if (error && error.status !== 401 && error.status !== 403) {
      console.error("Não foi possível conferir o login:", error.message);
      return res.status(503).json({ erro: "Não foi possível confirmar o seu login agora. Tente de novo." });
    }
    if (error || !data || !data.user) return res.status(401).json({ erro: "Sua sessão expirou. Entre de novo." });
    if (!ADMINS.includes(normalizarEmail(data.user.email))) {
      return res.status(403).json({ erro: "Este painel é só para a administração da IA Academy." });
    }
    const q = req.query || {};

    // Conferência da Hub feita pelo painel (o gatilho do banco tira ou devolve o acesso de quem entrou de graça)
    if (req.method === "POST") {
      const corpo = req.body || {};
      if (!UUID.test(String(corpo.lead || "")) || !CONFERENCIAS.includes(corpo.conferencia)) {
        return res.status(400).json({ erro: "Pedido inválido." });
      }
      const { data: lead, error: erroLead } = await db.from("leads")
        .update({ conferencia: corpo.conferencia }).eq("id", corpo.lead)
        .select("id, conferencia, aluno_id").maybeSingle();
      if (erroLead) throw erroLead;
      if (!lead) return res.status(404).json({ erro: "Lead não encontrado." });
      let acessoRetirado = false;
      if (lead.aluno_id) {
        const { data: acesso } = await db.from("acessos").select("revogado_em")
          .eq("aluno_id", lead.aluno_id).eq("curso", "gratuito").maybeSingle();
        acessoRetirado = !!(acesso && acesso.revogado_em);
      }
      return res.status(200).json({ ok: true, conferencia: lead.conferencia, acesso_retirado: acessoRetirado });
    }

    // Lista de leads
    if (q.leads) {
      const filtro = FILTROS.includes(q.filtro) ? q.filtro : "pendente";
      const busca = String(q.busca || "").trim().slice(0, 100);
      const pagina = Math.max(0, Math.min(1000, Number(q.pagina) || 0));
      const { data: lista, error: erroLista } = await db.rpc("painel_leads", {
        filtro, busca: busca || null, limite: POR_PAGINA, deslocamento: pagina * POR_PAGINA,
      });
      if (erroLista) throw erroLista;
      return res.status(200).json({ ...lista, filtro, busca, pagina, por_pagina: POR_PAGINA, total_aulas: TOTAL_AULAS });
    }

    // Números do funil e das vendas
    const dias = Number(q.dias);
    const desde = [7, 30, 90].includes(dias) ? inicioDoPeriodo(dias) : null;
    const { data: numeros, error: erroNumeros } = await db.rpc("painel_funil", { desde });
    if (erroNumeros) throw erroNumeros;
    return res.status(200).json({ periodo: { dias: desde ? dias : null, desde }, atualizado_em: new Date().toISOString(), ...numeros });
  } catch (erro) {
    console.error("Erro no painel:", erro);
    return res.status(500).json({ erro: "Não foi possível carregar o painel agora." });
  }
}
