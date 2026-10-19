/* Botões magnéticos e transição entre telas, compartilhados por todas as páginas. */
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

  // Chrome, Edge e Safari 18+ fazem a transição pelo CSS (@view-transition). Nos outros,
  // a página sai com a mesma animação antes de navegar e a próxima entra pelo CSS.
  if ('onpagereveal' in window || calmo.matches) return;
  document.documentElement.classList.add('fc-sem-vt');
  document.addEventListener('click', evento => {
    const link = evento.target.closest?.('a[href]');
    if (!link || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const destino = new URL(link.href, location.href);
    if (destino.origin !== location.origin) return;
    // Âncoras na mesma página continuam com a rolagem suave de sempre.
    if (destino.pathname === location.pathname && destino.search === location.search && destino.hash) return;
    evento.preventDefault();
    document.documentElement.classList.add('fc-saindo');
    setTimeout(() => { location.href = destino.href; }, 280);
  });
  // Voltar pelo histórico (bfcache) não pode devolver a página ainda apagada.
  window.addEventListener('pageshow', () => document.documentElement.classList.remove('fc-saindo'));
})();
