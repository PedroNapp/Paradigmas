/**
 * A small, articulated instance of the author's Vereda notebook.
 * The controller owns the renderer, template geometries, environment and logo
 * textures. An instance owns its screen material, lid decal and contact shadow.
 */
const framingByTemplate = new WeakMap();

export function createNotebookScene(THREE, templateGLTFScene, environment, logoCanvasTexture, brandTexture = null) {
  const scene = new THREE.Scene();
  scene.environment = environment || null;
  scene.environmentIntensity = 0.8;

  const camera = new THREE.OrthographicCamera(-0.25, 0.25, 0.2, -0.2, 0.01, 4);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const model = templateGLTFScene.clone(true);
  const notebook = model.getObjectByName('Notebook');
  const lid = model.getObjectByName('Notebook_Lid');
  const screen = model.getObjectByName('Notebook_Screen');
  if (!notebook || !lid || !screen) {
    throw new Error('O modelo do notebook não contém a tampa e a tela esperadas.');
  }
  pivot.add(model);
  const emblem = model.getObjectByName('Notebook_BackEmblem');
  if (emblem) emblem.visible = false;

  // The GLB's exterior is the lid's local -Z face at -0.0045 m. Keep
  // this real logo attached to the hinge, just above that flat metal surface.
  const lidLogoGeometry = brandTexture ? new THREE.PlaneGeometry(0.13, 0.13 * 706 / 2049) : null;
  const lidLogoMaterial = brandTexture ? new THREE.MeshBasicMaterial({
    map: brandTexture,
    transparent: true,
    alphaTest: 0.01,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.FrontSide
  }) : null;
  if (brandTexture) {
    const lidLogo = new THREE.Mesh(lidLogoGeometry, lidLogoMaterial);
    lidLogo.name = 'FlashClip_LidLogo';
    lidLogo.position.set(0, 0.113, -0.0047);
    // A normal TextureLoader image keeps flipY=true. This turn faces the
    // exterior, with text left-to-right and its top toward the rear hinge
    // when closed; it is correctly hidden behind the open display.
    lidLogo.rotation.x = Math.PI;
    lid.add(lidLogo);
  }

  // Texture ownership stays with the controller so filtering can reuse it.
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: logoCanvasTexture,
    color: 0x000000,
    toneMapped: false,
    side: THREE.FrontSide
  });
  screen.material = screenMaterial;

  scene.add(new THREE.HemisphereLight(0xfff3de, 0x21413c, 2.4));
  const key = new THREE.DirectionalLight(0xffefd2, 3.4);
  key.position.set(-0.5, 0.9, 0.75);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xb9dbdb, 2.1);
  rim.position.set(0.7, 0.55, -0.6);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xe6d6ae, 0.65);
  fill.position.set(0.6, 0.18, 0.5);
  scene.add(fill);

  // A texture shadow needs no per-card shadow map or additional WebGL context.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0, 8, 7, 0.46)');
  gradient.addColorStop(0.45, 'rgba(0, 8, 7, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 8, 7, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeometry = new THREE.PlaneGeometry(0.46, 0.34);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.8
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -0.003, 0.004);
  scene.add(shadow);

  const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));
  const tiltClamp = value => Math.max(-1, Math.min(1, Number(value) || 0));
  const closedAngle = Math.PI / 2;
  const openAngle = -0.20943951;
  const baseYaw = -0.035;
  let disposed = false;

  function setOpen(progress) {
    const amount = clamp(progress);
    lid.rotation.x = closedAngle + (openAngle - closedAngle) * amount;
    // The slight lift stops the closed display clipping through the keycaps.
    lid.position.y = 0.025 + 0.0085 * (1 - amount);
  }

  function setTilt(x = 0, y = 0) {
    // Inputs are normalized pointer coordinates, not Euler angles.
    pivot.rotation.set(-tiltClamp(y) * 0.035, baseYaw + tiltClamp(x) * 0.09, 0);
  }

  function setScreenOn(progress) {
    // Fade from true black; keep the opaque display so the bezel stays solid.
    screenMaterial.color.setScalar(clamp(progress));
  }

  // Every card uses this same model. Fit all hinge/tilt positions only for the
  // first instance, then reuse the exact framing without retaining that scene.
  // The renderer propagates later per-frame transforms in its normal update.
  let framing = framingByTemplate.get(templateGLTFScene);
  let bounds;
  if (!framing) {
    bounds = new THREE.Box3();
    const poseBounds = new THREE.Box3();
    for (const opening of [0, 0.25, 0.5, 0.75, 1]) {
      setOpen(opening);
      for (const [x, y] of [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        setTilt(x, y);
        pivot.updateMatrixWorld(true);
        bounds.union(poseBounds.setFromObject(pivot));
      }
    }
  }
  setOpen(0);
  setTilt(0, 0);
  setScreenOn(0);

  const target = framing ? new THREE.Vector3(...framing.target) : bounds.getCenter(new THREE.Vector3());
  const viewDirection = new THREE.Vector3(0.35, 0.29, 0.84).normalize();
  camera.position.copy(target).add(viewDirection);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  if (!framing) {
    const projected = new THREE.Box3();
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
        }
      }
    }
    framing = {
      target: target.toArray(),
      contentWidth: projected.max.x - projected.min.x,
      contentHeight: projected.max.y - projected.min.y
    };
    framingByTemplate.set(templateGLTFScene, framing);
  }
  const { contentWidth, contentHeight } = framing;

  function resize(width, height) {
    const aspect = Math.max(1, width || 1) / Math.max(1, height || 1);
    const span = Math.max(contentHeight, contentWidth / aspect) * 1.12;
    camera.left = -span * aspect / 2;
    camera.right = span * aspect / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
  }
  resize(400, 240);

  function dispose() {
    if (disposed) return;
    disposed = true;
    screenMaterial.dispose();
    lidLogoGeometry?.dispose();
    lidLogoMaterial?.dispose();
    shadowMaterial.dispose();
    shadowGeometry.dispose();
    shadowTexture.dispose();
    scene.clear();
    // Do not dispose the shared GLB, environment or supplied logo textures.
  }

  return { scene, camera, pivot, lid, screen, setOpen, setTilt, setScreenOn, resize, dispose };
}
