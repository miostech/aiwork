// País de quem está vendo a página, para mostrar o preço na moeda em que o Stripe vai cobrar: reais no Brasil,
// dólar nos outros países. Usado por /formacao.js e /miai/miai.js; carregue este arquivo antes deles.
//
// Pais.foraDoBrasil() é falso até a resposta chegar e quando não dá para saber o país: a página começa em reais e
// troca para dólar quando Pais.pronto termina. O país fica guardado na aba, para não perguntar de novo a cada página.
(function () {
  'use strict';

  let pais = '';
  try { pais = sessionStorage.getItem('pais') || ''; } catch (e) { /* navegador sem sessionStorage */ }

  const pronto = pais
    ? Promise.resolve(pais)
    : fetch('/api/config-publica?pais', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => {
        pais = /^[A-Z]{2}$/.test(d.pais || '') ? d.pais : '';
        if (pais) { try { sessionStorage.setItem('pais', pais); } catch (e) { /* sem sessionStorage */ } }
        return pais;
      })
      .catch(() => '');

  window.Pais = {
    pronto,
    foraDoBrasil: () => !!pais && pais !== 'BR',
  };
})();
