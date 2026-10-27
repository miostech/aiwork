// Loja dos plugins do Claude Code (marketplace "miai"): cada aluno adiciona a dele uma vez só, com o link pessoal que
// aparece na aula "Instalar o plugin", e vê nela só os plugins dos cursos que comprou.
// Atendida pela função api/conta.js; o vercel.json leva estes endereços para lá:
//   GET  /loja/<licença>/marketplace.json        → catálogo (cada plugin aponta para /p/<licença>/<plugin>.git)
//   GET  /p/<licença>/<plugin>.git/info/refs     → git só leitura: confere a licença e repassa, em streaming, o
//   POST /p/<licença>/<plugin>.git/git-upload-pack  repositório privado do plugin (o GITHUB_TOKEN nunca sai daqui)
//   GET  /licenca/<licença>?plugin=<nome>        → { ativa, motivo }: o plugin confere a cada sessão (motor/licenca.py)
// Reembolso tira o acesso ao curso (api/stripe-webhook.js): o plugin some da loja, para de atualizar e de funcionar.
//
// Variável de ambiente:
//   GITHUB_TOKEN  token fine-grained da miostech com "Contents: Read-only" nos repositórios miostech/miai-plugin-*
import { Readable } from "node:stream";
import { banco } from "./_supabase.js";
import { CURSOS_MIAI } from "./_cursos.js";
import { LICENCA, cursosAtivos, enderecoLoja } from "./_plugins.js";

const PLUGINS = CURSOS_MIAI.filter((c) => c.plugin);

async function corpoBruto(req) {
  const partes = [];
  for await (const parte of req) partes.push(typeof parte === "string" ? Buffer.from(parte) : parte);
  return Buffer.concat(partes);
}

// Cursos com plugin que a licença libera agora: { existe, cursos, motivo }
async function liberadosPor(codigo) {
  if (!LICENCA.test(codigo)) return { existe: false, cursos: [], motivo: "licença não encontrada" };
  const db = banco();
  const { data: linha, error } = await db.from("licencas_plugin").select("aluno_id").eq("codigo", codigo).maybeSingle();
  if (error) throw error;
  if (!linha) return { existe: false, cursos: [], motivo: "licença não encontrada" };
  return { existe: true, ...(await cursosAtivos(db, linha.aluno_id)) };
}

async function catalogo(req, res, codigo) {
  const { existe, cursos } = await liberadosPor(codigo);
  if (!existe) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(404).send("Licença não encontrada. Copie o comando de novo na aula \"Instalar o plugin\" da MIAI.\n");
  }
  const base = enderecoLoja(req);
  // Licença sem nenhum curso ativo (reembolso) continua sendo uma loja válida, só que vazia
  return res.status(200).json({
    name: "miai",
    description: "Plugins da MIAI Academy",
    owner: { name: "MIAI Academy", url: "https://www.miaiacademy.com" },
    plugins: cursos.map((c) => ({
      name: c.plugin,
      description: c.descricaoPlugin || c.nome,
      source: { source: "url", url: `${base}/p/${codigo}/${c.plugin}.git` },
    })),
  });
}

async function git(req, res, codigo, nome, rota) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  if (!["info/refs", "git-upload-pack"].includes(rota)) return res.status(404).send("Não encontrado\n");
  if (rota === "info/refs" && req.query.service !== "git-upload-pack") return res.status(403).send("Somente leitura\n");
  const plugin = PLUGINS.find((c) => c.plugin === nome);
  if (!plugin) return res.status(404).send("Plugin não encontrado\n");
  const { cursos, motivo } = await liberadosPor(codigo);
  if (!cursos.includes(plugin)) {
    return res.status(403).send(`Sua licença não libera o plugin ${nome}${motivo ? ` (${motivo})` : ""}.\n`);
  }
  if (!process.env.GITHUB_TOKEN) {
    console.error("Defina GITHUB_TOKEN nas variáveis de ambiente.");
    return res.status(503).send("A loja está com um problema agora. Tente de novo em instantes.\n");
  }

  const cabecalhos = {
    Authorization: "Basic " + Buffer.from(`x-access-token:${process.env.GITHUB_TOKEN}`).toString("base64"),
    "User-Agent": req.headers["user-agent"] || "git/2",
  };
  for (const h of ["content-type", "accept", "git-protocol", "content-encoding"]) {
    if (req.headers[h]) cabecalhos[h] = req.headers[h];
  }
  const busca = req.query.service ? `?service=${encodeURIComponent(req.query.service)}` : "";
  const r = await fetch(`https://github.com/${plugin.repo}.git/${rota}${busca}`, {
    method: req.method, headers: cabecalhos, body: req.method === "POST" ? await corpoBruto(req) : undefined,
  });
  if (r.status === 401 || r.status === 404) {
    console.error(`GitHub recusou ${plugin.repo} (${r.status}): confira o GITHUB_TOKEN`);
    return res.status(503).send("A loja está com um problema agora. Tente de novo em instantes.\n");
  }
  res.statusCode = r.status;
  for (const h of ["content-type", "cache-control", "expires", "pragma"]) {
    if (r.headers.get(h)) res.setHeader(h, r.headers.get(h));
  }
  // Streaming: o pacote do plugin tem dezenas de MB (a resposta comum da Vercel para em 4,5 MB)
  Readable.fromWeb(r.body).pipe(res);
}

async function conferir(req, res, codigo) {
  const { cursos, motivo } = await liberadosPor(codigo);
  const nome = String(req.query.plugin || "");
  const ativa = nome ? cursos.some((c) => c.plugin === nome) : cursos.length > 0;
  return res.status(200).json({ ativa, motivo: ativa ? "" : motivo || "acesso retirado" });
}

export async function atenderLoja(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const codigo = String(req.query.licenca || "");
  try {
    if (req.query.loja === "catalogo" && req.method === "GET") return await catalogo(req, res, codigo);
    if (req.query.loja === "git" && ["GET", "POST"].includes(req.method)) {
      return await git(req, res, codigo, String(req.query.plugin || ""), String(req.query.rota || ""));
    }
    if (req.query.loja === "licenca" && req.method === "GET") return await conferir(req, res, codigo);
    return res.status(404).json({ erro: "Não encontrado." });
  } catch (erro) {
    console.error("Erro na loja de plugins:", erro);
    if (!res.headersSent) return res.status(500).json({ erro: "A loja está com um problema agora." });
    res.end();
  }
}
