import * as THREE from './vendor/three/three.module.js';
import { criarPersonagem } from './character.js';
import { criarMovimento } from './movement.js';
import { FASES, RAIO_PERSONAGEM, criarGerenciadorDeFases } from './levels.js';
import { criarPartida } from './gameplay.js';
import { criarTelaConclusao } from './completion.js';
import { criarHUD } from './hud.js';
import { criarSons } from './sound.js';

const canvas = document.querySelector('#scene');

function iniciarCena() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f5f3fa');

  // Vista superior inclinada para preservar a leitura do rosto e do volume.
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(5, 15, 11);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight('#ffffff', '#b9a7c9', 2.5));
  const sol = new THREE.DirectionalLight('#fff5e9', 3);
  sol.position.set(-4, 10, 5);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 30 });
  sol.shadow.normalBias = 0.035;
  sol.shadow.bias = -0.0001;
  sol.shadow.radius = 4;
  scene.add(sol);

  const fundo = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#f5f3fa', roughness: 1 }),
  );
  fundo.rotation.x = -Math.PI / 2;
  fundo.position.y = -0.38;
  fundo.receiveShadow = true;
  scene.add(fundo);

  const chao = new THREE.Mesh(
    new THREE.CylinderGeometry(5.5, 5.5, 0.32, 96),
    new THREE.MeshStandardMaterial({ color: '#d7c9e8', roughness: 0.95 }),
  );
  chao.position.y = -0.16;
  chao.castShadow = true;
  chao.receiveShadow = true;
  scene.add(chao);

  function adicionarAnel(raio, espessura, cor) {
    const anel = new THREE.Mesh(
      new THREE.RingGeometry(raio - espessura, raio, 96),
      new THREE.MeshBasicMaterial({ color: cor }),
    );
    anel.rotation.x = -Math.PI / 2;
    anel.position.y = 0.007;
    scene.add(anel);
  }
  adicionarAnel(5.3, 0.025, '#ede6f6');
  adicionarAnel(4.8, 0.012, '#e5dcef');
  adicionarAnel(1.1, 0.018, '#ede6f6');

  const personagem = criarPersonagem();
  // Alinha o rosto com a câmera; posição no centro do plano X/Z.
  personagem.rotation.y = Math.atan2(camera.position.x, camera.position.z);
  scene.add(personagem);
  const movimento = criarMovimento(personagem, camera);
  const raioPersonagem = RAIO_PERSONAGEM;
  const fases = criarGerenciadorDeFases(scene);
  const partida = criarPartida({ fases, movimento, personagem, raioPersonagem, totalFases: FASES.length });
  const avisoColisao = document.querySelector('#collision-feedback');
  const hud = criarHUD();
  const sons = criarSons();
  const posicaoAntesDoMovimento = new THREE.Vector3();
  let tempoPassos = 0;
  let ultimoSegundo = null;
  let tempoAviso = 0;
  let mostrarCaminhos = false;
  let tempoAnterior = null;
  const telaConclusao = criarTelaConclusao({
    aoContinuar: () => {
      if (!partida.avancar()) return false;
      prepararFase();
      sons.tocar('inicio');
      return true;
    },
    aoReiniciar: () => {
      if (partida.estado !== 'finalizada') return false;
      carregarFase(1);
      sons.tocar('inicio');
      return true;
    },
  });

  function atualizarCenario() {
    const fase = partida.fase;
    chao.material.color.copy(fase.layout.paleta.piso);
    fase.caminhosVisuais.visible = mostrarCaminhos;
    document.querySelectorAll('[data-phase]').forEach(marcador => {
      const numero = Number(marcador.dataset.phase);
      const concluida = numero < fase.numero || (numero === fase.numero && partida.estado !== 'jogando');
      marcador.dataset.status = concluida ? 'concluida' : numero === fase.numero ? 'atual' : 'pendente';
      marcador.setAttribute('aria-label', `Fase ${numero}: ${concluida ? 'concluída' : numero === fase.numero ? 'atual' : 'pendente'}`);
      if (numero === fase.numero) marcador.setAttribute('aria-current', 'step');
      else marcador.removeAttribute('aria-current');
    });
  }

  function atualizarHUD() {
    hud.atualizar(partida, FASES.length);
  }

  function carregarFase(numero) {
    partida.iniciar(numero);
    telaConclusao.fechar();
    prepararFase();
  }

  function prepararFase() {
    sons.parar();
    tempoPassos = 0;
    ultimoSegundo = null;
    tempoAnterior = null;
    tempoAviso = 0;
    avisoColisao.hidden = true;
    atualizarCenario();
    atualizarHUD();
  }

  function mostrarResultado(evento) {
    if (evento.tipo === 'vitoria') {
      atualizarCenario();
      tempoAviso = 0;
      avisoColisao.hidden = true;
      telaConclusao.mostrar({
        numero: partida.fase.numero, totalFases: FASES.length,
        coletados: partida.coletados, tempoRestante: partida.tempoRestante,
        totalCristais: FASES.reduce((total, fase) => total + fase.numeroDeItens, 0),
        final: evento.final,
      });
      return;
    }
    document.querySelector('#result-title').textContent =
      evento.motivo === 'tempo' ? 'O tempo acabou! Fase reiniciada.' : 'Encostou! Fase reiniciada.';
    document.querySelector('#result-description').textContent =
      'Cristais e tempo restaurados. Solte e pressione uma direção para tentar de novo.';
    tempoAviso = 3;
    avisoColisao.hidden = false;
  }

  const progresso = document.querySelector('#phase-progress');
  FASES.forEach((_, indice) => {
    const marcador = document.createElement('li');
    marcador.textContent = indice + 1;
    marcador.dataset.phase = indice + 1;
    marcador.setAttribute('aria-label', `Fase ${indice + 1}`);
    progresso.append(marcador);
  });
  document.querySelector('#reload-phase').addEventListener('click', () => {
    carregarFase(fases.atual.numero);
    sons.tocar('inicio');
  });
  document.querySelector('#toggle-paths').addEventListener('click', (evento) => {
    mostrarCaminhos = !mostrarCaminhos;
    fases.atual.caminhosVisuais.visible = mostrarCaminhos;
    evento.currentTarget.setAttribute('aria-pressed', String(mostrarCaminhos));
  });
  carregarFase(1);

  function redimensionar() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const aspect = width / height;
    // Reserva espaço para os textos e mantém o piso inteiro em telas estreitas.
    const compacto = window.innerWidth <= 1000;
    const altura = Math.max(compacto ? 10.8 : 17, (compacto ? 12 : 13) / aspect);
    camera.left = -altura * aspect / 2;
    camera.right = altura * aspect / 2;
    const deslocamentoVertical = compacto ? 0.35 : 0.9;
    camera.top = altura / 2 + deslocamentoVertical;
    camera.bottom = -altura / 2 + deslocamentoVertical;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
  }

  new ResizeObserver(redimensionar).observe(canvas);
  window.addEventListener('resize', redimensionar);
  redimensionar();

  document.addEventListener('visibilitychange', () => { tempoAnterior = null; });
  renderer.setAnimationLoop((tempo) => {
    // Pausa explícita em aba oculta; voltar não desconta o tempo fora do jogo.
    if (document.hidden) { tempoAnterior = null; return; }
    const delta = tempoAnterior === null ? 0 : Math.max(0, (tempo - tempoAnterior) / 1000);
    tempoAnterior = tempo;
    tempoAviso = Math.max(0, tempoAviso - delta);
    posicaoAntesDoMovimento.copy(personagem.position);
    const evento = partida.atualizar(delta);
    const terminouTentativa = evento?.tipo === 'derrota' || evento?.tipo === 'vitoria';
    if (terminouTentativa) {
      sons.parar();
      tempoPassos = 0;
      ultimoSegundo = null;
      sons.tocar(evento.tipo === 'vitoria' ? (evento.final ? 'final' : 'fase') :
        (evento.motivo === 'tempo' ? 'tempo' : 'colisao'));
    } else if (evento?.tipo === 'coleta') sons.tocar('coleta');
    if (partida.estado === 'jogando' && !terminouTentativa) {
      const andando = personagem.position.distanceToSquared(posicaoAntesDoMovimento) > 1e-10;
      tempoPassos = andando ? tempoPassos + Math.min(delta, 0.05) : 0;
      if (tempoPassos >= 0.28) { sons.tocar('passo'); tempoPassos = 0; }
      const segundo = Math.ceil(partida.tempoRestante);
      if (segundo !== ultimoSegundo && (segundo === 10 || (segundo >= 1 && segundo <= 5))) sons.tocar('alerta');
      ultimoSegundo = segundo;
    }
    if (evento?.tipo === 'derrota') atualizarCenario();
    if (evento?.tipo === 'derrota' || evento?.tipo === 'vitoria') {
      mostrarResultado(evento);
    }
    atualizarHUD();
    avisoColisao.hidden = tempoAviso === 0;
    renderer.render(scene, camera);
  });
}

try {
  iniciarCena();
} catch (error) {
  console.error('Não foi possível iniciar a cena 3D:', error);
  const aviso = document.querySelector('#scene-error');
  aviso.hidden = false;
  aviso.textContent = 'Não foi possível iniciar o 3D. Abra este projeto pelo Live Server e confira se a aceleração gráfica está habilitada no navegador.';
}
