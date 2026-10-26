/**
 * O notebook único da lista de cursos (js/notebookCursos.js cuida da tela).
 * Fechado, ele aparece de três quartos, com o logo na tampa. Ao abrir, a
 * câmera vai para a frente da tela e para exatamente onde o CSS colocou o
 * .fc-notebook-encaixe: o HTML da tela fica por cima e coincide com a tela 3D.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createNotebookScene } from './notebook-scene.js';

const calmo = matchMedia('(prefers-reduced-motion: reduce)');
const mouse = matchMedia('(hover: hover) and (pointer: fine)');
const suave = valor => valor * valor * (3 - 2 * valor);
const limitar = (valor, minimo = 0, maximo = 1) => Math.max(minimo, Math.min(maximo, valor));

// Mesmo giro de base de notebook-scene.js (setTilt sem ponteiro).
const GIRO_BASE = -0.035;
// Fechado, quanto do palco o notebook ocupa (largura, altura) e onde fica o centro dele.
const FECHADO_LARGURA = .6, FECHADO_LARGURA_CELULAR = .8, FECHADO_ALTURA = .55, FECHADO_CENTRO = .44;
const DISTANCIA = 1.5;

// Fundo da tela 3D igual ao do HTML que fica por cima (.fc-notebook-tela).
function texturaDaTela() {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 400;
  const contexto = canvas.getContext('2d');
  const gradiente = contexto.createRadialGradient(320, 152, 10, 320, 152, 380);
  gradiente.addColorStop(0, '#1c2530'); gradiente.addColorStop(1, '#05080b');
  contexto.fillStyle = gradiente; contexto.fillRect(0, 0, 640, 400);
  const textura = new THREE.CanvasTexture(canvas);
  textura.flipY = false; textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

function descartarModelo(cena) {
  const geometrias = new Set(), materiais = new Set();
  cena?.traverse(objeto => {
    if (objeto.geometry) geometrias.add(objeto.geometry);
    for (const material of (Array.isArray(objeto.material) ? objeto.material : [objeto.material])) if (material) materiais.add(material);
  });
  for (const geometria of geometrias) geometria.dispose();
  for (const material of materiais) material.dispose();
}

export async function criarNotebook3D({ palco, canvas, encaixe, aberto, aoTerminar, aoFalhar }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.setClearColor(0x000000, 0);

  const sala = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambiente = pmrem.fromScene(sala, .04);
  sala.dispose(); pmrem.dispose();

  let modelo, marca;
  const telaTextura = texturaDaTela();
  try {
    // O modelo usa compressão meshopt (EXT_meshopt_compression), lida pelo MeshoptDecoder.
    [modelo, marca] = await Promise.all([
      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL('./models/notebook.glb', import.meta.url).href),
      new THREE.TextureLoader().loadAsync(new URL('../imagens/logoFlash.webp', import.meta.url).href),
    ]);
  } catch (erro) {
    descartarModelo(modelo?.scene); marca?.dispose(); telaTextura.dispose(); ambiente.dispose(); renderer.dispose();
    throw erro;
  }
  marca.colorSpace = THREE.SRGBColorSpace;
  marca.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const cena = createNotebookScene(THREE, modelo.scene, ambiente.texture, telaTextura, marca);
  const { camera } = cena;

  // =========================
  // POSES DA CÂMERA
  // =========================

  // Fechado: a vista de três quartos de notebook-scene.js, centrada no notebook fechado
  // (o enquadramento dela conta a tampa aberta e deixaria o notebook no pé do palco).
  const direcaoFechado = camera.getWorldDirection(new THREE.Vector3()).negate();
  cena.setOpen(0); cena.pivot.rotation.set(0, GIRO_BASE, 0); cena.scene.updateMatrixWorld(true);
  const caixaFechado = new THREE.Box3().setFromObject(cena.pivot);
  const alvoFechado = caixaFechado.getCenter(new THREE.Vector3());
  camera.position.copy(alvoFechado).addScaledVector(direcaoFechado, DISTANCIA);
  camera.lookAt(alvoFechado); camera.updateMatrixWorld(true);
  const projecao = new THREE.Box3();
  for (const x of [caixaFechado.min.x, caixaFechado.max.x]) {
    for (const y of [caixaFechado.min.y, caixaFechado.max.y]) {
      for (const z of [caixaFechado.min.z, caixaFechado.max.z]) {
        projecao.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
    }
  }
  const fechadoLargura = projecao.max.x - projecao.min.x, fechadoAltura = projecao.max.y - projecao.min.y;

  // A tela aberta, medida uma vez com a tampa aberta e o notebook reto.
  cena.setOpen(1); cena.pivot.rotation.set(0, 0, 0); cena.scene.updateMatrixWorld(true);
  cena.screen.geometry.computeBoundingBox();
  const { min, max } = cena.screen.geometry.boundingBox;
  const canto = (x, y) => new THREE.Vector3(x, y, 0).applyMatrix4(cena.screen.matrixWorld);
  const [a, b, c] = [canto(min.x, min.y), canto(max.x, min.y), canto(max.x, max.y)];
  const tela = {
    centro: a.clone().add(c).multiplyScalar(.5),
    largura: a.distanceTo(b),
    altura: b.distanceTo(c),
    direita: b.clone().sub(a).normalize(),
  };
  tela.normal = new THREE.Vector3().crossVectors(tela.direita, c.clone().sub(b).normalize()).normalize();

  const poses = { fechado: null, aberto: null };
  let largura = 0, altura = 0;

  function medir() {
    const caixaPalco = palco.getBoundingClientRect();
    const caixaTela = encaixe.getBoundingClientRect();
    largura = Math.round(caixaPalco.width); altura = Math.round(caixaPalco.height);
    if (largura < 2 || altura < 2 || caixaTela.width < 2) return false;
    renderer.setSize(largura, altura, false);

    const ocupa = largura < 600 ? FECHADO_LARGURA_CELULAR : FECHADO_LARGURA;
    const escalaFechado = Math.min(ocupa * largura / fechadoLargura, FECHADO_ALTURA * altura / fechadoAltura);
    poses.fechado = {
      direcao: direcaoFechado, alvo: alvoFechado,
      quadro: [-largura / 2 / escalaFechado, largura / 2 / escalaFechado, FECHADO_CENTRO * altura / escalaFechado, -(1 - FECHADO_CENTRO) * altura / escalaFechado],
    };

    // De frente para a tela, só inclinada para cima: a tela continua um retângulo,
    // um pouco mais baixo, e a inclinação é a que deixa a proporção igual à do encaixe.
    const proporcao = caixaTela.width / caixaTela.height;
    const angulo = Math.acos(limitar((tela.largura / tela.altura) / proporcao, .5, 1));
    const opcoes = [angulo, -angulo].map(giro => tela.normal.clone().applyAxisAngle(tela.direita, giro));
    const direcao = opcoes[0].y > opcoes[1].y ? opcoes[0] : opcoes[1];

    // Pixels por unidade do modelo, e o centro da tela no ponto do encaixe.
    const escala = caixaTela.width / tela.largura;
    const cx = caixaTela.left - caixaPalco.left + caixaTela.width / 2;
    const cy = caixaTela.top - caixaPalco.top + caixaTela.height / 2;
    poses.aberto = {
      direcao, alvo: tela.centro,
      quadro: [-cx / escala, (largura - cx) / escala, cy / escala, -(altura - cy) / escala],
    };
    return true;
  }

  // =========================
  // DESENHO
  // =========================

  let progresso = aberto ? 1 : 0, destino = progresso, origem = progresso, inicio = 0, duracao = 1;
  let inclinaX = 0, inclinaY = 0, alvoX = 0, alvoY = 0;
  let quadro = 0, pronto = false, encerrado = false;
  const direcao = new THREE.Vector3(), alvo = new THREE.Vector3();

  function posicionar() {
    const t = suave(progresso);
    const fechar = 1 - t;
    cena.setOpen(progresso);
    cena.setScreenOn(suave(limitar((progresso - .35) / .5)));
    cena.pivot.rotation.set(-inclinaY * .035 * fechar, (GIRO_BASE + inclinaX * .09) * fechar, 0);

    const { fechado, aberto: frente } = poses;
    direcao.copy(fechado.direcao).lerp(frente.direcao, t).normalize();
    alvo.copy(fechado.alvo).lerp(frente.alvo, t);
    camera.position.copy(alvo).addScaledVector(direcao, DISTANCIA);
    camera.up.set(0, 1, 0);
    camera.lookAt(alvo);
    [camera.left, camera.right, camera.top, camera.bottom] = fechado.quadro.map((valor, i) => valor + (frente.quadro[i] - valor) * t);
    camera.near = .01; camera.far = 4;
    camera.updateProjectionMatrix();
  }

  function mexendo() {
    return Math.abs(progresso - destino) > .0001 || Math.abs(inclinaX - alvoX) + Math.abs(inclinaY - alvoY) > .001;
  }

  function desenhar(agora = performance.now()) {
    quadro = 0;
    if (encerrado || !pronto || document.hidden) return;
    if (calmo.matches) {
      progresso = destino; inclinaX = inclinaY = alvoX = alvoY = 0;
    } else {
      const tempo = limitar((agora - inicio) / duracao);
      progresso = tempo >= 1 ? destino : origem + (destino - origem) * suave(tempo);
      inclinaX += (alvoX - inclinaX) * .18;
      inclinaY += (alvoY - inclinaY) * .18;
    }
    posicionar();
    try {
      renderer.render(cena.scene, camera);
    } catch (erro) {
      falhar(erro);
      return;
    }
    if (mexendo()) {
      pedir();
    } else if (progresso === destino && destino === 1 && origem !== 1) {
      origem = 1;
      aoTerminar?.(true);
    }
  }

  function pedir() {
    if (!quadro && !encerrado) quadro = requestAnimationFrame(desenhar);
  }

  function definirAberto(valor, { imediato = false } = {}) {
    destino = valor ? 1 : 0;
    alvoX = alvoY = 0;
    if (imediato || calmo.matches) {
      progresso = origem = destino;
      inicio = performance.now(); duracao = 1;
      pedir();
      if (valor) aoTerminar?.(true);
      return;
    }
    origem = progresso; inicio = performance.now();
    duracao = Math.max(250, 1150 * Math.abs(destino - origem));
    pedir();
  }

  // =========================
  // EVENTOS
  // =========================

  // Fechado, o notebook acompanha o mouse de leve; aberto, fica parado sob a tela HTML.
  function ponteiro(evento) {
    if (evento.pointerType !== 'mouse' || !mouse.matches || calmo.matches || destino !== 0 || progresso > .001) return;
    const caixa = palco.getBoundingClientRect();
    alvoX = limitar((evento.clientX - caixa.left) / caixa.width * 2 - 1, -1, 1);
    alvoY = limitar((evento.clientY - caixa.top) / caixa.height * 2 - 1, -1, 1);
    pedir();
  }
  function saiu() { alvoX = alvoY = 0; pedir(); }

  const redimensionar = new ResizeObserver(() => {
    pronto = medir();
    pedir();
  });

  function visibilidade() { if (!document.hidden) pedir(); }

  function falhar(erro) {
    if (encerrado) return;
    console.warn('O notebook 3D parou; a tela continua no desenho.', erro);
    aoFalhar?.();
  }

  function perdeuContexto(evento) { evento.preventDefault(); falhar(new Error('WebGL context lost')); }

  palco.addEventListener('pointermove', ponteiro);
  palco.addEventListener('pointerleave', saiu);
  canvas.addEventListener('webglcontextlost', perdeuContexto);
  document.addEventListener('visibilitychange', visibilidade);
  calmo.addEventListener('change', pedir);
  redimensionar.observe(palco);

  // Os shaders compilam antes do primeiro quadro aparecer.
  pronto = medir();
  if (pronto) {
    posicionar();
    await renderer.compileAsync(cena.scene, camera);
  }
  desenhar();
  if (aberto) aoTerminar?.(true);

  function destruir() {
    if (encerrado) return;
    encerrado = true;
    cancelAnimationFrame(quadro); quadro = 0;
    redimensionar.disconnect();
    palco.removeEventListener('pointermove', ponteiro);
    palco.removeEventListener('pointerleave', saiu);
    canvas.removeEventListener('webglcontextlost', perdeuContexto);
    document.removeEventListener('visibilitychange', visibilidade);
    calmo.removeEventListener('change', pedir);
    cena.dispose(); descartarModelo(modelo.scene);
    telaTextura.dispose(); marca.dispose(); ambiente.dispose(); renderer.dispose();
  }

  return { definirAberto, destruir };
}
