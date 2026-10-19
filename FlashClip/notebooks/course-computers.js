import { courseIdentity } from './course-identities.js';

const list = document.getElementById('listaCursos');
if (list && !list.dataset.computerUnavailable) initializeComputers(list);

function initializeComputers(list) {
  const states = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let enginePromise, engine, frame = 0, stopped = false, unavailable = false;
  let scrolling = false, scrollTimer = 0, rendererWidth = 0, rendererHeight = 0;
  let engineTimer = 0, pendingCleanup;
  const quietWaiters = new Set();
  const motionStopped = () => reduced.matches || document.body.classList.contains('fc-paused');
  const smooth = value => value * value * (3 - 2 * value);
  function show(state, renderer) {
    state.element.dataset.renderer = renderer;
    state.trigger.setAttribute('aria-busy', String(renderer === 'pending'));
  }
  function failCard(state) {
    state.failed = true;
    state.graphics?.dispose(); state.texture?.dispose();
    state.graphics = null; state.texture = null;
    show(state, 'fallback');
  }
  function disposeTemplate(scene) {
    const geometries = new Set(), materials = new Set();
    scene?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) if (material) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  // Model setup and GPU uploads yield to the user's scrolling gesture.
  function whenQuiet() {
    return new Promise(resolve => {
      const check = () => {
        if (stopped || unavailable || !scrolling) resolve();
        else quietWaiters.add(check);
      };
      if ('requestIdleCallback' in window) requestIdleCallback(check, { timeout: 350 });
      else setTimeout(check, 0);
    });
  }

  async function loadEngine() {
    if (enginePromise) return enginePromise;
    engineTimer = setTimeout(fallbackAll, 20000);
    enginePromise = (async () => {
      // Os modelos usam compressão meshopt (EXT_meshopt_compression), lida pelo MeshoptDecoder.
      const [THREE, { GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }, { createNotebookScene }] = await Promise.all([
        import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js'),
        import('three/addons/environments/RoomEnvironment.js'), import('./notebook-scene.js'),
      ]);
      await whenQuiet();
      if (stopped || unavailable) return null;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault(); fallbackAll();
      });
      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const environmentTarget = pmrem.fromScene(room, .04);
      room.dispose(); pmrem.dispose();
      let model;
      pendingCleanup = () => { disposeTemplate(model?.scene); environmentTarget.dispose(); renderer.dispose(); };
      try {
        model = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL('./models/notebook.glb', import.meta.url).href);
        if (unavailable || stopped) { disposeTemplate(model.scene); return null; }
        const brandTexture = await new THREE.TextureLoader().loadAsync(new URL('../imagens/logoFlash.webp', import.meta.url).href);
        if (unavailable || stopped) { brandTexture.dispose(); return null; }
        brandTexture.colorSpace = THREE.SRGBColorSpace;
        brandTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        engine = { THREE, renderer, model: model.scene, environmentTarget, brandTexture, createNotebookScene };
        pendingCleanup = null;
        return engine;
      } catch (error) {
        pendingCleanup?.(); pendingCleanup = null; throw error;
      }
    })().catch(error => {
      fallbackAll();
      console.warn('Os notebooks continuam disponíveis na versão leve.', error);
      return null;
    }).finally(() => clearTimeout(engineTimer));
    return enginePromise;
  }

  function fallbackAll() {
    unavailable = true;
    clearTimeout(engineTimer);
    pendingCleanup?.(); pendingCleanup = null;
    cancelAnimationFrame(frame); frame = 0;
    for (const state of states.values()) failCard(state);
    const waiting = [...quietWaiters]; quietWaiters.clear();
    for (const resume of waiting) resume();
  }

  async function logoTexture(THREE, identity) {
    let image;
    if (identity.logo) {
      image = await new Promise(resolve => {
        const item = new Image();
        let finished = false;
        const finish = value => {
          if (finished) return;
          finished = true; clearTimeout(timer); item.onload = item.onerror = null; resolve(value);
        };
        const timer = setTimeout(() => finish(null), 5000);
        item.onload = () => finish(item); item.onerror = () => finish(null);
        item.src = identity.logo;
      });
    }
    // Cada versão pode trocar a tela pela própria paleta via variáveis CSS.
    const styles = getComputedStyle(document.documentElement);
    const tone = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 400;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(320, 185, 10, 320, 185, 370);
    gradient.addColorStop(0, tone('--fc-screen-glow', '#183b30')); gradient.addColorStop(1, tone('--fc-screen-base', '#061610'));
    context.fillStyle = gradient; context.fillRect(0, 0, 640, 400);
    context.fillStyle = tone('--fc-screen-muted', '#aebfb1'); context.textAlign = 'left'; context.font = '500 13px Arial';
    context.fillText('FLASHCLIP  /  APRENDA NA PRÁTICA', 36, 37);
    context.strokeStyle = tone('--fc-screen-rule', '#d5c08c35'); context.beginPath(); context.moveTo(36, 57); context.lineTo(604, 57); context.stroke();
    if (image) {
      const scale = Math.min(152 / image.naturalWidth, 152 / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      context.drawImage(image, 320 - w / 2, 183 - h / 2, w, h);
    }
    context.textAlign = 'center'; context.fillStyle = tone('--fc-screen-text', '#f3eedf');
    context.font = `600 ${identity.name.length > 10 ? 36 : 44}px Arial`;
    context.fillText(identity.name, 320, image ? 317 : 220, 560);
    context.fillStyle = identity.color; context.fillRect(300, 351, 40, 3);
    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false; texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, engine.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  async function prepare(state) {
    if (state.preparing || state.failed || state.graphics || !state.context || unavailable || stopped || scrolling || !state.near) return;
    state.preparing = true;
    try {
      const runtime = await loadEngine();
      if (!runtime || unavailable || state.failed || !state.element.isConnected || stopped) return;
      const texture = await logoTexture(runtime.THREE, state.identity);
      await whenQuiet();
      if (!state.element.isConnected || stopped || unavailable || state.failed || !state.near) { texture.dispose(); return; }
      state.texture = texture;
      state.graphics = runtime.createNotebookScene(runtime.THREE, runtime.model, runtime.environmentTarget.texture, texture, runtime.brandTexture);
      state.progress = state.target;
      state.dirty = true;
      queue();
    } catch (error) {
      failCard(state);
      console.warn('Prévia leve do notebook:', error);
    } finally {
      state.preparing = false;
    }
  }

  function advance(state, now) {
    if (motionStopped()) { state.progress = state.target; state.tiltX = state.tiltY = state.targetX = state.targetY = 0; return; }
    const time = Math.min(1, Math.max(0, (now - state.started) / state.duration));
    state.progress = state.from + (state.target - state.from) * smooth(time);
    state.tiltX += (state.targetX - state.tiltX) * .18;
    state.tiltY += (state.targetY - state.tiltY) * .18;
  }

  function moving(state) {
    return Math.abs(state.progress - state.target) > .0001 || Math.abs(state.tiltX - state.targetX) + Math.abs(state.tiltY - state.targetY) > .001;
  }

  function queue() {
    if (!frame && !scrolling && !document.hidden && !stopped && !unavailable) frame = requestAnimationFrame(render);
  }

  function render(now) {
    frame = 0;
    if (stopped || unavailable || document.hidden || scrolling) return;
    let again = false;
    for (const state of states.values()) {
      if (!state.visible || !state.graphics || (!state.dirty && !moving(state))) continue;
      const { width, height } = state;
      if (width < 1 || height < 1) continue;
      advance(state, now);
      const { renderer } = engine;
      const ratio = renderer.getPixelRatio();
      const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
      if (state.canvas.width !== pixelWidth || state.canvas.height !== pixelHeight) {
        state.canvas.width = pixelWidth; state.canvas.height = pixelHeight;
      }
      if (state.renderWidth !== width || state.renderHeight !== height) {
        state.graphics.resize(width, height);
        state.renderWidth = width; state.renderHeight = height;
      }
      state.graphics.setOpen(state.progress);
      state.graphics.setTilt(state.tiltX, state.tiltY);
      state.graphics.setScreenOn(smooth(Math.max(0, Math.min(1, (state.progress - .35) / .5))));
      if (rendererWidth !== width || rendererHeight !== height) {
        renderer.setSize(width, height, false);
        rendererWidth = width; rendererHeight = height;
      }
      try {
        renderer.render(state.graphics.scene, state.graphics.camera);
        if (unavailable) return;
        state.context.clearRect(0, 0, pixelWidth, pixelHeight);
        state.context.drawImage(renderer.domElement, 0, 0, pixelWidth, pixelHeight);
      } catch (error) {
        failCard(state);
        console.warn('Prévia leve do notebook:', error);
        continue;
      }
      // Reveal only after the real model's first frame has reached this canvas.
      if (state.element.dataset.renderer !== 'webgl') show(state, 'webgl');
      state.element.dataset.openProgress = state.progress.toFixed(3);
      state.dirty = false;
      again ||= moving(state);
    }
    if (again) queue();
  }

  function bind(element) {
    const trigger = element.querySelector('summary');
    const canvas = element.querySelector('canvas');
    const context = canvas.getContext('2d');
    const identity = courseIdentity(element.dataset.language);
    const state = { element, trigger, canvas, context, identity, near: false, visible: false, width: 0, height: 0, preparing: false, graphics: null, progress: element.open ? 1 : 0, target: element.open ? 1 : 0, from: 0, started: 0, duration: 1, tiltX: 0, tiltY: 0, targetX: 0, targetY: 0, dirty: true };
    const toggle = () => {
      advance(state, performance.now());
      state.from = state.progress; state.target = element.open ? 1 : 0;
      state.started = performance.now(); state.duration = Math.max(180, 1000 * Math.abs(state.target - state.from));
      trigger.setAttribute('aria-label', `${element.open ? 'Fechar' : 'Abrir'} notebook de ${identity.name}`);
      element.querySelector('[data-computer-action]').textContent = element.open ? 'Fechar notebook' : 'Abrir notebook';
      state.dirty = true;
      if (state.near) prepare(state);
      queue();
    };
    const pointer = event => {
      if (event.pointerType !== 'mouse' || scrolling || motionStopped()) return;
      const rect = trigger.getBoundingClientRect();
      state.targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
      state.targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
      state.dirty = true; queue();
    };
    const leave = () => { state.targetX = state.targetY = 0; state.dirty = true; queue(); };
    element.addEventListener('toggle', toggle);
    trigger.addEventListener('pointermove', pointer); trigger.addEventListener('pointerleave', leave);
    state.dispose = () => {
      intersection.unobserve(trigger); viewport.unobserve(trigger); resize.unobserve(trigger);
      element.removeEventListener('toggle', toggle); trigger.removeEventListener('pointermove', pointer); trigger.removeEventListener('pointerleave', leave);
      state.graphics?.dispose(); state.texture?.dispose();
    };
    states.set(element, state); intersection.observe(trigger); viewport.observe(trigger); resize.observe(trigger);
    if (unavailable || !context) show(state, 'fallback');
  }

  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target.closest('.fc-course-computer'));
      if (!state) continue;
      state.near = entry.isIntersecting;
      if (state.near) { state.dirty = true; prepare(state); }
    }
    queue();
  }, { rootMargin: '140px 0px' });
  // A separate observer distinguishes preload distance from actual visibility.
  const viewport = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target.closest('.fc-course-computer'));
      if (state) state.visible = entry.isIntersecting;
    }
    queue();
  });
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target.closest('.fc-course-computer'));
      if (state) {
        state.width = Math.round(entry.contentRect.width);
        state.height = Math.round(entry.contentRect.height);
        state.dirty = true;
      }
    }
    queue();
  });
  const reconcile = () => {
    for (const [element, state] of states) if (!element.isConnected) { state.dispose(); states.delete(element); }
    list.querySelectorAll('.fc-course-computer').forEach(element => { if (!states.has(element)) bind(element); });
  };
  const mutations = new MutationObserver(reconcile); mutations.observe(list, { childList: true }); reconcile();
  const changedMotion = () => { for (const state of states.values()) state.dirty = true; queue(); };
  const bodyChanges = new MutationObserver(changedMotion); bodyChanges.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  reduced.addEventListener('change', changedMotion);
  const scroll = () => {
    if (!scrolling) {
      scrolling = true;
      cancelAnimationFrame(frame); frame = 0;
      for (const state of states.values()) state.targetX = state.targetY = 0;
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrolling = false;
      const waiting = [...quietWaiters]; quietWaiters.clear();
      for (const resume of waiting) resume();
      for (const state of states.values()) if (state.near) prepare(state);
      queue();
    }, 140);
  };
  window.addEventListener('scroll', scroll, { passive: true });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0;
    if (!document.hidden) changedMotion();
  });
  window.addEventListener('pagehide', event => {
    cancelAnimationFrame(frame); frame = 0;
    if (event.persisted) return;
    stopped = true; intersection.disconnect(); viewport.disconnect(); resize.disconnect(); mutations.disconnect(); bodyChanges.disconnect();
    clearTimeout(engineTimer); pendingCleanup?.(); pendingCleanup = null;
    window.removeEventListener('scroll', scroll); clearTimeout(scrollTimer);
    for (const resume of quietWaiters) resume(); quietWaiters.clear();
    for (const state of states.values()) state.dispose();
    states.clear(); engine?.renderer.dispose(); engine?.environmentTarget.dispose(); engine?.brandTexture.dispose();
  });
  window.addEventListener('pageshow', changedMotion);
}
