import * as THREE from './vendor/three/three.module.js';

export function criarMovimento(personagem, camera, { velocidade = 3, raioDoPiso = 5.5 } = {}) {
  const teclas = new Set();
  const controles = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
  const deslocamentoCamera = camera.position.clone().sub(personagem.position);
  const frente = new THREE.Vector3(-deslocamentoCamera.x, 0, -deslocamentoCamera.z).normalize();
  const direita = new THREE.Vector3(-frente.z, 0, frente.x);
  const direcao = new THREE.Vector3();
  const anterior = new THREE.Vector3();
  const limite = raioDoPiso - 0.75;
  let tempoCaminhando = 0;
  const membros = personagem.userData.membros;

  function animar(andando, delta) {
    tempoCaminhando = andando ? tempoCaminhando + delta : 0;
    const balanco = andando ? Math.sin(tempoCaminhando * 11) * 0.5 : 0;
    membros.bracoEsquerdo.rotation.x = balanco;
    membros.bracoDireito.rotation.x = -balanco;
    membros.pernaEsquerdo.rotation.x = -balanco;
    membros.pernaDireito.rotation.x = balanco;
  }

  window.addEventListener('keydown', (evento) => {
    if (!controles.has(evento.code) || evento.ctrlKey || evento.altKey || evento.metaKey) return;
    if (evento.target instanceof Element && evento.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    evento.preventDefault(); // As setas controlam o personagem sem rolar a página.
    if (evento.repeat) return; // Após reiniciar, exige soltar e pressionar novamente.
    teclas.add(evento.code);
  });
  window.addEventListener('keyup', (evento) => {
    if (controles.has(evento.code)) teclas.delete(evento.code);
  });
  function parar() {
    teclas.clear();
    animar(false, 0);
  }
  window.addEventListener('blur', parar);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) parar();
  });

  const pressionada = (letra, seta) => Number(teclas.has(letra) || teclas.has(seta));

  function acompanharCamera() {
    camera.position.copy(personagem.position).add(deslocamentoCamera);
    camera.lookAt(personagem.position);
  }

  function reiniciar(posicao = new THREE.Vector3()) {
    parar();
    personagem.position.copy(posicao);
    personagem.rotation.y = Math.atan2(deslocamentoCamera.x, deslocamentoCamera.z);
    acompanharCamera();
  }

  function atualizar(delta) {
    const horizontal = pressionada('KeyD', 'ArrowRight') - pressionada('KeyA', 'ArrowLeft');
    const vertical = pressionada('KeyW', 'ArrowUp') - pressionada('KeyS', 'ArrowDown');
    direcao.copy(direita).multiplyScalar(horizontal).addScaledVector(frente, vertical);
    // A direção considera a câmera; normalizar evita acelerar nas diagonais.
    if (direcao.lengthSq() > 0) direcao.normalize();
    anterior.copy(personagem.position);
    personagem.position.addScaledVector(direcao, velocidade * delta);
    // Mantém o explorador sobre o piso, sem gravidade ou alteração no eixo Y.
    const distancia = Math.hypot(personagem.position.x, personagem.position.z);
    if (distancia > limite) {
      personagem.position.x *= limite / distancia;
      personagem.position.z *= limite / distancia;
    }
    const andando = personagem.position.distanceToSquared(anterior) > 1e-10;
    if (andando) personagem.rotation.y = Math.atan2(direcao.x, direcao.z);
    animar(andando, delta);
    acompanharCamera();
  }

  return { atualizar, reiniciar, parar };
}
