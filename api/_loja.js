// Loja dos plugins do Claude Code (marketplace "miai"): cada aluno adiciona a dele uma vez só, com o link pessoal que
// aparece na aula "Instalar o plugin", e vê nela só os plugins dos cursos que comprou.
// Atendida pela função api/conta.js; o vercel.json leva estes endereços para lá:
//   GET  /loja/<licença>/marketplace.json        → catálogo (cada plugin aponta para /p/<licença>/<plugin>.git)
//   GET  /p/<licença>/<plugin>.git/info/refs     → git só leitura: confere a licença e repassa, em streaming, o
//   POST /p/<licença>/<plugin>.git/git-upload-pack  repositório privado do plugin (o GITHUB_TOKEN nunca sai daqui)
//   GET  /licenca/<licença>?plugin=<nome>        → { ativa, motivo }: o plugin confere a cada sessão (motor/licenca.py)
//   GET  /imagens/<licença>?q=&tipo=foto|video&orientacao=vertical|horizontal&n=8
//        → fotos e vídeos sobre o tema (Pixabay; Pexels se só houver a chave dele), para os plugins de edição (Editfy
//          e Editfy Reels) usarem no vídeo. Só com a licença de um deles ativa; a chave nunca sai daqui. As duas
//          licenças: uso comercial livre, sem crédito obrigatório (não vale revender a imagem sozinha).
// Reembolso tira o acesso ao curso (api/stripe-webhook.js): o plugin some da loja, para de atualizar e de funcionar.
//
// Variáveis de ambiente:
//   GITHUB_TOKEN      token fine-grained da miostech com "Contents: Read-only" nos repositórios miostech/miai-plugin-*
//   PIXABAY_API_KEY   chave da API do Pixabay (pixabay.com/api/docs), para /imagens
//   PEXELS_API_KEY    chave do Pexels (www.pexels.com/api), usada só se não houver a do Pixabay
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

// Plugins que podem buscar imagens: os de edição de vídeo
const COM_IMAGENS = ["editfy", "editfy-reels"];

// Pixabay: fotos (até 1280 px) e vídeos (quase todos horizontais). Licença: uso comercial livre, sem crédito obrigatório;
// as buscas ficam guardadas 24 h (regra da API) pelo cache da Vercel.
async function buscarPixabay(q, video, orientacao, n) {
  const busca = new URLSearchParams({ key: process.env.PIXABAY_API_KEY, q, per_page: String(Math.max(3, n)), lang: "pt",
                                      safesearch: "true" });
  if (!video) {
    busca.set("image_type", "photo");
    if (orientacao === "vertical" || orientacao === "horizontal") busca.set("orientation", orientacao);
  }
  const r = await fetch(`https://pixabay.com/api/${video ? "videos/" : ""}?${busca}`);
  if (!r.ok) return { status: r.status };
  const dados = await r.json();
  const itens = (dados.hits || []).slice(0, n).map((h) => {
    if (video) {
      // a versão mais perto de 1080 no lado menor (a "large" costuma ser 4K e pesada)
      const versoes = Object.values(h.videos || {}).filter((v) => v && v.url && v.width);
      versoes.sort((a, b) => Math.abs(Math.min(a.width, a.height) - 1080) - Math.abs(Math.min(b.width, b.height) - 1080));
      const v = versoes[0];
      return v && { id: h.id, tipo: "video", largura: v.width, altura: v.height, duracao: h.duration, autor: h.user,
                    pagina: h.pageURL, descricao: h.tags || "", arquivo: v.url,
                    miniatura: (h.videos.medium && h.videos.medium.thumbnail) || v.thumbnail };
    }
    const k = 1280 / Math.max(h.imageWidth, h.imageHeight);
    return { id: h.id, tipo: "foto", largura: Math.round(h.imageWidth * Math.min(1, k)), altura: Math.round(h.imageHeight * Math.min(1, k)),
             autor: h.user, pagina: h.pageURL, descricao: h.tags || "", arquivo: h.largeImageURL, miniatura: h.webformatURL };
  }).filter(Boolean);
  return { status: 200, corpo: { fonte: "Pixabay", licenca: "https://pixabay.com/service/license-summary/", itens } };
}

