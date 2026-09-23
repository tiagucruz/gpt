import * as THREE from './vendor/three/three.module.js';

class ErroDeDistribuicao extends Error {}

// A mesma semente reproduz a mesma sequência pseudoaleatória.
export function criarAleatorio(seed) {
  let estado = seed >>> 0;
  return () => {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let valor = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), 61 | valor);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  };
}

// Amostragem uniforme por área, seguida de rejeição por distância e regra externa.
export function gerarPosicoes(seed, { quantidade, raioMinimo, raioMaximo, distanciaMinima, aceitar = () => true }) {
  if (!Number.isInteger(seed) || !Number.isInteger(quantidade) || quantidade < 0 ||
      ![raioMinimo, raioMaximo, distanciaMinima].every(Number.isFinite) ||
      raioMinimo < 0 || raioMaximo <= raioMinimo || distanciaMinima < 0) {
    throw new RangeError('Semente ou parâmetros de distribuição inválidos.');
  }
  const aleatorio = criarAleatorio(seed);
  const posicoes = [];
  for (let tentativa = 0; tentativa < 5000 && posicoes.length < quantidade; tentativa++) {
    const angulo = aleatorio() * Math.PI * 2;
    const raio = Math.sqrt(raioMinimo ** 2 + aleatorio() * (raioMaximo ** 2 - raioMinimo ** 2));
    const ponto = new THREE.Vector3(Math.cos(angulo) * raio, 0, Math.sin(angulo) * raio);
    if (posicoes.every(outro => ponto.distanceToSquared(outro) >= distanciaMinima ** 2) && aceitar(ponto)) posicoes.push(ponto);
  }
  if (posicoes.length !== quantidade) throw new ErroDeDistribuicao('Não há espaço para os parâmetros deste layout.');
  return posicoes;
}

// Regra de conexão da composição: liga o ponto ainda isolado mais próximo
// à rede existente (árvore geradora mínima, algoritmo de Prim).
export function conectarPontos(pontos) {
  if (pontos.length < 2) return [];
  const conectados = new Set([0]);
  const caminhos = [];
  while (conectados.size < pontos.length) {
    let melhor = null;
    for (const de of conectados) {
      for (let para = 0; para < pontos.length; para++) {
        if (conectados.has(para)) continue;
        const distancia = pontos[de].distanceToSquared(pontos[para]);
        if (!melhor || distancia < melhor.distancia) melhor = { de, para, distancia };
      }
    }
    caminhos.push({ inicio: pontos[melhor.de].clone(), fim: pontos[melhor.para].clone() });
    conectados.add(melhor.para);
  }
  return caminhos;
}

export function distanciaAoCaminho(ponto, { inicio, fim }) {
  const dx = fim.x - inicio.x;
  const dz = fim.z - inicio.z;
  const comprimento2 = dx * dx + dz * dz;
  const t = comprimento2 === 0 ? 0 : THREE.MathUtils.clamp(
    ((ponto.x - inicio.x) * dx + (ponto.z - inicio.z) * dz) / comprimento2, 0, 1,
  );
  return Math.hypot(ponto.x - inicio.x - t * dx, ponto.z - inicio.z - t * dz);
}

export function gerarLayout(seed, config) {
  if (!Number.isInteger(seed)) throw new RangeError('Semente inválida.');
  const { numeroDeItens, numeroDeObstaculos, dispersao, areaInicialLivre,
    separacao, raioDoObstaculo, raioDoItem, raioPersonagem, margemDoCaminho,
    amplitudeDoMovimento, obstaculosMoveis } = config;
  if (![raioDoObstaculo, raioDoItem, raioPersonagem, margemDoCaminho, amplitudeDoMovimento].every(valor => Number.isFinite(valor) && valor >= 0)) {
    throw new RangeError('Raios e margens devem ser números finitos não negativos.');
  }
  const amplitude = obstaculosMoveis ? amplitudeDoMovimento : 0;
  const folga = raioPersonagem + raioDoObstaculo + margemDoCaminho + amplitude;
  const aleatorio = criarAleatorio(seed);
  // Se os obstáculos não couberem, tenta outra composição da mesma sequência.
  // Nunca aceita uma composição insegura nem usa Math.random como alternativa.
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const seedItens = Math.floor(aleatorio() * 4294967296);
    const seedObstaculos = Math.floor(aleatorio() * 4294967296);
    try {
      const itens = gerarPosicoes(seedItens, {
        quantidade: numeroDeItens, raioMinimo: areaInicialLivre,
        raioMaximo: dispersao, distanciaMinima: separacao,
      });
      const caminhos = conectarPontos([new THREE.Vector3(), ...itens]);
      const obstaculos = gerarPosicoes(seedObstaculos, {
        quantidade: numeroDeObstaculos,
        raioMinimo: Math.max(areaInicialLivre, folga),
        raioMaximo: dispersao - amplitude,
        distanciaMinima: Math.max(separacao, 2 * (raioDoObstaculo + amplitude) + margemDoCaminho),
        aceitar: ponto => caminhos.every(caminho => distanciaAoCaminho(ponto, caminho) >= folga) &&
          itens.every(item => ponto.distanceTo(item) >= raioDoItem + raioDoObstaculo + amplitude + margemDoCaminho),
      });
      // Paleta derivada da semente, preservando a identidade de cada tipo.
      const cores = criarAleatorio(seed ^ 0x51F15E);
      const paleta = {
        piso: new THREE.Color().setHSL(0.70 + cores() * 0.08, 0.3, 0.84, THREE.SRGBColorSpace),
        item: new THREE.Color().setHSL(0.40 + cores() * 0.07, 0.43, 0.48, THREE.SRGBColorSpace),
        obstaculo: new THREE.Color().setHSL(0.015 + cores() * 0.025, 0.58, 0.66, THREE.SRGBColorSpace),
      };
      return { itens, obstaculos, caminhos, paleta };
    } catch (error) {
      if (!(error instanceof ErroDeDistribuicao)) throw error;
    }
  }
  throw new Error('Não foi possível gerar caminhos livres com estes parâmetros.');
}
