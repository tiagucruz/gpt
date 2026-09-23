import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { generateGeometry, paletteForSeed, seededRandom } from './geometry.js';

const $ = (id) => document.getElementById(id);
const titles = { orbita: 'Órbita do acaso', espiral: 'Fluxo infinito', esfera: 'Pequeno universo' };
const state = { seed: 'FORMA-0081', style: 'orbita', count: 600, distortion: 35, speed: 0.6, paused: matchMedia('(prefers-reduced-motion: reduce)').matches, edition: 1 };
let renderer, scene, camera, controls, sculpture, particles, haloTexture;
let currentGeometry, currentPalette, toastTimer, regenerateTimer;
const numberFormat = new Intl.NumberFormat('pt-BR');

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}

function cssColor({ h, s, l }) { return `hsl(${h.toFixed(1)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`; }
function threeColor(color) { return new THREE.Color(cssColor(color)); }

function disposeObject(object) {
  if (!object) return;
  object.traverse((child) => {
    child.geometry?.dispose();
    if (child.isInstancedMesh) child.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material?.dispose());
  });
  scene.remove(object);
}

function regenerate({ reset = false } = {}) {
  if (!renderer) return;
  clearTimeout(regenerateTimer);
  const previousRotation = sculpture?.rotation.clone();
  disposeObject(sculpture);
  sculpture = new THREE.Group();
  currentGeometry = generateGeometry(state);
  currentPalette = paletteForSeed(state.seed);
  const colors = currentPalette.colors.map(threeColor);
  const { positions, connections } = currentGeometry;
  const nodeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.31, metalness: 0.42, emissive: colors[2], emissiveIntensity: 0.43 });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 8, 6), nodeMaterial, positions.length);
  const connectorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.45, emissive: colors[1], emissiveIntensity: 0.48, transparent: true, opacity: 0.74 });
  const connectors = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), connectorMaterial, connections.length);
  const dummy = new THREE.Object3D();
  const vectorA = new THREE.Vector3();
  const vectorB = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  positions.forEach((position, i) => {
    dummy.position.fromArray(position);
    dummy.rotation.set(0, 0, 0);
    const size = 0.7 + (Math.sin(i * 3.4) + 1) * 0.35;
    dummy.scale.setScalar(size);
    dummy.updateMatrix();
    nodes.setMatrixAt(i, dummy.matrix);
    nodes.setColorAt(i, colors[2 + i % 3]);
  });
  connections.forEach(([a, b], i) => {
    vectorA.fromArray(positions[a]);
    vectorB.fromArray(positions[b]);
    direction.subVectors(vectorB, vectorA);
    const length = direction.length();
    dummy.position.addVectors(vectorA, vectorB).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(yAxis, direction.normalize());
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    connectors.setMatrixAt(i, dummy.matrix);
    connectors.setColorAt(i, colors[1 + a % 3]);
  });
  sculpture.add(nodes, connectors);

  // Halos aditivos suaves em torno dos vértices, sem imagens ou pós-processamento externos.
  const glowGeometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(), 3));
  const glow = new THREE.Points(glowGeometry, new THREE.PointsMaterial({ color: colors[3], size: 0.13, map: haloTexture, transparent: true, opacity: 0.27, blending: THREE.AdditiveBlending, depthWrite: false }));
  sculpture.add(glow);
  if (previousRotation && !reset) sculpture.rotation.copy(previousRotation);
  else sculpture.rotation.set(state.style === 'orbita' ? 0.48 : 0.08, -0.2, state.style === 'orbita' ? -0.28 : -0.14);
  scene.add(sculpture);
  if (reset) resetCamera(false);
  updateUI();
  $('loading').hidden = true;
}

function updateUI() {
  $('seed').value = state.seed;
  $('point-count').textContent = numberFormat.format(currentGeometry.positions.length);
  $('connection-count').textContent = numberFormat.format(currentGeometry.connections.length);
  $('artwork-title').replaceChildren(document.createTextNode(titles[state.style]));
  const registered = document.createElement('span');
  registered.textContent = '®';
  $('artwork-title').append(registered);
  const edition = String(state.edition).padStart(3, '0');
  $('edition').textContent = `EDIÇÃO Nº ${edition}`;
  $('artwork-category').textContent = `ESTUDO GENERATIVO / ${edition}`;
  $('palette-name').textContent = currentPalette.name;
  $('palette-swatches').replaceChildren(...currentPalette.colors.map((color) => {
    const swatch = document.createElement('span');
    swatch.style.background = cssColor(color);
    swatch.title = cssColor(color);
    return swatch;
  }));
  document.querySelectorAll('input[name="style"]').forEach((input) => { input.checked = input.value === state.style; });
  $('stage').setAttribute('aria-label', `${titles[state.style]}: escultura 3D com ${currentGeometry.positions.length} pontos. Arraste para girar e role para aproximar.`);
}

