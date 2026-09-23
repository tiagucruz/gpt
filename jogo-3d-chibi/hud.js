export function formatarTempo(segundos) {
  const total = Math.max(0, Math.ceil(segundos));
  const minutos = String(Math.floor(total / 60)).padStart(2, '0');
  const resto = String(total % 60).padStart(2, '0');
  return `${minutos}:${resto}`;
}

export function criarHUD(elemento = document.querySelector('#hud')) {
  const buscar = seletor => elemento.querySelector(seletor);
  const fase = buscar('#hud-phase');
  const tempo = buscar('#hud-time');
  const cristais = buscar('#hud-items');
  const cartaoTempo = buscar('#hud-time-card');
  const rotuloTempo = buscar('#hud-time-label');
  const barraTempo = buscar('#hud-time-fill');
  const barraItens = buscar('#hud-items-fill');
  const estadoFase = buscar('#hud-phase-state');
  const anuncio = buscar('#hud-announcement');
  let anterior = null;

  const escrever = (destino, valor) => {
    if (destino.textContent !== valor) destino.textContent = valor;
  };

  function atualizar(partida, totalFases) {
    const { numero, config } = partida.fase;
    const segundos = Math.max(0, partida.tempoRestante);
    const poucoTempo = segundos <= 10 && partida.estado === 'jogando';
    const concluida = partida.estado === 'concluida' || partida.estado === 'finalizada';
    escrever(fase, `${numero} / ${totalFases}`);
    escrever(tempo, formatarTempo(segundos));
    escrever(cristais, `${partida.coletados} / ${config.numeroDeItens}`);
    escrever(estadoFase, concluida ? 'Concluída' : 'Em andamento');
    escrever(rotuloTempo, poucoTempo ? 'POUCO TEMPO' : 'TEMPO RESTANTE');
    cartaoTempo.classList.toggle('is-urgent', poucoTempo);
    const restante = Math.min(1, segundos / config.tempoLimite);
    const progresso = Math.min(1, partida.coletados / config.numeroDeItens);
    barraTempo.style.transform = `scaleX(${restante})`;
    barraItens.style.transform = `scaleX(${progresso})`;

    // Anuncia mudanças relevantes sem ler o cronômetro a cada segundo.
    let mensagem = '';
    if (!concluida) {
      if (!anterior || anterior.numero !== numero) mensagem = `Fase ${numero} de ${totalFases}. ${config.numeroDeItens} cristais para coletar.`;
      else if (anterior.coletados !== partida.coletados) mensagem = `${partida.coletados} de ${config.numeroDeItens} cristais coletados.`;
      if (poucoTempo && !anterior?.poucoTempo) mensagem += ' Restam dez segundos ou menos.';
    }
    if (mensagem || concluida) escrever(anuncio, mensagem.trim());
    anterior = { numero, coletados: partida.coletados, poucoTempo };
  }
  return { atualizar };
}
