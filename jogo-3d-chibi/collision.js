import * as THREE from './vendor/three/three.module.js';

// Os centros lógicos ficam na mesma altura neste jogo de movimento no plano X/Z.
// Comparar distâncias ao quadrado equivale a distância < soma dos raios.
export function esferasColidem(centroA, raioA, centroB, raioB) {
  return centroA.distanceToSquared(centroB) < (raioA + raioB) ** 2;
}

export function criarObstaculo(raio = 0.75, cor = '#de8279') {
  const obstaculo = new THREE.Group();
  obstaculo.name = 'obstaculo';
  obstaculo.userData.raio = raio;
  const esfera = new THREE.Mesh(
    new THREE.SphereGeometry(raio, 32, 24),
    new THREE.MeshStandardMaterial({ color: cor, roughness: 0.65 }),
  );
  esfera.position.y = raio;
  esfera.castShadow = true;
  esfera.receiveShadow = true;
  obstaculo.add(esfera);
  return obstaculo;
}
