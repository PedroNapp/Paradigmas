/* Trilha e efeitos originais, sintetizados localmente. Sem áudio ou serviços externos. */
(() => {
  // Dentro da moldura (app.html) a música toca na moldura, que não recarrega ao trocar de tela.
  // A página só entrega a ela seus botões, gestos e eventos.
  try{if(window.parent!==window&&window.parent.FCAudio){window.parent.FCAudio.attach(window);return;}}catch{}
  // As escolhas do visitante valem para todas as telas; a sessão lembra se o som já foi liberado.
  const PREFS='fc-audio-prefs', SESSION='fc-audio-session';
  function read(storage,key){try{return JSON.parse(window[storage].getItem(key))||{};}catch{return {};}}
  function write(storage,key,value){try{window[storage].setItem(key,JSON.stringify(value));}catch{}}
  const prefs=read('localStorage',PREFS), session=read('sessionStorage',SESSION);
  // A trilha segue o relógio da sessão: ao trocar de tela ela continua do ponto em que estaria.
  if(!session.epoch){session.epoch=Date.now()/1000;write('sessionStorage',SESSION,session);}
  // Só a home tem o globo; nela o primeiro som continua esperando o toque no globo.
  let gated=false, view=window;
  let context, musicBus, musicOutput, effectsBus, master, timer=0, unlocked=false;
  let music=prefs.music!==false, effects=prefs.effects!==false, step=0, nextNote=0, revision=0, effectsRevision=0;
  let lifecycle=Promise.resolve(), pageInactive=false, startedSilent=false, pressStarted=false, pressTarget=null, buttonUnlockTried=false, pendingEffect=null;
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const voices=new Set();
  let musicButtons=[], effectsButtons=[];
  const beat=60/104, subdivision=beat/2;
  // Melodia original de oito compassos: sinos sobre D, G, Bm e A.
  const melody=[74,null,78,81,null,78,76,null,74,78,81,86,null,81,78,null,79,null,83,86,null,83,81,null,79,78,76,74,null,76,78,null,78,null,81,83,null,81,78,null,76,78,81,78,null,74,73,null,76,null,81,85,null,81,78,null,76,73,69,73,76,null,null,null];
  const chords=[[50,57,62,66],[43,55,59,62],[47,54,59,62],[45,57,61,64]];
  const hz=midi=>440*Math.pow(2,(midi-69)/12);
  function label(){
    for(const b of musicButtons){b.setAttribute('aria-pressed',String(music));b.textContent=music?'♫ Música ligada':'♫ Música desligada';}
    for(const b of effectsButtons){b.setAttribute('aria-pressed',String(effects));b.textContent=effects?'♪ Efeitos ligados':'♪ Efeitos desligados';}
  }
  // O estado vai para o body da tela visível (e da moldura) para o CSS reagir.
  function setState(){for(const w of new Set([window,view]))if(w.document.body)w.document.body.dataset.audio=context.state;}
  function init(){
    if(context)return;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){[...musicButtons,...effectsButtons].forEach(b=>{b.disabled=true;b.textContent='Áudio indisponível';});return;}
    context=new Audio();
    master=context.createGain();master.gain.value=.55;
    const compressor=context.createDynamicsCompressor();compressor.threshold.value=-20;compressor.ratio.value=3;compressor.connect(context.destination);master.connect(compressor);
    musicOutput=context.createGain();musicOutput.gain.value=music?1:0;musicOutput.connect(master);
    musicBus=context.createGain();musicBus.gain.value=.22;musicBus.connect(musicOutput);
    effectsBus=context.createGain();effectsBus.gain.value=.2;effectsBus.connect(master);
    // Uma cauda discreta de sino; feedback inferior a 1 não cresce com o tempo.
    const delay=context.createDelay(1);delay.delayTime.value=.24;
    const feedback=context.createGain();feedback.gain.value=.18;
    const lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=3500;
    musicBus.connect(delay);delay.connect(lowpass);lowpass.connect(feedback);feedback.connect(delay);
    const wet=context.createGain();wet.gain.value=.14;lowpass.connect(wet);wet.connect(musicOutput);
    // Um resume tardio (gesto seguinte, volta de interrupção no iOS) também retoma a trilha.
    context.onstatechange=()=>{
      setState();
      if(context.state!=='running'||!unlocked)return;
      if(!session.unlocked){session.unlocked=true;write('sessionStorage',SESSION,session);}
      buttonUnlockTried=false;flushEffect();reconcile();
    };
  }
  // Com a chave de silencioso do iPhone, o Web Audio fica mudo; 'playback' segue o volume de mídia.
  // Só a trilha pede esse modo: ele pausa outros apps, e efeitos curtos seguem a chave do aparelho.
  function playbackSession(active){try{if(navigator.audioSession)navigator.audioSession.type=active?'playback':'auto';}catch{}}
  // Um quadro silencioso tocado dentro do gesto destrava a saída nos iPhones mais antigos.
  function prime(){
    const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);
    source.connect(context.destination);source.onended=()=>source.disconnect();source.start(0);
  }
  // O webkitAudioContext antigo nem sempre devolve promessa; recusas viram estado, não exceção.
  function resume(){try{return Promise.resolve(context.resume()).catch(()=>{});}catch{return Promise.resolve();}}
  // O Safari só libera o som quando o contexto nasce ou é retomado no próprio gesto, sem esperar promessas.
  function wake(){
    init();if(!context)return;
    unlocked=true;
    if(wantsRunning()){
      playbackSession(music);
      if(context.state!=='running'){resume();prime();}
    }
    reconcile();
  }
  function track(source,bus,nodes=[]){
    const item={source,bus,cleanup:null};
    item.cleanup=()=>{
      if(!voices.delete(item))return;
      source.onended=null;
      for(const node of [source,...nodes]){try{node.disconnect();}catch{}}
    };
    voices.add(item);source.onended=item.cleanup;return item;
  }
  function tone(freq,at,duration,volume,bus=musicBus,type='sine'){
    if(!context)return;
    const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.value=freq;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.014);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    oscillator.connect(gain);gain.connect(bus);track(oscillator,bus,[gain]);oscillator.start(at);oscillator.stop(at+duration+.025);
  }
  function bell(note,at,volume=.3,bus=musicBus){const f=hz(note);tone(f,at,1.5,volume,bus);tone(f*2.01,at,.7,volume*.16,bus);tone(f*3.98,at,.33,volume*.055,bus);}
  function stopVoices(bus){for(const item of [...voices])if(!bus||item.bus===bus){try{item.source.stop();}catch{}item.cleanup();}}
  function stopMusic(){clearInterval(timer);timer=0;stopVoices(musicBus);}
  function wantsRunning(){return !pageInactive&&!document.hidden&&(music||effects);}
  function schedule(){
    if(!context||!music||!wantsRunning()||context.state!=='running')return;
    // Se a thread ficou bloqueada, não despeje todas as notas perdidas de uma vez.
    if(nextNote<context.currentTime-subdivision)nextNote=context.currentTime+.03;
    // Agenda um segundo à frente: a moldura divide a mesma linha de execução com a tela, e o
    // globo 3D começando a desenhar não pode deixar a música com buracos.
    while(nextNote<context.currentTime+1){
      const index=step%melody.length,note=melody[index];
      if(note!==null)bell(note,nextNote,step%4===0?.24:.17);
      if(step%16===0)for(const midi of chords[Math.floor(index/16)])tone(hz(midi),nextNote,beat*5,.09,musicBus,'triangle');
      nextNote+=subdivision;step++;
    }
    setState();
  }
  function reconcile(){
    const current=++revision;
    if(!context||!unlocked)return lifecycle;
    // A saída da música reúne sinal direto e eco: o mute cobre os dois.
    musicOutput.gain.value=music?1:0;
    effectsBus.gain.value=effects?.2:0;
    if(!wantsRunning()||!music)stopMusic();
    if(!wantsRunning()||!effects){effectsRevision++;stopVoices(effectsBus);}
    // Serializa transições para um suspend atrasado nunca vencer o último resume.
    lifecycle=lifecycle.catch(()=>{}).then(async()=>{
      if(current!==revision)return;
      if(wantsRunning()){
        playbackSession(music);
        // Fora de um gesto o resume pode ficar pendente (Chrome) ou ser recusado (Safari):
        // não prenda a fila; onstatechange retoma quando o próximo toque liberar o som.
        if(context.state!=='running')await Promise.race([resume(),wait(800)]);
      }else{
        // Música desligada pelo visitante devolve o áudio de outros apps.
        if(!music)playbackSession(false);
        // O Safari também pode segurar um suspend; nenhuma promessa do Web Audio trava a fila.
        if(context.state!=='suspended'&&context.state!=='closed')await Promise.race([Promise.resolve(context.suspend()).catch(()=>{}),wait(800)]);
      }
      if(current!==revision)return;
      if(wantsRunning()&&music&&context.state==='running'&&!timer){
        nextNote=context.currentTime+.06;step=Math.ceil((Date.now()/1000+.06-session.epoch)/subdivision);
        timer=setInterval(schedule,100);schedule();
      }
      setState();
    }).catch(error=>{
      if(current===revision){stopMusic();setState();}
      console.warn('Não foi possível atualizar a reprodução de áudio.',error);
    });
    return lifecycle;
  }
  function audible(){return unlocked&&context?.state==='running';}
  // Mouse e teclado ativam no início do gesto; o toque só conta no fim (pointerup, touchend, click).
  function activating(event){
    if(event.type==='keydown')return event.key==='Enter'||event.key===' ';
    if(event.type==='pointerdown')return event.pointerType==='mouse';
    if(event.type==='pointerup')return event.pointerType!=='mouse';
    return event.type==='touchend'||event.type==='click';
  }
  function gesture(event){
    if(!event.isTrusted)return;
    const control=event.target.closest?.('button')||event.target;
    if(event.type==='pointerdown'||event.type==='keydown'){startedSilent=!audible();pressStarted=true;pressTarget=control;}
    // Leitores de tela disparam só o clique, sem toque nem tecla antes.
    else if(event.type==='click'){if(!pressStarted||control!==pressTarget)startedSilent=!audible();pressStarted=false;}
    if(!activating(event)||audible())return;
    // Antes do primeiro som, só o globo e os controles de áudio ligam a trilha. Depois disso,
    // qualquer toque retoma o que o iOS suspendeu (aba em segundo plano, ligação, Siri).
    // Nas outras telas, qualquer toque inicia a trilha.
    if(!unlocked&&gated&&!event.target.closest?.('#globo,[data-entry-tap],[data-explore-globe],[data-replay-entry],[data-audio-music],[data-audio-effects]'))return;
    // Repete a cada gesto até o som sair: um toque recusado não encerra as tentativas.
    wake();
  }
  // Com o som ainda parado, o primeiro toque em "ligada" só libera o áudio, sem desligar a opção.
  // Se mesmo assim o som não sair, o toque seguinte volta a alternar normalmente.
  function onlyUnlock(enabled){
    const silent=startedSilent;startedSilent=false;
    if(!enabled||!silent||buttonUnlockTried)return false;
    // Se o som já saiu durante este mesmo toque, não há período de silêncio a marcar.
    if(!audible())buttonUnlockTried=true;
    return true;
  }
  // Religar acontece dentro do clique, ainda no gesto, para o Safari aceitar o resume.
  function savePrefs(){write('localStorage',PREFS,{music,effects});}
  function toggleMusic(){if(onlyUnlock(music)){reconcile();return;}music=!music;savePrefs();label();if(music)wake();else reconcile();}
  function toggleEffects(){if(onlyUnlock(effects)){reconcile();return;}effects=!effects;savePrefs();if(!effects)stopVoices(effectsBus);label();if(effects)wake();else reconcile();}
  function noise(duration,frequency,volume){
    if(!context)return;
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
    const source=context.createBufferSource();source.buffer=buffer;
    const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
    const gain=context.createGain(),now=context.currentTime;
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(effectsBus);track(source,effectsBus,[filter,gain]);source.start();source.stop(now+duration);
  }
  function canPlay(){return unlocked&&effects&&context?.state==='running'&&!pageInactive&&!document.hidden;}
  // O primeiro toque pode chegar antes de o iOS ligar o áudio. Guarde só o efeito mais recente
  // por um instante e descarte-o se a aba foi ocultada ou o visitante silenciou os efeitos.
  // Fica guardado até tocar ou expirar: a fila pode andar antes de o iOS ligar o som.
  function flushEffect(){
    const pending=pendingEffect;if(!pending)return;
    if(pending.revision!==effectsRevision||performance.now()-pending.at>=1500){pendingEffect=null;return;}
    if(canPlay()){pendingEffect=null;pending.play();}
  }
  function playEffect(play){
    if(!unlocked||!effects||!context||pageInactive||document.hidden)return;
    if(canPlay()){play();return;}
    pendingEffect={play,at:performance.now(),revision:effectsRevision};
    reconcile().then(flushEffect);
  }
  document.addEventListener('visibilitychange',reconcile);
  window.addEventListener('pagehide',()=>{pageInactive=true;reconcile();});
  window.addEventListener('pageshow',()=>{pageInactive=false;if(unlocked)reconcile();});
  // Liga uma tela (a própria página, ou a página dentro da moldura) ao motor de áudio.
  function attach(win){
    const doc=win.document;view=win;
    gated=!!doc.getElementById('globo');
    musicButtons=[...doc.querySelectorAll('[data-audio-music]')];
    effectsButtons=[...doc.querySelectorAll('[data-audio-effects]')];
    musicButtons.forEach(button=>button.addEventListener('click',toggleMusic));
    effectsButtons.forEach(button=>button.addEventListener('click',toggleEffects));
    for(const type of ['pointerdown','pointerup','touchend','click','keydown'])doc.addEventListener(type,gesture,{capture:true,passive:true});
    win.addEventListener('fc:entry-hit',e=>{
      playEffect(()=>{
        const count=e.detail.count,now=context.currentTime;
        if(count<5){noise(.1,2000+count*550,.38);bell(86+count*2,now,.18,effectsBus);}
        else {noise(.55,3100,.45);[91,95,98,103,107].forEach((n,i)=>bell(n,now+i*.035,.19,effectsBus));}
      });
    });
    win.addEventListener('fc:sleigh-fly',()=>{
      playEffect(()=>{
        const now=context.currentTime;noise(.9,800,.22);
        [86,90,93,98,93,90,86,93].forEach((n,i)=>bell(n,now+i*.16,.18,effectsBus));
      });
    });
    win.addEventListener('fc:shake',()=>playEffect(()=>{noise(.4,1900,.18);bell(93,context.currentTime,.12,effectsBus);}));
    win.addEventListener('fc:entry-complete',()=>playEffect(()=>{const now=context.currentTime;[74,78,81].forEach(n=>bell(n,now,.13,effectsBus));}));
    // Toque nos botões magnéticos (Entrar, Inscrições, Criar conta...): um brilho curto de sino.
    win.addEventListener('fc:ui-press',()=>playEffect(()=>{const now=context.currentTime;noise(.12,5200,.12);bell(93,now,.11,effectsBus);bell(98,now+.06,.09,effectsBus);}));
    label();if(context)setState();
  }
  window.FCAudio={attach};
  attach(window);
  // Som já liberado nesta sessão: a nova tela retoma sozinha quando o navegador permite
  // (Chrome, depois de um clique no mesmo site); senão, o primeiro toque em qualquer lugar.
  if(session.unlocked&&wantsRunning()){init();if(context){unlocked=true;reconcile();}}
})();
