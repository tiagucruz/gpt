import { criarMusica } from './music.js';

// Efeitos originais sintetizados com Web Audio: nenhum arquivo ou serviço externo.
// Cada nota: frequência, duração, atraso, intensidade, tipo, frequência final.
const EFEITOS = {
  coleta: [[880, 0.12, 0, 0.22], [1320, 0.18, 0.065, 0.16]],
  passo: [[160, 0.055, 0, 0.07, 'sine', 85]],
  colisao: [[210, 0.2, 0, 0.25, 'triangle', 65], [95, 0.12, 0.07, 0.14]],
  tempo: [[330, 0.18, 0, 0.2, 'triangle'], [262, 0.18, 0.15, 0.2, 'triangle'], [165, 0.3, 0.3, 0.2, 'triangle']],
  alerta: [[880, 0.08, 0, 0.13]],
  inicio: [[523, 0.1, 0, 0.14], [784, 0.16, 0.08, 0.14]],
  fase: [[523, 0.16, 0, 0.2], [659, 0.16, 0.12, 0.2], [784, 0.18, 0.24, 0.2], [1047, 0.35, 0.38, 0.18]],
  final: [[523, 0.18, 0, 0.2], [659, 0.18, 0.13, 0.2], [784, 0.2, 0.26, 0.2], [1047, 0.24, 0.4, 0.2], [988, 0.18, 0.65, 0.18], [784, 0.18, 0.8, 0.18], [1175, 0.2, 0.94, 0.18], [1047, 0.5, 1.1, 0.2]],
};

export function sintetizarEfeito(contexto, destino, nome) {
  return (EFEITOS[nome] ?? []).map(([frequencia, duracao, atraso, intensidade, tipo = 'sine', frequenciaFinal]) => {
    const inicio = contexto.currentTime + atraso;
    const oscilador = contexto.createOscillator();
    const envelope = contexto.createGain();
    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frequencia, inicio);
    if (frequenciaFinal) oscilador.frequency.exponentialRampToValueAtTime(frequenciaFinal, inicio + duracao);
    envelope.gain.setValueAtTime(0, inicio);
    envelope.gain.linearRampToValueAtTime(intensidade, inicio + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    envelope.gain.setValueAtTime(0, inicio + duracao + 0.01);
    oscilador.connect(envelope);
    envelope.connect(destino);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracao + 0.02);
    return { oscilador, envelope };
  });
}

