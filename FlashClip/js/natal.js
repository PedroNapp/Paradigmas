/* Interações da proposta visual. Não altera autenticação nem matrículas. */
(() => {
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.querySelector('.fc-ornament-stage');
  const scene = stage?.querySelector('.fc-scene');
  const hero = scene?.closest('.fc-hero');
  const navbar = document.querySelector('.navbar');
  const lightButton = document.querySelector('[data-toggle-lights]');
  const motionButton = document.querySelector('[data-toggle-motion]');
  let paused = false;
  let scrollFrame = 0;
  let pointerFrame = 0;
  let scrollExtent = 0;
  let heroTop = 0;
  let heroHeight = 0;
  let heroVisible = !('IntersectionObserver' in window);
  let lastProgress = '';
  let lastDrift = '';

  lightButton?.addEventListener('click', () => {
    const on = body.dataset.lights !== 'on';
    body.dataset.lights = on ? 'on' : 'off';
    lightButton.setAttribute('aria-pressed', String(on));
    lightButton.querySelector('span:last-child').textContent = on ? 'Apagar luzes' : 'Acender luzes';
  });

  motionButton?.addEventListener('click', () => {
    paused = !paused;
    body.classList.toggle('fc-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? 'Retomar movimento' : 'Pausar movimento';
    if (paused) resetPose();
    updateScroll();
  });

  function resetPose() {
    if (!stage) return;
    stage.style.setProperty('--fc-rx', '0deg');
    stage.style.setProperty('--fc-ry', '0deg');
  }

  stage?.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || reduced.matches || paused) return;
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    pointerFrame = requestAnimationFrame(() => {
      stage.style.setProperty('--fc-rx', (-y * 7).toFixed(2) + 'deg');
      stage.style.setProperty('--fc-ry', (x * 10).toFixed(2) + 'deg');
      pointerFrame = 0;
    });
  });
  stage?.addEventListener('pointerleave', () => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    resetPose();
  });

  function updateScroll() {
    scrollFrame = 0;
    const position = window.scrollY;
    const progress = (scrollExtent > 0 ? Math.max(0, Math.min(1, position / scrollExtent)) : 0).toFixed(4);
    if (navbar && progress !== lastProgress) {
      navbar.style.setProperty('--fc-progress', progress);
      lastProgress = progress;
    }
    // The WebGL globe handles its own pose. Only the original SVG ornament
    // needs this drift, and its geometry is measured when the layout changes.
    if (scene && heroVisible && heroHeight && !paused && !reduced.matches) {
      const drift = Math.max(0, Math.min(1, (position - heroTop) / heroHeight)).toFixed(4);
      if (drift !== lastDrift) {
        scene.style.setProperty('--fc-drift', drift);
        lastDrift = drift;
      }
    }
  }
  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }
  function measureScroll() {
    scrollExtent = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (hero) {
      const rect = hero.getBoundingClientRect();
      heroTop = rect.top + window.scrollY;
      heroHeight = rect.height;
    }
    scheduleScroll();
  }
  window.addEventListener('scroll', scheduleScroll, {passive: true});
  window.addEventListener('resize', measureScroll, {passive: true});
  if ('ResizeObserver' in window) {
    const layoutObserver = new ResizeObserver(measureScroll);
    layoutObserver.observe(body);
  }
  if (hero && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) scheduleScroll();
    });
    heroObserver.observe(hero);
  }
  window.addEventListener('load', measureScroll, {once: true});
  measureScroll();

  const revealElements = document.querySelectorAll('.fc-home .sobre-conteudo, .fc-home .card-motivo, .fc-home .titulo-cursos, .fc-closing > div');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('fc-visible');
          observer.unobserve(entry.target);
        }
      }
    }, {threshold: .08});
    body.classList.add('fc-motion-ready');
    revealElements.forEach(el => { el.classList.add('fc-reveal'); observer.observe(el); });
  }
  reduced.addEventListener('change', () => {
    resetPose();
    if (reduced.matches) body.classList.remove('fc-motion-ready');
    updateScroll();
  });
  document.addEventListener('visibilitychange', () => {
    body.classList.toggle('fc-hidden', document.hidden);
  });
})();
