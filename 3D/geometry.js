// Matemática independente da renderização: mesma semente + parâmetros = mesma peça.
export function hashSeed(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed) {
  let state = hashSeed(seed);
  return () => {
    state += 0x6a09bf5;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function paletteForSeed(seed) {
  const random = seededRandom(`${seed}:palette`);
  const hue = Math.floor(random() * 360);
  const spread = 22 + random() * 24;
  const colors = Array.from({ length: 5 }, (_, i) => ({
    h: (hue + (i - 2) * spread * 0.5 + 360) % 360,
    s: 59 + random() * 23,
    l: 29 + i * 12,
  }));
  const names = ['Âmbar solar', 'Luz de outono', 'Jardim suspenso', 'Aurora mineral', 'Maré celeste', 'Horizonte azul', 'Sonho violeta', 'Rosa cósmica'];
  return { colors, name: names[Math.floor(((hue + 15) % 360) / 45)] };
}

export function generateGeometry({ seed, style, count, distortion }) {
  const random = seededRandom(`${seed}:geometry`);
  const tau = Math.PI * 2;
  const columns = 12;
  const rows = Math.round(count / columns);
  const phase = random() * tau;
  const phase2 = random() * tau;
  const wave = 2 + Math.floor(random() * 3);
  const d = distortion / 100;
  const positions = [];
  const connections = [];
  const major = 2.03 + random() * 0.35;
  const minor = 0.67 + random() * 0.13;

  for (let row = 0; row < rows; row++) {
    const u = row / rows * tau;
    for (let col = 0; col < columns; col++) {
      const v = col / columns * tau;
      const ripple = Math.sin(u * wave + phase) * Math.cos(v * 2 + phase2);
      let x, y, z;
      if (style === 'esfera') {
        // Latitudes afastadas dos polos evitam pontos sobrepostos nas extremidades.
        const latitude = (row + 0.5) / rows * Math.PI;
        const longitude = v + row * 0.14;
        const radius = 2.48 + d * 0.36 * Math.sin(latitude * wave + phase) * Math.cos(longitude * 3 + phase2);
        x = radius * Math.sin(latitude) * Math.cos(longitude);
        y = radius * Math.cos(latitude);
        z = radius * Math.sin(latitude) * Math.sin(longitude);
      } else if (style === 'espiral') {
        // Uma hélice ascendente com seção tubular e raio que pulsa ao longo da curva.
        const progress = row / (rows - 1);
        const angle = progress * tau * (2.1 + d * 0.55);
        const radius = 1.32 + Math.sin(progress * Math.PI) * 0.32;
        const tube = 0.39 + d * 0.16 * Math.sin(angle * 2 + phase);
        x = (radius + tube * Math.cos(v)) * Math.cos(angle);
        y = (progress - 0.5) * 5.5 + tube * Math.sin(v);
        z = (radius + tube * Math.cos(v)) * Math.sin(angle);
      } else {
        // Toro com seção torcida, ondulação periódica e continuidade em ambas as direções.
        const twist = v + u * 2;
        const radius = minor * (1 + d * 0.42 * ripple);
        const center = major + d * 0.27 * Math.sin(u * wave + phase);
        x = (center + radius * Math.cos(twist)) * Math.cos(u);
        y = radius * Math.sin(twist) * (1.1 + d * 0.5) + d * 0.5 * Math.sin(u * 3 + phase2);
        z = (center + radius * Math.cos(twist)) * Math.sin(u);
      }
      const jitter = d * 0.045;
      positions.push([x + (random() - 0.5) * jitter, y + (random() - 0.5) * jitter, z + (random() - 0.5) * jitter]);
      const index = row * columns + col;
      connections.push([index, row * columns + (col + 1) % columns]);
      if (row < rows - 1 || style === 'orbita') {
        const next = (row + 1) % rows * columns;
        connections.push([index, next + col]);
        if ((row + col) % 2 === 0) connections.push([index, next + (col + 1) % columns]);
      }
    }
  }
  return { positions, connections };
}