export function criarSons() {
  const CHAVE = 'orbita.audio.v1';
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let disponivel = Boolean(AudioContext);
  let ativo = true;
  let volume = 0.4;
  let musicaAtiva = true;
  let volumeMusica = 0.25;
  let musicaDisponivel = disponivel && Boolean(window.OfflineAudioContext || window.webkitOfflineAudioContext);
  let musica = null;
  let contexto = null;
  let master = null;
  const vozes = new Set();
  const botoes = [...document.querySelectorAll('[data-sound-toggle]')];
  const controleVolume = document.querySelector('#sound-volume');
  const botoesMusica = [...document.querySelectorAll('[data-music-toggle]')];
  const controleMusica = document.querySelector('#music-volume');

  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (typeof salvo?.ativo === 'boolean') ativo = salvo.ativo;
    if (Number.isFinite(salvo?.volume)) volume = Math.max(0, Math.min(1, salvo.volume));
    if (typeof salvo?.musicaAtiva === 'boolean') musicaAtiva = salvo.musicaAtiva;
    if (Number.isFinite(salvo?.volumeMusica)) volumeMusica = Math.max(0, Math.min(1, salvo.volumeMusica));
  } catch { /* O jogo também funciona sem acesso ao armazenamento. */ }

  function atualizarControles() {
    for (const botao of botoes) {
      botao.disabled = !disponivel;
      botao.textContent = !disponivel ? 'Efeitos indisponíveis' : ativo ? 'Efeitos ligados' : 'Efeitos desligados';
      botao.setAttribute('aria-pressed', String(ativo && disponivel));
      botao.setAttribute('aria-label', !disponivel ? 'Áudio indisponível neste navegador' : ativo ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros');
    }
    controleVolume.disabled = !disponivel;
    controleVolume.value = Math.round(volume * 100);
    controleVolume.setAttribute('aria-valuetext', `${Math.round(volume * 100)} por cento`);
    if (master) master.gain.setTargetAtTime(ativo ? volume : 0, contexto.currentTime, 0.01);
    for (const botao of botoesMusica) {
      botao.disabled = !disponivel || !musicaDisponivel;
      botao.textContent = botao.disabled ? 'Música indisponível' : musicaAtiva ? 'Música ligada' : 'Música desligada';
      botao.setAttribute('aria-pressed', String(musicaAtiva && !botao.disabled));
      botao.setAttribute('aria-label', botao.disabled ? 'Música indisponível neste navegador' : musicaAtiva ? 'Silenciar música de fundo' : 'Ativar música de fundo');
    }
    controleMusica.disabled = !disponivel || !musicaDisponivel;
    controleMusica.value = Math.round(volumeMusica * 100);
    controleMusica.setAttribute('aria-valuetext', `${Math.round(volumeMusica * 100)} por cento`);
    musica?.configurar(musicaAtiva && musicaDisponivel, volumeMusica);
  }

  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify({ ativo, volume, musicaAtiva, volumeMusica })); } catch { /* Preferência só nesta sessão. */ }
    atualizarControles();
  }

  function parar() {
    for (const voz of vozes) voz.oscilador.stop();
    // Libera imediatamente também as notas futuras de uma melodia cancelada.
    for (const voz of vozes) { voz.oscilador.disconnect(); voz.envelope.disconnect(); }
    vozes.clear();
  }

  async function liberar() {
    if (!disponivel || (!ativo && !(musicaAtiva && musicaDisponivel)) || document.hidden) return false;
    try {
      if (!contexto) {
        contexto = new AudioContext();
        master = contexto.createGain();
        master.gain.value = volume;
        master.connect(contexto.destination);
        if (musicaDisponivel) musica = criarMusica(contexto);
        atualizarControles();
      }
      if (contexto.state !== 'running') await contexto.resume();
      if (!document.hidden && musicaAtiva && musicaDisponivel) {
        void musica.preparar().catch(() => {
          musicaDisponivel = false;
          atualizarControles();
        });
      }
      return !document.hidden && contexto.state === 'running';
    } catch {
      disponivel = false;
      atualizarControles();
      return false;
    }
  }

  function tocar(nome) {
    // Não enfileira efeitos antigos enquanto o navegador bloqueia o áudio.
    if (!ativo || volume === 0 || document.hidden || contexto?.state !== 'running') return;
    for (const voz of sintetizarEfeito(contexto, master, nome)) {
      vozes.add(voz);
      voz.oscilador.onended = () => {
        voz.oscilador.disconnect();
        voz.envelope.disconnect();
        vozes.delete(voz);
      };
    }
  }

  for (const botao of botoes) botao.addEventListener('click', async () => {
    ativo = !ativo;
    if (!ativo) parar();
    salvar();
    if (ativo && await liberar()) tocar('inicio');
  });
  controleVolume.addEventListener('input', () => {
    volume = Number(controleVolume.value) / 100;
    salvar();
  });
  controleVolume.addEventListener('change', async () => {
    if (await liberar()) tocar('coleta');
  });
  for (const botao of botoesMusica) botao.addEventListener('click', async () => {
    musicaAtiva = !musicaAtiva;
    salvar();
    if (musicaAtiva) await liberar();
  });
  controleMusica.addEventListener('input', () => {
    volumeMusica = Number(controleMusica.value) / 100;
    salvar();
  });
  controleMusica.addEventListener('change', () => { void liberar(); });

  // A criação/retomada acontece dentro de interação, conforme a regra de autoplay.
  document.addEventListener('pointerdown', evento => { if (evento.isTrusted) void liberar(); }, { capture: true });
  document.addEventListener('keydown', evento => {
    if (evento.isTrusted && !evento.repeat && !evento.ctrlKey && !evento.altKey && !evento.metaKey) void liberar();
  }, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      parar();
      if (contexto?.state === 'running') void contexto.suspend().catch(() => {});
    } else if (contexto) void liberar();
  });
  window.addEventListener('pagehide', () => {
    parar();
    if (contexto?.state === 'running') void contexto.suspend().catch(() => {});
  });
  window.addEventListener('pageshow', () => { if (contexto) void liberar(); });
  atualizarControles();
  return { tocar, parar };
}
