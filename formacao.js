// Pagamento da Formação IA Academy, usado pela página inicial (inicio.html) e pelo cadastro (cadastro.html).
// ═══════════════════════════════════════════════════════════════
//  PREÇO, CUPOM E LINK DO PAGAMENTO — troque aqui (Formacao.urlPagamento monta o link com os dados da pessoa)
// ═══════════════════════════════════════════════════════════════
// O link do Stripe devolve a pessoa para cadastro.html?pagamento=... depois do pagamento, e o servidor libera as
// aulas (api/stripe-webhook.js). O id desse link também está em api/_cursos.js (CURSOS_IA_ACADEMY).
(function () {
  'use strict';

  const FORMACAO = {
    nome: 'Formação IA Academy',
    preco: 'R$ 98',
    linkPagamento: 'https://buy.stripe.com/dRm00l0PYfl7cHd9Hs67S01',
    // Cupom da Black Friday: vai preenchido no pagamento até o fim do dia 30/11/2026 (horário de Brasília),
    // quando o código também expira no Stripe. Depois disso a página mostra só o preço cheio.
    cupom: { codigo: 'BLACKFRIDAY', preco: 'R$ 28', ate: '2026-12-01T02:59:59Z', ateTexto: '30/11' },
  };

  function cupomAtivo() {
    return !!(FORMACAO.cupom && FORMACAO.cupom.codigo && Date.now() <= Date.parse(FORMACAO.cupom.ate));
  }

  function precoAtual() {
    return cupomAtivo() ? FORMACAO.cupom.preco : FORMACAO.preco;
  }

  // Link do Stripe com o e-mail do formulário, o cupom (enquanto valer) e o id do cadastro (lead) já preenchidos
  function urlPagamento(dados) {
    dados = dados || {};
    const url = new URL(FORMACAO.linkPagamento);
    if (dados.email) url.searchParams.set('prefilled_email', dados.email);
    if (cupomAtivo()) url.searchParams.set('prefilled_promo_code', FORMACAO.cupom.codigo);
    if (/^[0-9a-f-]{36}$/i.test(dados.leadId || '')) url.searchParams.set('client_reference_id', dados.leadId);
    url.searchParams.set('locale', 'pt-BR');
    return url.toString();
  }

  window.Formacao = Object.assign({}, FORMACAO, { cupomAtivo, precoAtual, urlPagamento });
})();
