// Pequena composição original: 72 BPM, acordes suaves e melodia sem percussão.
// O segundo ciclo é recortado para preservar a cauda dos acordes na emenda do loop.
export async function gerarTrilha(contexto) {
  const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const amostras = Math.round(contexto.sampleRate * 32 * 60 / 72);
  const duracao = amostras / contexto.sampleRate;
  const batida = duracao / 32;
  const offline = new OfflineContext(1, amostras * 2, contexto.sampleRate);
  const filtro = offline.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 1800;
  filtro.Q.value = 0.5;
  filtro.connect(offline.destination);

  function nota(midi, inicio, comprimento, intensidade, ataque, tipo = 'sine') {
    const fonte = offline.createOscillator();
    const envelope = offline.createGain();
    fonte.type = tipo;
    fonte.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, inicio);
    envelope.gain.linearRampToValueAtTime(intensidade, inicio + ataque);
    envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + comprimento);
    envelope.gain.linearRampToValueAtTime(0, inicio + comprimento + 0.02);
    fonte.connect(envelope);
    envelope.connect(filtro);
    fonte.start(inicio);
    fonte.stop(inicio + comprimento + 0.03);
  }

  const acordes = [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]];
  const melodia = [72, 76, 79, 76, 72, 71, 69, null, 69, 72, 76, 72, 71, 74, 79, 74];
  for (let ciclo = 0; ciclo < 2; ciclo++) {
    const base = ciclo * duracao;
    acordes.forEach((acorde, indice) => {
      acorde.forEach(midi => nota(midi, base + indice * 8 * batida, 8 * batida + 0.7, 0.055, 0.5));
    });
    melodia.forEach((midi, indice) => {
      if (midi !== null) nota(midi, base + indice * 2 * batida, 1.7 * batida, 0.105, 0.018, 'triangle');
    });
  }

  const renderizado = await offline.startRendering();
  const buffer = contexto.createBuffer(1, amostras, contexto.sampleRate);
  buffer.copyToChannel(renderizado.getChannelData(0).subarray(amostras), 0);
  return buffer;
}

export function criarMusica(contexto) {
  const ganho = contexto.createGain();
  ganho.gain.value = 0;
  ganho.connect(contexto.destination);
  let ativa = false;
  let volume = 0.25;
  let preparacao = null;
  let fonte = null;

  function configurar(habilitada, novoVolume) {
    ativa = habilitada;
    volume = novoVolume;
    // Entrada/saída gradual. Silenciar mantém a posição da música.
    ganho.gain.setTargetAtTime(ativa ? volume : 0, contexto.currentTime, 0.12);
  }

  async function preparar() {
    if (!ativa || volume === 0 || fonte || contexto.state === 'closed') return;
    preparacao ??= gerarTrilha(contexto);
    const buffer = await preparacao;
    // Reconfere após gerar: o jogador pode ter silenciado ou trocado de aba.
    if (!ativa || volume === 0 || fonte || contexto.state !== 'running') return;
    fonte = contexto.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = true;
    fonte.connect(ganho);
    ganho.gain.cancelScheduledValues(contexto.currentTime);
    ganho.gain.setValueAtTime(0, contexto.currentTime);
    ganho.gain.setTargetAtTime(volume, contexto.currentTime, 0.35);
    fonte.start();
  }

  return { configurar, preparar };
}
