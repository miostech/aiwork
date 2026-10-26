// Catálogo e login da MIAI Academy, usados pelas páginas da pasta miai/.
// ═══════════════════════════════════════════════════════════════
//  CATÁLOGO — um bloco por curso. As aulas e o link de pagamento usado pelo servidor ficam em api/_cursos.js
//  (o "endereco" precisa ser o mesmo nos dois lugares).
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const CATALOGO = [
    {
      endereco: 'ia-work',                 // miaiacademy.com/ia-work (vendas) e /conta/ia-work (aulas)
      nome: 'IA Work',
      chamada: 'Use o que você já sabe para treinar IA e receber acima de US$ 20 por hora.',
      etiquetas: ['Para profissionais', 'Com a Camila', '6 módulos'],
      preco: 'R$ 497',
      parcelas: '',                        // ex.: 'ou 12x de R$ 49,70 no cartão' (vazio = não mostra)
      linkPagamento: 'https://buy.stripe.com/9B65kFeGO0qd8qXdXI67S00',
      // Cupom de quem veio do treinamento gratuito da IA Academy (/ia-work?origem=curso)
      cupom: { codigo: 'ACADEMY', preco: 'R$ 197' },
    },
  ];

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const curso = (endereco) => CATALOGO.find((c) => c.endereco === endereco) || null;

  // ── Linha de um curso na lista (catálogo e conta), como a lista de serviços da Mios Tech
  // opcoes: { acao: 'Conhecer o curso', link, progresso: { concluidas, total } }
  function linhaCurso(c, numero, opcoes) {
    opcoes = opcoes || {};
    const li = document.createElement('li');
    li.className = 'curso';
    li.innerHTML =
      '<span class="curso__numero"></span>'
      + '<h3 class="curso__nome"><a></a></h3>'
      + '<div class="curso__texto"><p></p><p class="curso__meta"></p>'
      + '  <div class="progresso" hidden><div class="progresso__barra"><span></span></div><p></p></div></div>'
      + '<div class="curso__fim"><p class="curso__preco"></p><span class="curso__acao"><span></span><span class="seta" aria-hidden="true">→</span></span></div>';

    $('.curso__numero', li).textContent = String(numero).padStart(2, '0');
    const nome = $('.curso__nome a', li);
    nome.textContent = c.nome;
    nome.href = opcoes.link || '/' + c.endereco;
    $('.curso__texto p', li).textContent = c.chamada;
    const meta = $('.curso__meta', li);
    (c.etiquetas || []).forEach((texto) => {
      const etiqueta = document.createElement('span');
      etiqueta.textContent = texto;
      meta.appendChild(etiqueta);
    });

    const preco = $('.curso__preco', li);
    if (opcoes.progresso) {
      const { concluidas, total } = opcoes.progresso;
      const pct = total ? Math.round((concluidas / total) * 100) : 0;
      $('.progresso', li).hidden = false;
      $('.progresso__barra span', li).style.width = pct + '%';
      $('.progresso p', li).innerHTML = '<strong>' + concluidas + ' de ' + total + '</strong> aulas concluídas';
      preco.remove();
    } else {
      preco.textContent = c.preco;
      if (c.parcelas) {
        const parcelas = document.createElement('small');
        parcelas.textContent = c.parcelas;
        preco.appendChild(parcelas);
      }
    }
    $('.curso__acao span', li).textContent = opcoes.acao || 'Conhecer o curso';
    return li;
  }

  // ── Login (Supabase): o mesmo login da IA Academy. A sessão fica guardada neste aparelho e se renova sozinha.
  let sb = null;

  async function supabase() {
    if (sb) return sb;
    const resposta = await fetch('/api/config-publica');
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
    const config = await resposta.json();
    sb = window.supabase.createClient(config.supabaseUrl, config.supabaseChave);
    return sb;
  }

  // Tem uma sessão guardada neste aparelho? (sem carregar o Supabase: usado no topo das páginas públicas)
  function temSessaoGuardada() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (/^sb-.+-auth-token$/.test(chave)) return true;
      }
    } catch (e) {}
    return false;
  }

  // E-mail de quem está logado neste aparelho, para já preencher no pagamento (vazio se ninguém entrou)
  function emailGuardado() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (!/^sb-.+-auth-token$/.test(chave)) continue;
        const sessao = JSON.parse(localStorage.getItem(chave));
        return (sessao && sessao.user && sessao.user.email) || '';
      }
    } catch (e) {}
    return '';
  }

  // Chama uma função do servidor com o login. Se o servidor recusar o acesso (ex.: relógio do aparelho
  // adiantado), renova a sessão uma vez antes de desistir. Devolve a resposta, ou null quando é preciso entrar de novo.
  async function chamar(endereco, opcoes) {
    const cliente = await supabase();
    const { data } = await cliente.auth.getSession();
    if (!data.session) return null;
    const pedir = (token) => fetch(endereco, Object.assign({}, opcoes, {
      headers: Object.assign({}, (opcoes && opcoes.headers) || {}, { Authorization: 'Bearer ' + token }),
    }));
    let resposta = await pedir(data.session.access_token);
    if (resposta.status === 401) {
      const renovada = await cliente.auth.refreshSession().catch(() => ({ data: null }));
      if (renovada.data && renovada.data.session) resposta = await pedir(renovada.data.session.access_token);
    }
    if (resposta.status === 401) {
      await cliente.auth.signOut();
      return null;
    }
    return resposta;
  }

  // Devolve '' quando entrou, ou a mensagem de erro para mostrar
  async function entrar(email, senha) {
    const cliente = await supabase();
    const { error } = await cliente.auth.signInWithPassword({ email: email, password: senha });
    if (!error) return '';
    return error.status === 400
      ? 'E-mail ou senha incorretos. Confira os dados do e-mail que você recebeu.'
      : 'Não conseguimos entrar agora. Tente de novo em instantes.';
  }

  async function sair() {
    try { await (await supabase()).auth.signOut(); } catch (e) {}
  }

  function pedirNovaSenha(email) {
    return fetch('/api/nova-senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, site: 'miai' }),
    });
  }

  // Formulário de entrar + "Esqueci minha senha" (mesmos ids na conta). aoEntrar é chamado depois do login.
  function montarLogin(aoEntrar) {
    $('#form-entrar').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = $('#f-email').value.trim().toLowerCase();
      const senha = $('#f-senha').value.trim().toUpperCase();
      const erro = $('#erro-entrar');
      erro.textContent = '';
      if (!email || !senha) { erro.textContent = 'Digite o seu e-mail e a sua senha.'; return; }
      const botao = $('#btn-entrar');
      botao.disabled = true;
      botao.textContent = 'Entrando…';
      try {
        const problema = await entrar(email, senha);
        if (problema) { erro.textContent = problema; return; }
        $('#f-senha').value = '';
        await aoEntrar();
      } catch (e) {
        erro.textContent = 'Não conseguimos entrar agora. Confira sua internet e tente de novo.';
      } finally {
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    });

    $('#btn-esqueci').addEventListener('click', () => {
      $('#form-esqueci').hidden = false;
      $('#btn-esqueci').hidden = true;
      if (!$('#f-email-esqueci').value) $('#f-email-esqueci').value = $('#f-email').value;
      $('#f-email-esqueci').focus();
    });

    $('#form-esqueci').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const email = $('#f-email-esqueci').value.trim().toLowerCase();
      $('#ok-esqueci').textContent = '';
      $('#erro-esqueci').textContent = '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $('#erro-esqueci').textContent = 'Digite um e-mail válido.'; return; }
      const botao = $('#btn-enviar-senha');
      botao.disabled = true;
      try {
        await pedirNovaSenha(email);
        $('#ok-esqueci').textContent = 'Se esse e-mail tiver cadastro, enviamos uma senha nova. Confira também o spam e a lixeira.';
        $('#f-email').value = email;
      } catch (e) {
        $('#erro-esqueci').textContent = 'Não conseguimos enviar agora. Tente de novo em instantes.';
      } finally {
        botao.disabled = false;
      }
    });
  }

  // Topo das páginas públicas: "Minha conta" no lugar de "Entrar" para quem já entrou neste aparelho
  function ajustarTopo() {
    const entrar = document.getElementById('topo-entrar');
    if (entrar && temSessaoGuardada()) entrar.textContent = 'Minha conta';
    document.querySelectorAll('[data-ano]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  window.Miai = {
    catalogo: CATALOGO, curso, linhaCurso,
    supabase, chamar, sair, montarLogin, emailGuardado, ajustarTopo,
  };
})();
