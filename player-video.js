// Player dos vídeos .mp4 do site (hospedados no Azure), usado na página inicial e no cadastro.
// Começa sem som com o convite "Toque para ouvir" (no toque, volta ao começo com som). Não tem barra
// para adiantar: tocar no vídeo só pausa e continua. Só começa a tocar quando aparece na tela.
//
// Uso: PlayerVideo.montar(caixa, { src, capa, titulo, segundos, aoChegar, aoTerminar, aoErro })
//   segundos + aoChegar: chamado uma vez quando o vídeo chega nesse tempo assistindo com som
//   A cor dos botões vem da variável CSS --player-cor da página.
(function () {
  'use strict';

  const CSS = `
.player { position: relative; width: 100%; aspect-ratio: 9 / 16; background: #0C0B0A; cursor: pointer; overflow: hidden; }
.player video { display: block; width: 100%; height: 100%; object-fit: cover; }
.player__som {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: grid; justify-items: center; gap: 10px; width: max-content; max-width: 86%;
  padding: 18px 22px; border: 0; border-radius: 20px; cursor: pointer;
  background: rgba(12, 11, 10, 0.72); color: #FFFFFF; font: inherit; text-align: center;
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
}
.player__som strong { font-size: 1.05rem; font-weight: 800; }
.player__som span { font-size: 0.85rem; opacity: 0.85; }
.player__som-icone {
  width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center;
  background: var(--player-cor, #B04668); box-shadow: 0 10px 26px -8px rgba(0, 0, 0, 0.55);
  animation: player-pulsar 1.6s ease-in-out infinite;
}
.player__pausa {
  position: absolute; inset: 0; display: grid; place-items: center; border: 0; cursor: pointer;
  background: rgba(12, 11, 10, 0.35); color: #FFFFFF;
}
.player__pausa span {
  width: 74px; height: 74px; border-radius: 50%; display: grid; place-items: center;
  background: var(--player-cor, #B04668); box-shadow: 0 12px 28px -8px rgba(0, 0, 0, 0.55);
}
.player__barra { position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: rgba(255, 255, 255, 0.25); pointer-events: none; }
.player__barra i { display: block; height: 100%; width: 0; background: var(--player-cor, #B04668); transition: width 0.25s linear; }
.player [hidden] { display: none !important; }
@keyframes player-pulsar { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) { .player__som-icone { animation: none; } }`;

  const ICONE_SOM = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
  const ICONE_PLAY = '<svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';

  function estilo() {
    if (document.getElementById('player-video-css')) return;
    const s = document.createElement('style');
    s.id = 'player-video-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function montar(lugar, op) {
    estilo();
    op = op || {};
    const caixa = document.createElement('div');
    caixa.className = 'player';
    caixa.innerHTML =
      '<video playsinline muted preload="metadata"></video>'
      + '<button class="player__som" type="button"><span class="player__som-icone" aria-hidden="true">' + ICONE_SOM
      + '</span><strong>Seu vídeo já começou</strong><span>Toque para ouvir</span></button>'
      + '<button class="player__pausa" type="button" aria-label="Continuar o vídeo" hidden><span aria-hidden="true">' + ICONE_PLAY + '</span></button>'
      + '<div class="player__barra" aria-hidden="true"><i></i></div>';
    const video = caixa.querySelector('video');
    const som = caixa.querySelector('.player__som');
    const pausa = caixa.querySelector('.player__pausa');
    const barra = caixa.querySelector('.player__barra i');
    video.src = op.src;
    if (op.capa) video.poster = op.capa;
    if (op.titulo) video.setAttribute('aria-label', op.titulo);
    lugar.replaceChildren(caixa);

    let chegou = false;
    const tocar = () => video.play().catch(() => { pausa.hidden = false; som.hidden = true; });

    // Primeiro toque: volta ao começo com som
    function ativarSom() {
      som.hidden = true;
      pausa.hidden = true;
      video.muted = false;
      video.currentTime = 0;
      tocar();
    }
    som.addEventListener('click', (e) => { e.stopPropagation(); ativarSom(); });
    pausa.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.muted) { ativarSom(); return; }
      pausa.hidden = true;
      tocar();
    });
    video.addEventListener('click', () => {
      if (video.muted) { ativarSom(); return; }
      if (video.paused) { pausa.hidden = true; tocar(); } else video.pause();
    });
    video.addEventListener('pause', () => { if (!video.muted && !video.ended) pausa.hidden = false; });
    video.addEventListener('play', () => { pausa.hidden = true; });
    video.addEventListener('timeupdate', () => {
      if (video.duration) barra.style.width = (video.currentTime / video.duration) * 100 + '%';
      if (!chegou && op.aoChegar && !video.muted && video.currentTime >= (op.segundos || 0)) {
        chegou = true;
        op.aoChegar();
      }
    });
    video.addEventListener('ended', () => { if (op.aoTerminar) op.aoTerminar(); });
    video.addEventListener('error', () => { if (op.aoErro) op.aoErro(); });

    // Só toca (sem som) quando aparece na tela; sem som, pausa quando sai dela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((itens) => {
        itens.forEach((item) => {
          if (item.isIntersecting) {
            if (video.paused && video.muted) { video.preload = 'auto'; tocar(); }
          } else if (video.muted && !video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.5 }).observe(caixa);
    } else {
      video.preload = 'auto';
      tocar();
    }
    return video;
  }

  window.PlayerVideo = { montar: montar };
})();
