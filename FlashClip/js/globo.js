import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SnowPhysics } from './snow-physics.js';
import { ShakeGesture } from './shake-gesture.js';
import { GlobeOpening } from './abertura-3d.js?v=loading-1';

const view = document.querySelector('.fc-globe-view');
if (view&&!window.FlashClipBoot?.bypassed) initGlobe().catch(fallback);

function fallback(error) {
  console.warn('A cena 3D está indisponível; apresentação estática mantida.', error);
  view.dataset.renderer = 'fallback';
  window.dispatchEvent(new CustomEvent('fc:globe-unavailable'));
  view.querySelector('.fc-globe-loader').textContent = 'A visualização 3D não está disponível neste navegador.';
  document.querySelector('.fc-globe-hint').textContent = 'Você pode continuar explorando o evento e os cursos normalmente.';
  document.querySelector('[data-explore-globe]').disabled = true;
}

async function initGlobe() {
  const root = document.querySelector('.fc-globe-experience');
  const dock = document.querySelector('.fc-globe-dock');
  const hero = document.querySelector('.fc-hero');
  const dialog = document.querySelector('.fc-globe-dialog');
  const closeButton = root.querySelector('[data-close-globe]');
  const expandButton = root.querySelector('[data-explore-globe]');
  const status = root.querySelector('.fc-globe-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'});
  function cancelled(){if(!window.FlashClipBoot?.bypassed)return false;renderer.dispose();renderer.domElement.remove();return true;}
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Falling flakes do not cast shadows; reuse the map until the model moves.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  view.querySelector('.fc-globe-canvas').appendChild(renderer.domElement);
  const envScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, .04);
  scene.environment = env.texture;
  scene.environmentIntensity = .5;
  envScene.dispose(); pmrem.dispose();

  const ambient = new THREE.HemisphereLight(0xe2e7ee, 0x0d1217, .9);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffe2ba, 2.2);
  key.position.set(-3,7,5); key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera, {left:-3,right:3,top:6,bottom:-2,near:.1,far:20});
  key.shadow.bias=-.001;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9c6d6, 1.7);
  rim.position.set(4,4,-3); scene.add(rim);
  const warm = new THREE.PointLight(0xffbd57, 6, 8, 2);
  warm.position.set(-.7,1.8,1); scene.add(warm);

  const pivot = new THREE.Group(); pivot.position.y=1.95;
  const world = new THREE.Group(); world.position.y=-1.95;
  pivot.add(world); scene.add(pivot);
  const model = await Promise.race([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('./models/flashclip-natal.glb'),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite de carregamento do modelo.')), 20000))
  ]);
  if(cancelled())return;
  const emissive = new Map();
  model.scene.traverse(o => {
    // O arquivo traz luzes de apresentação do Blender; a luz interativa é local.
    if (o.isLight) o.intensity = 0;
    if (!o.isMesh) return;
    o.castShadow=true; o.receiveShadow=true;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats) {
      if(m.emissive && m.emissive.getHex()>0 && !emissive.has(m)) emissive.set(m, { intensity: m.emissiveIntensity || 1, color: m.color.clone() });
    }
  });
  world.add(model.scene);

  // Logo oficial preservada como textura; a placa acompanha a base ao girar.
  const logo = await new THREE.TextureLoader().loadAsync('./imagens/logoFlash.webp');
  if(cancelled())return;
  logo.colorSpace=THREE.SRGBColorSpace;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.13,.39),new THREE.MeshBasicMaterial({map:logo,transparent:true,depthWrite:false}));
  plate.position.set(0,.372,1.49); world.add(plate);
  window.FlashClipBoot?.report('globe');

  // Vidro: fresnel + reflexos de estúdio, transparente para preservar a neve.
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.95,96,64,0,Math.PI*2,0,Math.acos((.79-1.95)/1.95)),new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, side:THREE.FrontSide,
    uniforms:{lightOn:{value:1},fade:{value:1}},
    vertexShader:`varying vec3 vNormal; varying vec3 vWorld; void main(){vec4 wp=modelMatrix*vec4(position,1.); vWorld=wp.xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp;}`,
    fragmentShader:`uniform float lightOn; uniform float fade; varying vec3 vNormal; varying vec3 vWorld; void main(){vec3 V=normalize(cameraPosition-vWorld); vec3 N=normalize(vNormal); float facing=max(dot(V,N),0.); float rim=pow(1.-facing,3.8); vec3 R=reflect(-V,N); float soft=pow(max(dot(R,normalize(vec3(-.7,.9,1.3))),0.),40.); float strip=pow(max(dot(R,normalize(vec3(.85,.25,.9))),0.),100.); float top=pow(max(dot(R,normalize(vec3(-.35,1.4,.35))),0.),70.); vec3 c=mix(vec3(.48,.77,.70),vec3(.99,.91,.72),soft+top); float a=.018+rim*.47+soft*.27+strip*.52+top*.31; gl_FragColor=vec4(c,a*(.8+.2*lightOn)*fade);}`
  }));
  glass.position.y=1.95; glass.renderOrder=8; world.add(glass);

  const snow = new SnowPhysics(matchMedia('(max-width:700px)').matches ? 600 : 1000);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snow.positions,3));
  const snowMat = new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    uniforms:{uPixel:{value:renderer.getPixelRatio()}},
    vertexShader:`uniform float uPixel; varying float vDepth; void main(){vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(19.*uPixel/-mv.z,1.3,5.); vDepth=clamp(1.-(-mv.z-7.)*.055,.5,1.);}`,
    fragmentShader:`varying float vDepth; void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard; float alpha=smoothstep(.5,.15,d)*vDepth; gl_FragColor=vec4(.96,.97,1.,alpha*.85);}`
  });
  const flakes = new THREE.Points(snowGeo,snowMat); flakes.renderOrder=5; world.add(flakes);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({opacity:.24}));
  shadow.rotation.x=-Math.PI/2; shadow.position.y=-.02; shadow.receiveShadow=true; scene.add(shadow);

  let frame=0, previous=0, visible=true, disposed=false, paused=document.body.classList.contains('fc-paused');
  let targetYaw=-.16, targetPitch=0, yaw=targetYaw, pitch=0, kick=0, kickTime=0, activity=0;
  let drag=null, currentLight=true, accumulator=0, lastSnowReport='';
  let scrollDepth=0, dolly=8.4, scrolling=false, scrollTimer=0;
  let heroTop=0, heroHeight=1, sizeDirty=true;
  let shadowYaw=NaN, shadowPitch=NaN, shadowRoll=NaN, shadowX=NaN;
  const homeYaw=-.16;
  const opening=new GlobeOpening({scene,world,pivot,glass,view,onChange:schedule,onComplete:()=>window.dispatchEvent(new CustomEvent('fc:entry-complete'))});
  function startEntry(){opening.start();targetYaw=0;targetPitch=0;yaw=0;pitch=0;kick=0;schedule();}
  window.addEventListener('fc:entry-start',startEntry);
  window.addEventListener('fc:entry-hit',e=>{
    if(!opening.active||paused)return;
    opening.hit(e.detail.count,reduced.matches);
    if(canMove()){snow.shake(.6);kick=.04+e.detail.count*.012;kickTime=0;}
    schedule();
  });
  window.addEventListener('fc:entry-reset',()=>{opening.reset();targetYaw=homeYaw;targetPitch=0;yaw=homeYaw;pitch=0;kick=0;previous=0;resize();schedule();});
  window.addEventListener('fc:entry-land',e=>{opening.land(e.detail.duration);targetYaw=homeYaw;targetPitch=0;kick=0;scrollDepth=0;visible=true;resize();schedule();});
  if(document.body.classList.contains('fc-entry-active'))startEntry();
  function report(text) { if(status.textContent!==text) status.textContent=text; }
  function canMove() { return !paused&&!reduced.matches; }
  function syncData() {
    view.dataset.yaw=yaw.toFixed(3); view.dataset.pitch=pitch.toFixed(3);
    view.dataset.snow=String(snow.active); view.dataset.motion=paused?'paused':reduced.matches?'reduced':'active';
  }
  function schedule() {
    if(frame||disposed||document.hidden||!visible||scrolling) return;
    frame=requestAnimationFrame(render);
  }
  let lastWidth=0,lastHeight=0;
  function resize() { sizeDirty=true; schedule(); }
  function measureHero() {
    if (!hero) return;
    const rect=hero.getBoundingClientRect();
    heroTop=rect.top+window.scrollY;heroHeight=Math.max(1,rect.height);
  }
  function syncRendererSize() {
    if(!sizeDirty)return;
    sizeDirty=false;
    const {width,height}=view.getBoundingClientRect();
    if(!width||!height||(width===lastWidth&&height===lastHeight)) return;
    lastWidth=width;lastHeight=height;
    renderer.setSize(width,height,false); camera.aspect=width/height;
    camera.fov=width/height<.85 ? 39 : 34;
    camera.updateProjectionMatrix();
  }
  function applyLight() {
    currentLight=document.body.dataset.lights!=='off';
    warm.intensity=currentLight?6:0;
    emissive.forEach((original,material)=>{
      material.emissiveIntensity=currentLight?original.intensity:0;
      material.color.copy(original.color).multiplyScalar(currentLight?1:.16);
    });
    glass.material.uniforms.lightOn.value=currentLight?1:0;
    schedule();
  }
  function shake(fromGesture=false) {
    if(paused) { report('O movimento está pausado. Use “Retomar movimento” para fazer nevar.'); return; }
    if(reduced.matches) {
      snow.scatter(); snowGeo.attributes.position.needsUpdate=true;
      report('Neve espalhada. Exibição estática com movimento reduzido.');
      syncData(); schedule(); return;
    }
    window.dispatchEvent(new CustomEvent('fc:shake'));
    snow.shake(fromGesture ? .8 : 1); kick=.13; kickTime=0; activity++;
    view.dataset.shakes=String(activity); lastSnowReport='';
    report('Está nevando! Veja os flocos se acomodarem.'); schedule();
  }
  function reset() {
    targetYaw=homeYaw; targetPitch=0;
    if(!canMove()) {yaw=targetYaw;pitch=targetPitch;}
    report('Globo na posição inicial.'); schedule();
  }
  function render(now,initial=false) {
    frame=0;
    if(disposed||(!initial&&(document.hidden||!visible||scrolling))) {previous=0;return;}
    syncRendererSize();
    const dt=previous?Math.min((now-previous)/1000,.05):1/60; previous=now;
    let needsMore=false;
    if(canMove()) {
      opening.update(dt);
      needsMore=opening.playing;
      const smoothing=1-Math.exp(-9*dt);
      yaw+=(targetYaw-yaw)*smoothing; pitch+=(targetPitch-pitch)*smoothing;
      if(snow.active>0) {
        accumulator+=dt;
        while(accumulator>=1/90) {snow.step(1/90);accumulator-=1/90;}
        snowGeo.attributes.position.needsUpdate=true;
        needsMore ||= snow.active>0;
      }
      if(kick>.0005) {kickTime+=dt; kick*=Math.exp(-3.5*dt);needsMore=true;} else kick=0;
      needsMore ||= Math.abs(targetYaw-yaw)+Math.abs(targetPitch-pitch)>.0001;
      if(snow.active===0&&lastSnowReport!=='settled') {lastSnowReport='settled';report('Tudo tranquilo. Chacoalhe para nevar outra vez.');}
    }
    pivot.rotation.set(pitch+Math.sin(kickTime*26)*kick,yaw,Math.cos(kickTime*29)*kick*.7);
    pivot.position.x=Math.sin(kickTime*23)*kick*.2;
    const desiredDistance=opening.active?7.8:dialog.open?7.6:8.4-scrollDepth*.38;
    if(canMove()){dolly+=(desiredDistance-dolly)*(1-Math.exp(-5*dt));needsMore ||= Math.abs(desiredDistance-dolly)>.0001;}else dolly=desiredDistance;
    const fitWidth=4.35/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect);
    const distance=Math.max(dolly,fitWidth);
    camera.position.set(0,3.05+scrollDepth*.3,distance); camera.lookAt(0,1.9,0);
    const rotation=pivot.rotation;
    if(opening.playing||rotation.x!==shadowPitch||rotation.y!==shadowYaw||rotation.z!==shadowRoll||pivot.position.x!==shadowX) {
      renderer.shadowMap.needsUpdate=true;
      shadowPitch=rotation.x;shadowYaw=rotation.y;shadowRoll=rotation.z;shadowX=pivot.position.x;
    }
    renderer.render(scene,camera); syncData();
    if(needsMore) schedule(); else previous=0;
  }
  const ro=new ResizeObserver(resize);ro.observe(view);
  const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){previous=0;schedule();}else{cancelAnimationFrame(frame);frame=0;previous=0;}},{threshold:0});io.observe(view);
  const mo=new MutationObserver(()=>{
    const nextPaused=document.body.classList.contains('fc-paused');
    if(nextPaused!==paused){paused=nextPaused;drag=null;previous=0;report(paused?'Movimento pausado.':'Movimento retomado.');}
    applyLight();schedule();
  });mo.observe(document.body,{attributes:true,attributeFilter:['class','data-lights']});
  reduced.addEventListener('change',()=>{kick=0;yaw=targetYaw;pitch=targetPitch;previous=0;if(reduced.matches&&opening.playing)opening.complete();report(reduced.matches?'Movimento reduzido: use as setas para explorar em passos.':'Arraste para girar ou chacoalhe para fazer nevar.');schedule();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;drag=null;}else{previous=0;schedule();}});
  // Keep the current frame while the page moves; resume physics after rest.
  const heroResize=new ResizeObserver(measureHero);if(hero)heroResize.observe(hero);
  window.addEventListener('resize',measureHero,{passive:true});measureHero();
  window.addEventListener('scroll',()=>{
    if(dialog.open||opening.active||opening.playing||document.body.classList.contains('fc-entry-landing'))return;
    if(!scrolling){scrolling=true;cancelAnimationFrame(frame);frame=0;previous=0;}
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
      scrolling=false;
      if(!reduced.matches&&!paused)scrollDepth=Math.max(0,Math.min(1,(window.scrollY-heroTop)/heroHeight));
      schedule();
    },140);
  },{passive:true});

  const shakeGesture = new ShakeGesture();
  const hoverGesture = new ShakeGesture({distance:35});
  view.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')hoverGesture.begin(e.clientX,performance.now());});
  view.addEventListener('pointerleave',e=>{
    hoverGesture.end();
    if(e.pointerType==='mouse'&&!drag&&!opening.active&&!opening.playing&&!paused&&!reduced.matches){targetYaw=homeYaw;targetPitch=0;schedule();}
  });
  view.addEventListener('pointerdown',e=>{
    if(e.button!==0||paused||opening.playing) return;
    view.focus({preventScroll:true}); view.setPointerCapture(e.pointerId);
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    shakeGesture.begin(e.clientX,performance.now());
  });
  view.addEventListener('pointermove',e=>{
    if(!drag){
      if(e.pointerType!=='mouse'||paused||reduced.matches||opening.active||opening.playing)return;
      const rect=view.getBoundingClientRect();
      const nx=THREE.MathUtils.clamp((e.clientX-rect.left)/rect.width*2-1,-1,1);
      const ny=THREE.MathUtils.clamp((e.clientY-rect.top)/rect.height*2-1,-1,1);
      targetYaw=homeYaw+nx*.58;targetPitch=ny*.16;
      if(!hoverGesture.engaged)hoverGesture.begin(e.clientX,performance.now());
      if(hoverGesture.move(e.clientX,performance.now()))shake(true);
      schedule();return;
    }
    if(e.pointerId!==drag.id) return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.travel=(drag.travel||0)+Math.abs(dx)+Math.abs(dy);
    if(opening.active){drag.x=e.clientX;drag.y=e.clientY;return;}
    targetYaw+=dx*.008;
    if(e.pointerType==='mouse') targetPitch=THREE.MathUtils.clamp(targetPitch+dy*.004,-.24,.22);
    if(reduced.matches){yaw=targetYaw;pitch=targetPitch;}
    if(shakeGesture.move(e.clientX,performance.now()))shake(true);
    drag.x=e.clientX;drag.y=e.clientY;schedule();
  });
  const release=e=>{if(drag?.id===e.pointerId) {const tapped=e.type==='pointerup'&&(drag.travel||0)<9;drag=null;shakeGesture.end();if(tapped){if(opening.active)window.dispatchEvent(new CustomEvent('fc:globe-tap'));else shake();}if(view.hasPointerCapture(e.pointerId))view.releasePointerCapture(e.pointerId);}};
  view.addEventListener('pointerup',release);view.addEventListener('pointercancel',release);view.addEventListener('lostpointercapture',()=>{drag=null;});
  view.addEventListener('keydown',e=>{
    if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat){if(opening.active)window.dispatchEvent(new CustomEvent('fc:globe-tap'));else shake();}return;}
    if(opening.active)return;
    if(e.key==='Home'){e.preventDefault();reset();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault(); if(paused)return;
    if(e.key==='ArrowLeft')targetYaw-=.24;if(e.key==='ArrowRight')targetYaw+=.24;
    if(e.key==='ArrowUp')targetPitch=Math.max(-.24,targetPitch-.08);if(e.key==='ArrowDown')targetPitch=Math.min(.22,targetPitch+.08);
    if(reduced.matches){yaw=targetYaw;pitch=targetPitch;}schedule();
  });
  root.querySelector('[data-reset-globe]').addEventListener('click',reset);
  expandButton.addEventListener('click',()=>{
    if(dialog.open)return;
    dock.style.minHeight=`${root.getBoundingClientRect().height}px`;
    dialog.appendChild(root);closeButton.hidden=false;expandButton.hidden=true;
    document.body.classList.add('fc-globe-open');dialog.showModal();
    closeButton.focus();visible=true;resize();
  });
  closeButton.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    dock.appendChild(root);dock.style.minHeight='';closeButton.hidden=true;expandButton.hidden=false;
    document.body.classList.remove('fc-globe-open');resize();expandButton.focus({preventScroll:true});
  });
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);frame=0;disposed=true;fallback('WebGL context lost');});
  window.addEventListener('fc:load-bypass',()=>{disposed=true;cancelAnimationFrame(frame);frame=0;renderer.dispose();renderer.domElement.remove();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;previous=0;});
  window.addEventListener('pageshow',()=>{previous=0;schedule();});
  await opening.ready;
  if(cancelled())return;
  syncRendererSize();
  if(!lastWidth||!lastHeight)throw new Error('O espaço da prévia ainda não está disponível.');
  camera.position.set(0,3.05,8.4);camera.lookAt(0,1.9,0);
  // Aquecer também os materiais do trenó antes de sua primeira passagem.
  opening.sleigh.visible=true;
  try {await renderer.compileAsync(scene,camera);} finally {opening.sleigh.visible=false;}
  if(cancelled())return;
  if(renderer.getContext().isContextLost())throw new Error('WebGL não está disponível.');
  view.dataset.renderer='webgl';view.dataset.asset='Higgsfield 3D Jutsu';
  expandButton.disabled=false;
  snow.scatter();applyLight();resize();
  cancelAnimationFrame(frame);frame=0;render(performance.now(),true);
  window.dispatchEvent(new CustomEvent('fc:globe-ready'));
  window.FlashClipBoot?.report('scene');
  if(reduced.matches)report('Movimento reduzido: use as setas para explorar em passos.');
}