// Pexels (se houver chave): fotos e vídeos verticais. Licença: uso comercial livre, sem crédito obrigatório.
async function buscarPexels(q, video, orientacao, n) {
  const busca = new URLSearchParams({ query: q, per_page: String(n), locale: "pt-BR" });
  const ori = { vertical: "portrait", horizontal: "landscape", quadrada: "square" }[orientacao];
  if (ori) busca.set("orientation", ori);
  const r = await fetch(`https://api.pexels.com/${video ? "videos/" : "v1/"}search?${busca}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY },
  });
  if (!r.ok) return { status: r.status };
  const dados = await r.json();
  const itens = video
    ? (dados.videos || []).map((v) => {
        const ok = (v.video_files || []).filter((a) => a.link && a.width && Math.min(a.width, a.height) <= 2160);
        ok.sort((a, b) => Math.abs(Math.min(a.width, a.height) - 1080) - Math.abs(Math.min(b.width, b.height) - 1080));
        const a = ok[0];
        return a && { id: v.id, tipo: "video", largura: a.width, altura: a.height, duracao: v.duration, autor: v.user && v.user.name,
                      pagina: v.url, arquivo: a.link, miniatura: v.image };
      }).filter(Boolean)
    : (dados.photos || []).map((f) => ({ id: f.id, tipo: "foto", largura: f.width, altura: f.height, autor: f.photographer,
                                         pagina: f.url, descricao: f.alt || "", arquivo: f.src && (f.src.large2x || f.src.original),
                                         miniatura: f.src && f.src.medium }));
  return { status: 200, corpo: { fonte: "Pexels", licenca: "https://www.pexels.com/license/", itens } };
}

async function imagens(req, res, codigo) {
  const { cursos, motivo } = await liberadosPor(codigo);
  if (!cursos.some((c) => COM_IMAGENS.includes(c.plugin))) {
    return res.status(403).json({ erro: `Sua licença não libera a busca de imagens${motivo ? ` (${motivo})` : ""}.` });
  }
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.status(400).json({ erro: "Diga o que buscar (q)." });
  const buscar = process.env.PIXABAY_API_KEY ? buscarPixabay : process.env.PEXELS_API_KEY ? buscarPexels : null;
  if (!buscar) {
    console.error("Defina PIXABAY_API_KEY (ou PEXELS_API_KEY) nas variáveis de ambiente.");
    return res.status(503).json({ erro: "A busca de imagens está com um problema agora. Tente de novo em instantes." });
  }
  const n = Math.min(15, Math.max(1, parseInt(req.query.n, 10) || 8));
  const r = await buscar(q, req.query.tipo === "video", String(req.query.orientacao || ""), n);
  if (r.status === 429) return res.status(429).json({ erro: "Muitas buscas agora. Espere um minuto e tente de novo." });
  if (r.status !== 200) {
    console.error(`Banco de imagens respondeu ${r.status} para "${q}"`);
    return res.status(503).json({ erro: "A busca de imagens está com um problema agora. Tente de novo em instantes." });
  }
  res.setHeader("Cache-Control", "public, s-maxage=86400");   // a mesma busca fica guardada 24 h
  return res.status(200).json(r.corpo);
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
    if (req.query.loja === "imagens" && req.method === "GET") return await imagens(req, res, codigo);
    return res.status(404).json({ erro: "Não encontrado." });
  } catch (erro) {
    console.error("Erro na loja de plugins:", erro);
    if (!res.headersSent) return res.status(500).json({ erro: "A loja está com um problema agora." });
    res.end();
  }
}
