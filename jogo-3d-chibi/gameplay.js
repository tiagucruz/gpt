import { esferasColidem } from './collision.js';

export function atualizarObstaculos(fase, tempo) {
  const { obstaculosMoveis, amplitudeDoMovimento, velocidadeDosObstaculos } = fase.config;
  if (!obstaculosMoveis || amplitudeDoMovimento === 0) return;
  // Velocidade máxima em unidades/segundo; a amplitude cabe na folga do layout.
  const deslocamento = amplitudeDoMovimento * Math.sin(tempo * velocidadeDosObstaculos / amplitudeDoMovimento);
  for (const obstaculo of fase.obstaculos) {
    obstaculo.position.copy(obstaculo.userData.origem)
      .addScaledVector(obstaculo.userData.direcao, deslocamento);
  }
}

export function criarPartida({ fases, movimento, personagem, raioPersonagem, totalFases }) {
  if (!Number.isInteger(totalFases) || totalFases < 1) throw new RangeError('Quantidade de fases inválida.');
  let fase;
  let estado = 'aguardando';
  let coletados = 0;
  let tempoRestante = 0;
  let tempoDecorrido = 0;

  function iniciar(numero) {
    fase = fases.carregarFase(numero);
    movimento.reiniciar();
    coletados = 0;
    tempoDecorrido = 0;
    tempoRestante = fase.config.tempoLimite;
    estado = 'jogando';
    return fase;
  }

  function perder(motivo) {
    iniciar(fase.numero);
    return { tipo: 'derrota', motivo };
  }

  function avancar() {
    // Só permite um avanço por vitória; nunca tenta carregar uma fase 6.
    if (estado !== 'concluida' || fase.numero >= totalFases) return null;
    return iniciar(fase.numero + 1);
  }

  function atualizar(delta) {
    if (!Number.isFinite(delta) || delta < 0) throw new RangeError('Intervalo de tempo inválido.');
    if (estado !== 'jogando') return null;
    // O cronômetro usa tempo real, mesmo quando um quadro demora para renderizar.
    // A derrota tem prioridade se o prazo já acabou ao processar o quadro.
    tempoRestante = Math.max(0, tempoRestante - delta);
    if (tempoRestante === 0) return perder('tempo');

    tempoDecorrido += delta;
    atualizarObstaculos(fase, tempoDecorrido);
    movimento.atualizar(Math.min(delta, 0.05));
    if (fase.obstaculos.some(obstaculo => esferasColidem(
      personagem.position, raioPersonagem, obstaculo.position, obstaculo.userData.raio,
    ))) return perder('colisao');

    let novosItens = 0;
    for (const item of fase.itens) {
      if (item.userData.coletado || !esferasColidem(personagem.position, raioPersonagem, item.position, item.userData.raio)) continue;
      item.userData.coletado = true;
      item.visible = false;
      // Mantém no grupo para liberar geometria e material no próximo carregamento.
      coletados++;
      novosItens++;
    }
    if (coletados === fase.itens.length) {
      const final = fase.numero === totalFases;
      estado = final ? 'finalizada' : 'concluida';
      movimento.parar();
      return { tipo: 'vitoria', final };
    }
    return novosItens ? { tipo: 'coleta', quantidade: novosItens } : null;
  }

  return {
    iniciar, atualizar, avancar,
    get fase() { return fase; },
    get estado() { return estado; },
    get coletados() { return coletados; },
    get tempoRestante() { return tempoRestante; },
  };
}
