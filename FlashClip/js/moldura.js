/* Abre cada tela dentro da moldura (app.html). A moldura não recarrega ao trocar de página,
   então a música de Natal continua tocando sem precisar de um novo toque. Carregado no topo do
   <head>, antes de tudo, para a troca acontecer antes de a página pesar. */
(() => {
  // Já está na moldura: avisa assim que a página abre, para a barra de endereço acompanhar
  // sem esperar as imagens. Embutido em outro site, segue normalmente.
  if (window.top !== window) {
    document.addEventListener('DOMContentLoaded', () => { try { window.parent.FCMoldura?.chegou(window); } catch {} });
    return;
  }
  // ?sem-moldura abre a página sozinha, útil para depurar.
  if (/[?&]sem-moldura\b/.test(location.search)) return;
  const raiz = new URL('..', document.currentScript.src).pathname;
  const caminho = location.pathname.startsWith(raiz) ? location.pathname.slice(raiz.length) : '';
  location.replace(`${raiz}app.html#${caminho || 'index.html'}${location.search}${location.hash}`);
})();
