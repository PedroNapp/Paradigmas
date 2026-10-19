/* Abertura acionada pelo visitante. Nenhuma navegação ou inscrição automática. */
(() => {
  const entry = document.querySelector('.fc-entry');
  const experience = document.querySelector('.fc-globe-experience');
  if (!entry || !experience) return;
  const dock = experience.parentElement;
  const mount = entry.querySelector('.fc-entry-mount');
  const view = experience.querySelector('#globo');
  const tap = entry.querySelector('[data-entry-tap]');
  const skip = entry.querySelector('[data-entry-skip]');
  const pause = entry.querySelector('[data-entry-pause]');
  const status = entry.querySelector('[data-entry-status]');
  const dots = [...entry.querySelectorAll('.fc-entry-progress > i')];
  const subtitle = entry.querySelector('[data-entry-instruction]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const originalLabel = view.getAttribute('aria-label');
  const originalRole = view.getAttribute('role');
  const originalDescription = view.getAttribute('aria-describedby');
  const viewNextSibling = view.nextSibling;
  const inertState = new Map();
  let count = 0, active = false, ready = view.dataset.renderer === 'webgl', finishing = false, unavailable = false;
  let landing = null;
  const landingDuration = 1500;
  function remember() { try {sessionStorage.setItem('flashclip-abertura-v1','vista');} catch {} }
  function seen() { try {return sessionStorage.getItem('flashclip-abertura-v1')==='vista';} catch {return false;} }
  function emit(name, detail) { window.dispatchEvent(new CustomEvent(name,{detail})); }
  function start() {
    if(active) return;
    active=true;finishing=false;count=0;entry.dataset.entryStep='0';
    entry.hidden=false;entry.classList.remove('fc-entry-leaving');entry.dataset.phase='idle';
    mount.appendChild(experience);
    document.body.classList.add('fc-entry-active');
    for(const el of document.querySelectorAll('body > .navbar, body > main, body > footer, body > .fc-skip')) {inertState.set(el,el.inert);el.inert=true;}
    view.setAttribute('role','button');view.setAttribute('aria-label','Globo de neve. Toque cinco vezes ou pressione Enter para abrir o evento.');
    view.setAttribute('aria-describedby','entrada-instrucao');
    dots.forEach(dot=>dot.classList.remove('is-lit'));
    tap.disabled=!ready&&!unavailable;
    tap.textContent=unavailable?'Entrar no evento':ready?'Toque para começar':'Preparando o globo…';
    subtitle.textContent='Toque no globo 5 vezes para abrir o evento.';
    status.textContent=unavailable?'A versão interativa não está disponível. Você pode entrar diretamente.':'';
    emit('fc:entry-start');
    if((ready||unavailable)&&!document.documentElement.classList.contains('fc-loading'))tap.focus({preventScroll:true});
    syncPause();
  }
  function hit() {
    if(!active||finishing||count===5||(!ready&&!unavailable))return;
    if(unavailable) {finish({immediate:true});return;}
    if(document.body.classList.contains('fc-paused')){
      status.textContent='O movimento está pausado. Retome para abrir o globo ou pule a abertura.';return;
    }
    count=Math.min(5,count+1);entry.dataset.entryStep=String(count);
    entry.dataset.phase=count===5?'opening':'cracking';
    dots.forEach((dot,i)=>dot.classList.toggle('is-lit',i<count));
    const messages=['','O Natal está despertando.','Mais um toque, mais uma surpresa.','Está quase. Continue.','Um último toque para abrir.','Papai Noel está chegando…'];
    status.textContent=messages[count];
    tap.textContent=count<5?`Toque outra vez · ${count}/5`:'Abrindo o evento…';
    if(count===5){tap.disabled=true;subtitle.textContent='Deixe a magia levar você até o FlashClip.';}
    emit('fc:entry-hit',{count});
  }
  function restoreAttribute(name, value) {
    if(value === null)view.removeAttribute(name);
    else view.setAttribute(name,value);
  }
  function finishLanding() {
    if(!active)return;
    const current=landing;
    landing=null;
    if(current) {
      cancelAnimationFrame(current.frame);
      clearTimeout(current.timeout);
      current.observer?.disconnect();
      if(current.placeholder.isConnected)current.placeholder.replaceWith(view);
      current.placeholder.remove();
      current.layer.remove();
    }
    if(experience.parentElement!==dock)dock.appendChild(experience);
    if(view.parentElement!==experience)experience.insertBefore(view,viewNextSibling?.parentNode===experience?viewNextSibling:null);
    experience.classList.remove('fc-globe-landing');
    entry.hidden=true;
    entry.classList.remove('fc-entry-leaving');
    document.body.classList.remove('fc-entry-active','fc-entry-landing');
    inertState.forEach((value,el)=>{el.inert=value;});inertState.clear();
    restoreAttribute('role',originalRole);restoreAttribute('aria-label',originalLabel);restoreAttribute('aria-describedby',originalDescription);
    active=false;finishing=false;
    // O renderizador só volta ao estado normal quando o mesmo nó chega à home.
    emit('fc:entry-reset');
    const heading=document.querySelector('#fc-title');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    else view.focus({preventScroll:true});
  }
  function rectOf(element) {
    const {left,top,width,height}=element.getBoundingClientRect();
    return {left,top,width,height};
  }
  function setRect(element, rect) {
    for(const key of ['left','top','width','height'])element.style[key]=`${rect[key]}px`;
  }
  function usableRect(rect) { return rect.width>0 && rect.height>0 && Object.values(rect).every(Number.isFinite); }
  function finish({immediate=false}={}) {
    if(!active)return;
    if(finishing){if(immediate)finishLanding();return;}
    finishing=true;remember();
    const from=rectOf(view);
    window.scrollTo({top:0,left:0,behavior:'instant'});
    if(immediate||reduced.matches||unavailable||document.hidden||document.body.classList.contains('fc-paused')||!usableRect(from)) {
      finishLanding();return;
    }
    try {
      const placeholder=document.createElement('div');
      placeholder.className='fc-globe-view fc-entry-placeholder';
      placeholder.setAttribute('aria-hidden','true');
      const layer=document.createElement('div');
      layer.className='fc-entry-flight';layer.inert=true;layer.setAttribute('aria-hidden','true');
      const start=performance.now();
      landing={layer,placeholder,from,to:from,start,duration:landingDuration,deadline:start+landingDuration,frame:0,timeout:0,observer:null,retarget:false};
      // Reservar o retângulo real da home permite mover o canvas sem duplicá-lo.
      experience.classList.add('fc-globe-landing');
      dock.appendChild(experience);
      view.before(placeholder);
      layer.appendChild(view);
      document.body.appendChild(layer);
      document.body.classList.add('fc-entry-landing');
      setRect(layer,from);
      const to=rectOf(placeholder);
      landing.to=to;
      if(!usableRect(to)){finishLanding();return;}
      if(typeof ResizeObserver==='function'){
        landing.observer=new ResizeObserver(()=>{if(landing)landing.retarget=true;});
        landing.observer.observe(placeholder);
        landing.observer.observe(document.documentElement);
      }
      entry.dataset.phase='landing';
      entry.classList.add('fc-entry-leaving');
      emit('fc:entry-land',{duration:landingDuration});
      // Um fallback cobre cancelamento do rAF ou uma mudança de contexto do navegador.
      landing.timeout=setTimeout(finishLanding,landingDuration+1200);
      const tick=(now)=>{
        const current=landing;
        if(!current)return;
        if(document.hidden||reduced.matches||unavailable||document.body.classList.contains('fc-paused')){finishLanding();return;}
        const destination=rectOf(current.placeholder);
        if(!usableRect(destination)){finishLanding();return;}
        if(current.retarget||['left','top','width','height'].some(key=>Math.abs(destination[key]-current.to[key])>.5)) {
          current.retarget=false;
          if(['left','top','width','height'].some(key=>Math.abs(destination[key]-current.to[key])>.5)){
            // Retomar da posição atual evita um salto se o celular mudar de orientação.
            current.from=rectOf(current.layer);current.to=destination;current.start=now;
            current.duration=Math.max(180,current.deadline-now);
            current.deadline=now+current.duration;
          }
        }
        const progress=Math.min(1,(now-current.start)/current.duration);
        const eased=progress<.5?4*progress*progress*progress:1-Math.pow(-2*progress+2,3)/2;
        const rect={};
        for(const key of ['left','top','width','height'])rect[key]=current.from[key]+(current.to[key]-current.from[key])*eased;
        setRect(current.layer,rect);
        if(progress>=1){finishLanding();return;}
        current.frame=requestAnimationFrame(tick);
      };
      landing.frame=requestAnimationFrame(tick);
    } catch(error) {
      console.warn('A chegada animada do globo foi concluída diretamente.',error);
      finishLanding();
    }
  }
  function syncPause() {
    const paused=document.body.classList.contains('fc-paused');
    pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Retomar movimento':'Pausar movimento';
    if(paused&&landing)finishLanding();
  }
  tap.addEventListener('click',hit);skip.addEventListener('click',()=>finish({immediate:true}));
  pause.addEventListener('click',()=>{experience.querySelector('[data-toggle-motion]').click();syncPause();});
  new MutationObserver(syncPause).observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('fc:globe-tap',hit);
  window.addEventListener('fc:globe-ready',()=>{
    ready=true;unavailable=false;
    if(active&&count===0){tap.disabled=false;tap.textContent='Toque para começar';status.textContent='';}
  });
  window.addEventListener('fc:globe-unavailable',()=>{
    unavailable=true;
    if(landing){finishLanding();return;}
    if(active){tap.disabled=false;tap.textContent='Entrar no evento';status.textContent='A versão interativa não está disponível. Você pode entrar diretamente.';}
  });
  window.addEventListener('fc:entry-complete',()=>finish());
  window.addEventListener('fc:load-bypass',()=>finish({immediate:true}));
  window.addEventListener('fc:preview-visible',()=>{if(active&&!finishing&&(ready||unavailable))tap.focus({preventScroll:true});});
  reduced.addEventListener('change',()=>{if(reduced.matches&&landing)finishLanding();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&landing)finishLanding();});
  document.querySelector('[data-replay-entry]')?.addEventListener('click',start);
  // Um link para um capítulo continua direto; a abertura é vista uma vez por aba.
  if(!window.FlashClipBoot?.bypassed&&!seen()&&!location.hash) start();
})();
