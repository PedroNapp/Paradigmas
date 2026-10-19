/* Botões magnéticos, compartilhados por todas as páginas. */
(() => {
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  const botoes = [...document.querySelectorAll('.navbar .inscricoes, .menu-mobile .inscricoes, #botaoUsuario, #botaoUsuarioMobile, .botao-login, .botao-cadastro, .botao-confirmar')];
  const desvio = new WeakMap();
  let cursor = null, quadro = 0;

  for (const botao of botoes) {
    botao.classList.add('fc-magnetic');
    botao.addEventListener('pointerdown', evento => {
      if (botao.disabled) return;
      const caixa = botao.getBoundingClientRect();
      botao.style.setProperty('--fc-gx', `${evento.clientX - caixa.left}px`);
      botao.style.setProperty('--fc-gy', `${evento.clientY - caixa.top}px`);
      // Reinicia a animação do toque mesmo em cliques seguidos.
      botao.classList.remove('fc-press'); void botao.offsetWidth; botao.classList.add('fc-press');
      window.dispatchEvent(new CustomEvent('fc:ui-press'));
    });
    botao.addEventListener('animationend', () => botao.classList.remove('fc-press'));
  }

  // O campo magnético começa um pouco fora do botão e fica mais forte perto do centro.
  function atrair() {
    quadro = 0;
    for (const botao of botoes) {
      const [dx0, dy0] = desvio.get(botao) || [0, 0];
      const caixa = botao.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (cursor && caixa.width && !botao.disabled) {
        // Mede a partir da posição original, sem o deslocamento já aplicado.
        const cx = caixa.left - dx0 + caixa.width / 2, cy = caixa.top - dy0 + caixa.height / 2;
        const ox = cursor.x - cx, oy = cursor.y - cy;
        const alcance = Math.max(caixa.width, caixa.height) / 2 + 46;
        const distancia = Math.hypot(ox, oy);
        if (distancia < alcance) {
          const forca = 1 - distancia / alcance;
          dx = ox * .45 * forca; dy = oy * .55 * forca;
          botao.style.setProperty('--fc-gx', `${cursor.x - (caixa.left - dx0)}px`);
          botao.style.setProperty('--fc-gy', `${cursor.y - (caixa.top - dy0)}px`);
        }
      }
      botao.classList.toggle('fc-atraido', dx !== 0 || dy !== 0);
      desvio.set(botao, [dx, dy]);
      botao.style.setProperty('--fc-mx', `${dx.toFixed(2)}px`);
      botao.style.setProperty('--fc-my', `${dy.toFixed(2)}px`);
    }
  }
  function pedirQuadro() { if (!quadro) quadro = requestAnimationFrame(atrair); }
  document.addEventListener('pointermove', evento => {
    if (evento.pointerType !== 'mouse' || !mouse.matches || calmo.matches) return;
    cursor = { x: evento.clientX, y: evento.clientY }; pedirQuadro();
  }, { passive: true });
  document.addEventListener('mouseout', evento => { if (!evento.relatedTarget) { cursor = null; pedirQuadro(); } });
  window.addEventListener('blur', () => { cursor = null; pedirQuadro(); });
})();
