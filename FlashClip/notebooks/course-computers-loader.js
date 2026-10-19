(() => {
  const list = document.getElementById('listaCursos');
  if (!list) return;

  const moduleURL = new URL('./course-computers.js?v=natal-3d-1', document.currentScript.src);
  let unavailable = false;
  let observer;
  const timer = setTimeout(() => fallback(new Error('Tempo limite ao iniciar os notebooks 3D.')), 20000);

  function showFallbacks() {
    for (const element of list.querySelectorAll('.fc-course-computer[data-renderer="pending"]')) {
      element.dataset.renderer = 'fallback';
      element.querySelector('summary')?.setAttribute('aria-busy', 'false');
    }
  }

  function fallback(error) {
    if (unavailable) return;
    unavailable = true;
    clearTimeout(timer);
    // A delayed module checks this flag before creating any renderer.
    list.dataset.computerUnavailable = 'true';
    showFallbacks();
    observer = new MutationObserver(showFallbacks);
    observer.observe(list, { childList: true, subtree: true });
    console.warn('Os notebooks continuam disponíveis na versão leve.', error);
  }

  import(moduleURL.href).then(() => {
    if (!unavailable) clearTimeout(timer);
  }).catch(fallback);

  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    clearTimeout(timer);
    observer?.disconnect();
  });
})();
