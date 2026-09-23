import * as THREE from './vendor/three/three.module.js';

// Altura aproximada: 2,9 unidades. A cabeça ocupa cerca de 43% do total.
// Os pivôs dos membros já ficam nos ombros/quadris para a etapa de caminhada.
export function criarPersonagem() {
  const personagem = new THREE.Group();
  personagem.name = 'explorador';

  const material = (color, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness });
  const pele = material('#ffdabd');
  const roupa = material('#a6d7c9');
  const roxo = material('#8873b2');
  const sapato = material('#625573');
  const olhos = material('#343047', 0.4);
  const branco = material('#fffaf5');
  const rosa = material('#eda9a1');

  function adicionar(geometry, mat, parent, x, y, z) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const esfera = (raio) => new THREE.SphereGeometry(raio, 32, 24);
  adicionar(new THREE.CapsuleGeometry(0.39, 0.38, 8, 24), roupa, personagem, 0, 1.2, 0);
  adicionar(new THREE.CylinderGeometry(0.34, 0.37, 0.24, 24), roxo, personagem, 0, 0.8, 0);

  const cabeca = adicionar(esfera(0.63), pele, personagem, 0, 2.16, 0);
  cabeca.name = 'cabeca';
  // O rosto aponta para +Z, voltado para a câmera.
  for (const lado of [-1, 1]) {
    adicionar(esfera(0.075), olhos, personagem, lado * 0.205, 2.19, 0.59);
    adicionar(esfera(0.021), branco, personagem, lado * 0.205 - 0.017, 2.215, 0.653);
    const bochecha = adicionar(esfera(0.09), rosa, personagem, lado * 0.35, 2.04, 0.522);
    bochecha.scale.set(1, 0.5, 0.3);
    adicionar(esfera(0.12), pele, personagem, lado * 0.61, 2.14, 0);
  }
  adicionar(esfera(0.065), pele, personagem, 0, 2.06, 0.62);

  // Touca arredondada: deixa olhos e bochechas visíveis.
  adicionar(new THREE.SphereGeometry(0.654, 32, 20, 0, Math.PI * 2, 0, 1.18), roxo, personagem, 0, 2.16, 0);
  adicionar(esfera(0.13), roupa, personagem, 0, 2.86, 0);

  const membros = {};
  for (const lado of [-1, 1]) {
    const nome = lado < 0 ? 'Esquerdo' : 'Direito';
    const braco = new THREE.Group();
    braco.position.set(lado * 0.43, 1.43, 0);
    braco.rotation.z = lado * 0.13;
    personagem.add(braco);
    adicionar(new THREE.CapsuleGeometry(0.16, 0.24, 6, 16), roupa, braco, lado * 0.06, -0.2, 0);
    adicionar(esfera(0.155), pele, braco, lado * 0.085, -0.42, 0.01);
    membros[`braco${nome}`] = braco;

    const perna = new THREE.Group();
    perna.position.set(lado * 0.21, 0.78, 0);
    personagem.add(perna);
    adicionar(new THREE.CapsuleGeometry(0.18, 0.24, 6, 16), pele, perna, 0, -0.26, 0);
    const pe = adicionar(esfera(0.22), sapato, perna, 0, -0.6, 0.075);
    pe.scale.set(0.95, 0.8, 1.3);
    membros[`perna${nome}`] = perna;
  }
  adicionar(esfera(0.06), branco, personagem, 0, 1.4, 0.39);
  personagem.userData.membros = membros;
  return personagem;
}
