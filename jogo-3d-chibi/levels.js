import * as THREE from './vendor/three/three.module.js';
import { criarObstaculo } from './collision.js';
import { criarAleatorio, gerarLayout } from './layout.js';

export const RAIO_PERSONAGEM = 0.6;

// Dificuldade crescente por parâmetros. Medições em BALANCEAMENTO.md.
// Tempo, quantidades e movimento usam a mesma lógica em todas as fases.
export const FASES = Object.freeze([
  { seed: 104729, numeroDeItens: 3, numeroDeObstaculos: 2, tempoLimite: 45, obstaculosMoveis: false, velocidadeDosObstaculos: 0 },
  { seed: 130363, numeroDeItens: 4, numeroDeObstaculos: 3, tempoLimite: 40, obstaculosMoveis: false, velocidadeDosObstaculos: 0 },
  { seed: 155921, numeroDeItens: 5, numeroDeObstaculos: 4, tempoLimite: 35, obstaculosMoveis: false, velocidadeDosObstaculos: 0 },
  { seed: 180503, numeroDeItens: 6, numeroDeObstaculos: 5, tempoLimite: 32, obstaculosMoveis: true, velocidadeDosObstaculos: 0.5 },
  { seed: 205019, numeroDeItens: 7, numeroDeObstaculos: 6, tempoLimite: 30, obstaculosMoveis: true, velocidadeDosObstaculos: 0.75 },
].map(fase => Object.freeze({
  ...fase, dispersao: 4.4, areaInicialLivre: 1.9, separacao: 1.45,
  raioDoObstaculo: 0.55, raioDoItem: 0.22, raioPersonagem: RAIO_PERSONAGEM,
  margemDoCaminho: 0.15, amplitudeDoMovimento: fase.obstaculosMoveis ? 0.3 : 0,
})));

function criarItem(raio, cor) {
  const item = new THREE.Group();
  item.name = 'cristal';
  item.userData.raio = raio;
  const cristal = new THREE.Mesh(
    new THREE.OctahedronGeometry(raio),
    new THREE.MeshStandardMaterial({ color: cor, roughness: 0.4, metalness: 0.15 }),
  );
  cristal.scale.y = 1.6;
  cristal.position.y = raio * 1.6 + 0.1;
  cristal.castShadow = true;
  item.add(cristal);
  return item;
}

function descartarGrupo(grupo) {
  grupo.removeFromParent();
  grupo.traverse(objeto => {
    objeto.geometry?.dispose();
    if (Array.isArray(objeto.material)) objeto.material.forEach(material => material.dispose());
    else objeto.material?.dispose();
  });
  grupo.clear();
}

export function criarGerenciadorDeFases(scene) {
  let atual = null;
  function carregarFase(numero) {
    if (!Number.isInteger(numero) || numero < 1 || numero > FASES.length) {
      throw new RangeError('A fase deve ser um número inteiro entre 1 e 5.');
    }
    const config = FASES[numero - 1];
    // Gera antes de substituir: falhas de configuração preservam o cenário atual.
    const layout = gerarLayout(config.seed, config);
    const grupo = new THREE.Group();
    grupo.name = `fase-${numero}`;
    const obstaculos = [];
    const itens = [];
    const aleatorioMovimento = criarAleatorio(config.seed ^ 0x41A7C3);
    layout.obstaculos.forEach(posicao => {
      const objeto = criarObstaculo(config.raioDoObstaculo, layout.paleta.obstaculo);
      objeto.position.copy(posicao);
      const angulo = aleatorioMovimento() * Math.PI * 2;
      objeto.userData.origem = posicao.clone();
      objeto.userData.direcao = new THREE.Vector3(Math.cos(angulo), 0, Math.sin(angulo));
      grupo.add(objeto);
      obstaculos.push(objeto);
    });
    layout.itens.forEach(posicao => {
      const objeto = criarItem(config.raioDoItem, layout.paleta.item);
      objeto.userData.coletado = false;
      objeto.position.copy(posicao);
      grupo.add(objeto);
      itens.push(objeto);
    });
    const pontosDosCaminhos = layout.caminhos.flatMap(({ inicio, fim }) => [
      new THREE.Vector3(inicio.x, 0.015, inicio.z), new THREE.Vector3(fim.x, 0.015, fim.z),
    ]);
    const caminhosVisuais = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pontosDosCaminhos),
      new THREE.LineBasicMaterial({ color: '#fff9e6', transparent: true, opacity: 0.85 }),
    );
    caminhosVisuais.visible = false;
    grupo.add(caminhosVisuais);
    if (atual) descartarGrupo(atual.grupo);
    scene.add(grupo);
    atual = { numero, config, grupo, obstaculos, itens, layout, caminhosVisuais };
    return atual;
  }
  return { carregarFase, get atual() { return atual; } };
}
