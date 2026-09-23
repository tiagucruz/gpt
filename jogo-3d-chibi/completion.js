// Tela modal: mantém o foco no resultado enquanto a partida está congelada.
export function criarTelaConclusao({ aoContinuar, aoReiniciar, dialog = document.querySelector('#completion-dialog') }) {
  const botao = dialog.querySelector('#completion-action');
  let final = false;
  const texto = (seletor, valor) => { dialog.querySelector(seletor).textContent = valor; };

  function fechar() {
    if (dialog.open) dialog.close();
  }

  function mostrar({ numero, totalFases, coletados, tempoRestante, totalCristais, final: terminou }) {
    final = terminou;
    dialog.classList.toggle('all-complete', final);
    texto('#completion-eyebrow', final ? 'AVENTURA COMPLETA' : `FASE ${numero} DE ${totalFases}`);
    texto('#completion-title', final ? 'Todas as fases concluídas!' : 'Fase concluída!');
    texto('#completion-description', final ?
      'Você explorou todos os cenários e encontrou cada cristal. Uma nova volta começa quando quiser.' :
      `Você coletou os ${coletados} cristais. A próxima fase está pronta para explorar.`);
    texto('#completion-stat-label', final ? 'FASES CONCLUÍDAS' : 'TEMPO RESTANTE');
    texto('#completion-stat-value', final ? `${totalFases}/${totalFases}` : `${Math.ceil(tempoRestante)} s`);
    texto('#completion-crystals', final ? totalCristais : coletados);
    botao.textContent = final ? 'Jogar novamente' : `Ir para a fase ${numero + 1}`;
    botao.disabled = false;
    if (!dialog.open) dialog.showModal();
    botao.focus({ preventScroll: true });
  }

  // A saída desta tela sempre passa pela ação explícita de continuar/recomeçar.
  dialog.addEventListener('cancel', evento => evento.preventDefault());
  botao.addEventListener('click', () => {
    if (botao.disabled || !dialog.open) return;
    botao.disabled = true;
    const mudou = final ? aoReiniciar() : aoContinuar();
    if (mudou) fechar();
    else botao.disabled = false;
  });
  return { mostrar, fechar };
}
