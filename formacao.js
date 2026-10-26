// Pagamento da Formação IA Academy, usado pela página inicial (inicio.html) e pelo cadastro (cadastro.html).
// ═══════════════════════════════════════════════════════════════
//  PREÇO, CUPOM E LINK DO PAGAMENTO — troque aqui (Formacao.urlPagamento monta o link com os dados da pessoa)
// ═══════════════════════════════════════════════════════════════
// O link do Stripe devolve a pessoa para cadastro.html?pagamento=... depois do pagamento, e o servidor libera as
// aulas (api/stripe-webhook.js). O id desse link também está em api/_cursos.js (CURSOS_IA_ACADEMY).
//
// Moeda: no Brasil a página mostra o preço em reais; fora, em dólar (precoFora), como o Stripe cobra. O país vem de
// /pais.js; enquanto ele não chega, a página mostra reais e depois chama de novo quem esperou Formacao.pais.
(function () {
  'use strict';

  const FORMACAO = {
    nome: 'Formação IA Academy',
    // US$ 98 no Stripe, com R$ 98 fixo para quem está no Brasil (nos outros países o Stripe converte para a moeda local)
    preco: 'R$ 98',
    precoFora: 'US$ 98',
    linkPagamento: 'https://buy.stripe.com/3cI00l9mu3CpcHd2f067S04',
    // Cupom da Black Friday: vai preenchido no pagamento até o fim do dia 30/11/2026 (horário de Brasília),
    // quando o código também expira no Stripe. Depois disso a página mostra só o preço cheio.
    cupom: { codigo: 'BLACKFRIDAY', preco: 'R$ 28', precoFora: 'US$ 28', ate: '2026-12-01T02:59:59Z', ateTexto: '30/11' },
  };

  const foraDoBrasil = () => !!(window.Pais && window.Pais.foraDoBrasil());

  function cupomAtivo() {
    return !!(FORMACAO.cupom && FORMACAO.cupom.codigo && Date.now() <= Date.parse(FORMACAO.cupom.ate));
  }

  function precoCheio() {
    return foraDoBrasil() ? FORMACAO.precoFora : FORMACAO.preco;
  }

  function precoCupom() {
    return foraDoBrasil() ? FORMACAO.cupom.precoFora : FORMACAO.cupom.preco;
  }

  function precoAtual() {
    return cupomAtivo() ? precoCupom() : precoCheio();
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

  const pais = window.Pais ? window.Pais.pronto : Promise.resolve('');

  window.Formacao = Object.assign({}, FORMACAO, { cupomAtivo, precoCheio, precoCupom, precoAtual, urlPagamento, pais });
})();