function resetCamera(notify = true) {
  camera.position.set(0, 2.8, camera.aspect < 0.8 ? 13.7 : 11.4);
  controls.target.set(0, 0, 0);
  controls.update();
  if (notify) toast('Câmera restaurada. Um novo olhar sobre a mesma forma.');
}

function createAtmosphere() {
  const random = seededRandom('forma:atmosphere');
  const positions = [];
  for (let i = 0; i < 170; i++) positions.push((random() - 0.5) * 23, (random() - 0.5) * 17, -3 - random() * 9);
  particles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)), new THREE.PointsMaterial({ color: '#acb49a', size: 0.025, transparent: true, opacity: 0.38, depthWrite: false }));
  scene.add(particles);

  const grid = new THREE.GridHelper(30, 40, '#58654a', '#394431');
  grid.position.y = -3.5;
  grid.material.transparent = true;
  grid.material.opacity = 0.13;
  scene.add(grid);
  scene.fog = new THREE.FogExp2('#141a15', 0.041);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.12, '#ffffffa0');
  gradient.addColorStop(0.35, '#ffffff28');
  gradient.addColorStop(1, '#ffffff00');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  haloTexture = new THREE.CanvasTexture(canvas);
}

function initialize() {
  const container = $('canvas-container');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(41, container.clientWidth / container.clientHeight, 0.1, 100);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setClearColor(0x101410, 0);
  renderer.domElement.setAttribute('aria-label', 'Escultura 3D interativa. Use o mouse ou toque para explorar; use os botões para pausar ou restaurar a câmera.');
  container.append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 21;
  controls.maxPolarAngle = Math.PI * 0.88;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.rotateSpeed = 0.65;
  scene.add(new THREE.AmbientLight('#e2ead5', 1.7));
  const keyLight = new THREE.DirectionalLight('#fff3d5', 4);
  keyLight.position.set(3, 5, 4);
  const rimLight = new THREE.DirectionalLight('#e2eaff', 2.2);
  rimLight.position.set(-4, 1, -3);
  scene.add(keyLight, rimLight);
  createAtmosphere();
  regenerate({ reset: true });

  new ResizeObserver(() => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  }).observe(container);

  let previousTime = 0;
  renderer.setAnimationLoop((time) => {
    const delta = Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    if (document.hidden) return;
    if (!state.paused) {
      sculpture.rotation.y += delta * state.speed * 0.19;
      particles.rotation.y += delta * 0.006;
    }
    controls.update();
    renderer.render(scene, camera);
  });
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    $('stage-error').hidden = false;
    $('error-message').textContent = 'A conexão com a placa gráfica foi interrompida. Recarregue a página para continuar criando.';
  });
}

function newSeed() {
  return `FORMA-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(7, '0')}`;
}

function updateRotationButton() {
  const label = state.paused ? 'Retomar rotação' : 'Pausar rotação';
  $('toggle-rotation').setAttribute('aria-label', label);
  $('toggle-rotation').title = label;
  $('toggle-rotation').setAttribute('aria-pressed', String(state.paused));
  $('toggle-rotation').querySelector('use').setAttribute('href', state.paused ? '#i-play' : '#i-pause');
}

