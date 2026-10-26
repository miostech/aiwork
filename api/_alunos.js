// Contas dos alunos: cria o login no Supabase, gera a senha e libera o curso.
import crypto from "node:crypto";
import { banco, normalizarEmail } from "./_supabase.js";
import { cursoPorId, linkMiai } from "./_cursos.js";

// Senha no formato ABCD-1234: fácil de digitar, sem letras e números que se confundem (0/O, 1/I/L).
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function gerarSenha() {
  const bloco = () => Array.from({ length: 4 }, () => LETRAS[crypto.randomInt(LETRAS.length)]).join("");
  return bloco() + "-" + bloco();
}

// Usuário do login com esse e-mail que ainda não tem cadastro em "alunos" (caso raro).
async function acharUsuarioPorEmail(email) {
  const db = banco();
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw error;
    const usuario = data.users.find((u) => normalizarEmail(u.email) === email);
    if (usuario) return usuario.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

// Cria o aluno (ou só troca a senha, se ele já existir) e libera um curso.
// Devolve { alunoId, senha, bloqueado }.
export async function liberarAcesso({ nome, email, whatsapp, curso = "gratuito", origem = "validacao", referencia, leadId }) {
  const db = banco();
  const emailNorm = normalizarEmail(email);
  const senha = gerarSenha();

  const { data: existente, error: erroBusca } = await db
    .from("alunos").select("id, bloqueado").eq("email", emailNorm).maybeSingle();
  if (erroBusca) throw erroBusca;

  let alunoId = existente && existente.id;
  if (alunoId) {
    const { error } = await db.auth.admin.updateUserById(alunoId, { password: senha });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: emailNorm,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (error && error.code === "email_exists") {
      alunoId = await acharUsuarioPorEmail(emailNorm);
      if (!alunoId) throw error;
      const { error: erroSenha } = await db.auth.admin.updateUserById(alunoId, { password: senha });
      if (erroSenha) throw erroSenha;
    } else if (error) {
      throw error;
    } else {
      alunoId = data.user.id;
    }
  }

  // Nome e WhatsApp só entram quando vêm preenchidos, para não apagar o que o aluno já tem.
  // O nome de quem já é aluno não muda (na compra, o nome que chega é o do titular do cartão).
  const dadosAluno = { id: alunoId, email: emailNorm, senha_enviada_em: new Date().toISOString() };
  if (nome && !existente) dadosAluno.nome = nome;
  if (whatsapp) dadosAluno.whatsapp = whatsapp;
  const { error: erroAluno } = await db.from("alunos").upsert(dadosAluno, { onConflict: "id" });
  if (erroAluno) throw erroAluno;

  const { error: erroAcesso } = await db.from("acessos").upsert(
    { aluno_id: alunoId, curso, origem, referencia: referencia || null, revogado_em: null },
    { onConflict: "aluno_id,curso" }
  );
  if (erroAcesso) throw erroAcesso;

  if (leadId) await db.from("leads").update({ aluno_id: alunoId }).eq("id", leadId);

  return { alunoId, senha, bloqueado: !!(existente && existente.bloqueado) };
}

// Gera e grava uma senha nova para um aluno que já existe. Devolve a senha.
export async function trocarSenha(alunoId) {
  const db = banco();
  const senha = gerarSenha();
  const { error } = await db.auth.admin.updateUserById(alunoId, { password: senha });
  if (error) throw error;
  await db.from("alunos").update({ senha_enviada_em: new Date().toISOString() }).eq("id", alunoId);
  return senha;
}

// Endereço da área do curso com o domínio do site (nunca o .vercel.app).
// Com MIAI_URL definida, os cursos da MIAI abrem na conta da MIAI (ex.: miaiacademy.com/conta/ia-work);
// sem ela, o curso "pago" abre direto as aulas do IA Work na área do aluno da IA Academy.
export function linkCurso(curso = "gratuito") {
  const miai = cursoPorId(curso);
  if (miai && linkMiai()) return linkMiai("/conta/" + miai.endereco);
  const base = (process.env.SITE_URL || "https://www.iaacademy.bio").replace(/\/+$/, "");
  return base + "/curso.html" + (curso === "pago" ? "?curso=pago" : "");
}
