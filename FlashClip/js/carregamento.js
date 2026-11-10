/* Libera a prévia por prontidão real, sem porcentagem ou espera de animação. */
(() => {
  const boot=window.FlashClipBoot;
  const overlay=document.getElementById('fc-loading');
  if(!boot||!overlay)return;
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function sync(){
    if(boot.revealed)return;
    if(boot.error){
      overlay.dataset.state='error';overlay.setAttribute('aria-busy','false');
      overlay.querySelector('h1').textContent='Vamos tentar de novo?';
      overlay.querySelector('[data-loading-message]').textContent='Alguns recursos não carregaram. Tente novamente ou continue com uma versão leve do evento.';
      overlay.querySelector('[data-loading-actions]').hidden=false;
      overlay.querySelector('[data-loading-note]').textContent='Você pode continuar mesmo se o 3D não estiver disponível.';
      return;
    }
    // A página aparece assim que estilos, fontes e a imagem principal chegam. O globo, o trenó e
    // os cursos continuam carregando por trás: a abertura e a seção de cursos já sabem esperar.
    const pageReady=['images','styles','fonts'].every(name=>boot.states[name]==='ready');
    const stages={globe:boot.states.globe==='ready',sleigh:boot.states.sleigh==='ready',page:pageReady};
    for(const [name,ready] of Object.entries(stages))overlay.querySelector(`[data-loading-step="${name}"]`).dataset.ready=String(ready);
    const message=overlay.querySelector('[data-loading-message]');
    message.textContent=!pageReady?'Preparando a imagem e os detalhes do evento…':'Ajustando as luzes para receber você…';
    if(!pageReady)return;
    boot.revealed=true;clearTimeout(boot.timer);
    try{sessionStorage.setItem('flashclip-carregado-v1','1');}catch{}
    root.dataset.loadState='ready';overlay.setAttribute('aria-busy','false');
    root.classList.remove('fc-loading');overlay.classList.add('fc-loading-leaving');
    setTimeout(()=>{overlay.hidden=true;window.dispatchEvent(new CustomEvent('fc:preview-visible'));},reduced.matches?0:400);
  }
  function image(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      // A imagem precisa estar decodificada; navegadores sem decode usam o load.
      img.onload=()=>Promise.resolve().then(()=>typeof img.decode==='function'?img.decode():undefined).then(resolve,reject);
      img.onerror=reject;img.src=src;
    });
  }
  const images=['./imagens/logoFlash.webp'];
  if(root.dataset.heroImage)images.push(root.dataset.heroImage);
  Promise.all(images.map(image)).then(()=>boot.report('images'),()=>boot.fail('images'));
  const styles=[...document.querySelectorAll('link[rel="stylesheet"]')];
  Promise.all(styles.map(link=>link.sheet?Promise.resolve():new Promise((resolve,reject)=>{link.addEventListener('load',resolve,{once:true});link.addEventListener('error',reject,{once:true});}))).then(()=>boot.report('styles'),()=>boot.fail('styles'));
  Promise.resolve(document.fonts?.ready).then(()=>boot.report('fonts'),()=>boot.fail('fonts'));
  window.addEventListener('fc:load-state',sync);
  // Sem 3D a página segue normalmente: a abertura oferece "Entrar no evento".
  sync();
})();