function setupEvents() {
  $('generate').addEventListener('click', () => {
    state.seed = newSeed();
    state.edition++;
    regenerate();
    toast(`Escultura nº ${String(state.edition).padStart(3, '0')} criada. Uma nova possibilidade.`);
  });
  document.querySelectorAll('input[name="style"]').forEach((input) => input.addEventListener('change', () => {
    state.style = input.value;
    regenerate({ reset: true });
  }));
  const sliders = [
    ['density', 'count', (value) => value],
    ['complexity', 'distortion', (value) => `${value}%`],
    ['speed', 'speed', (value) => `${(value / 10).toFixed(1)}×`],
  ];
  sliders.forEach(([id, property, format]) => {
    const input = $(id);
    const reflect = () => {
      $(`${id}-output`).textContent = format(Number(input.value));
      const percent = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.background = `linear-gradient(to right, var(--accent) ${percent}%, #deded5 ${percent}%)`;
    };
    input.addEventListener('input', () => {
      state[property] = Number(input.value) / (id === 'speed' ? 10 : 1);
      reflect();
      if (id !== 'speed') {
        clearTimeout(regenerateTimer);
        regenerateTimer = setTimeout(() => regenerate(), 90);
      }
    });
    reflect();
  });
  const applySeed = () => {
    const seed = $('seed').value.trim();
    if (!seed) { toast('Digite uma semente para recriar a escultura.'); $('seed').focus(); return; }
    state.seed = seed;
    regenerate({ reset: true });
    toast('Semente aplicada. A mesma origem, a mesma escultura.');
  };
  $('apply-seed').addEventListener('click', applySeed);
  $('seed').addEventListener('keydown', (event) => { if (event.key === 'Enter') applySeed(); });
  $('toggle-rotation').addEventListener('click', () => { state.paused = !state.paused; updateRotationButton(); });
  updateRotationButton();
  $('reset-camera').addEventListener('click', () => resetCamera());
  $('fullscreen').addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ($('stage').requestFullscreen) await $('stage').requestFullscreen();
      else toast('A tela cheia não está disponível neste navegador.');
    } catch { toast('Não foi possível ativar a tela cheia neste navegador.'); }
  });
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
    $('fullscreen').title = label;
    $('fullscreen').setAttribute('aria-label', label);
  });
  $('export').addEventListener('click', exportImage);
  document.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => {
    const style = button.dataset.preset;
    state.style = style;
    state.distortion = { orbita: 35, espiral: 55, esfera: 25 }[style];
    $('complexity').value = state.distortion;
    $('complexity').dispatchEvent(new Event('input'));
    regenerate({ reset: true });
    toast(`${titles[style]}: seu novo ponto de partida.`);
    if (innerWidth < 681) $('stage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  }));
  $('about-button').addEventListener('click', () => $('about-dialog').showModal());
  $('close-about').addEventListener('click', () => $('about-dialog').close());
  $('about-dialog').addEventListener('click', (event) => { if (event.target === $('about-dialog')) { const box = $('about-dialog').getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $('about-dialog').close(); } });
}

async function exportImage() {
  const button = $('export');
  button.disabled = true;
  try {
    // O PNG inclui fundo e ficha da obra, que na tela são elementos HTML/CSS.
    renderer.render(scene, camera);
    const source = renderer.domElement;
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    const scale = width / 1000;
    const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.75);
    gradient.addColorStop(0, '#202822');
    gradient.addColorStop(1, '#101410');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0);
    context.fillStyle = '#a9b39b';
    context.font = `${Math.max(10, 11 * scale)}px monospace`;
    context.fillText('FORMA. / ATELIÊ GENERATIVO', 35 * scale, 42 * scale);
    context.fillStyle = '#eeeade';
    context.font = `${38 * scale}px Georgia`;
    context.fillText(titles[state.style], 35 * scale, height - 66 * scale);
    context.font = `${Math.max(9, 11 * scale)}px monospace`;
    context.fillStyle = '#a9b39b';
    context.fillText(`${state.seed}  /  ${state.count} pontos  /  distorção ${state.distortion}%`, 35 * scale, height - 37 * scale);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Falha ao codificar PNG');
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `forma-${state.style}-${state.seed.replace(/[^a-z0-9-]/gi, '_')}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast('Imagem pronta. Sua escultura, para guardar.');
  }
  catch (error) { console.error(error); toast('Não foi possível salvar a imagem. Tente novamente.'); }
  finally { button.disabled = false; }
}

function drawPreviews() {
  const namespace = 'http://www.w3.org/2000/svg';
  Object.keys(titles).forEach((style, index) => {
    const { positions, connections } = generateGeometry({ style, seed: 'forma-preview', count: 240, distortion: 30 });
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 100 90');
    svg.style.stroke = ['#ba744f', '#92956b', '#788b86'][index];
    const points = positions.map(([x, y, z]) => {
      const angle = style === 'orbita' ? 0.65 : 0.17;
      return [50 + (x * 0.94 + z * 0.34) * 12, 45 + (y * Math.cos(angle) - z * Math.sin(angle)) * 12];
    });
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', connections.map(([a, b]) => `M${points[a][0].toFixed(1)},${points[a][1].toFixed(1)}L${points[b][0].toFixed(1)},${points[b][1].toFixed(1)}`).join(''));
    path.setAttribute('opacity', '.55');
    svg.append(path);
    $(`preview-${style}`).append(svg);
  });
}

setupEvents();
drawPreviews();
try { initialize(); }
catch (error) {
  console.error(error);
  $('loading').hidden = true;
  $('stage-error').hidden = false;
  $('error-message').textContent = 'Não foi possível iniciar o 3D. Verifique se a aceleração gráfica está ativa e abra o projeto pelo Live Server. Use uma versão atual do Chrome, Edge ou Firefox.';
  ['generate', 'export', 'toggle-rotation', 'reset-camera'].forEach((id) => { $(id).disabled = true; });
}
