// Conta as visitas das páginas para o painel (/painel). Uso em cada página:
//   <script src="/contador.js" data-pagina="inicio" defer></script>
// Cada navegador recebe um número anônimo (guardado no próprio navegador) para contar pessoas, não cliques.
// O país é descoberto no servidor; o site não guarda IP, nome nem e-mail de quem só visitou.
(function () {
  'use strict';
  try {
    const script = document.currentScript;
    const pagina = script && script.dataset.pagina;
    if (!pagina || navigator.webdriver) return;

    let visitante = null;
    try {
      visitante = localStorage.getItem('visitante');
      if (!visitante) {
        visitante = window.crypto && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });
        localStorage.setItem('visitante', visitante);
      }
    } catch (e) {}
    if (!visitante) return; // sem guardar o número não dá para contar pessoas únicas

    let referencia = '';
    try { referencia = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    if (referencia === location.hostname) referencia = '';

    fetch('/api/visita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pagina: pagina,
        visitante: visitante,
        utm_source: new URLSearchParams(location.search).get('utm_source') || '',
        referencia: referencia,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
})();
