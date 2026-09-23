# Balanceamento final — etapa 9

Os ajustes ficam no array `FASES`, em `levels.js`. A dificuldade cresce por
quantidade de cristais, quantidade de obstáculos, tempo limite e velocidade
dos obstáculos móveis. As sementes e as margens de segurança foram preservadas.

| Fase | Cristais | Obstáculos | Tempo limite | Velocidade máxima dos obstáculos |
| --- | --- | --- | --- | --- |
| 1 | 3 | 2 | 45 s | Parados |
| 2 | 4 | 3 | 40 s | Parados |
| 3 | 5 | 4 | 35 s | Parados |
| 4 | 6 | 5 | 32 s | 0,50 unidade/s |
| 5 | 7 | 6 | 30 s | 0,75 unidade/s |

A primeira fase oferece mais tempo para aprender os controles. As seguintes
exigem percursos maiores com menos tempo disponível. A fase 4 introduz o movimento
já previsto na configuração; a fase 5 aumenta sua velocidade. A amplitude continua
em 0,3 unidade, dentro do espaço reservado pela geração para não bloquear as rotas.

## Como foi medido

Uma simulação no navegador percorreu os caminhos gerados a 3 unidades/segundo,
com dois segundos de espera inicial e pausas de 0,8 segundo na primeira chegada
a cada ponto de cristal. O controlador seguiu a árvore em profundidade, voltando
pelas conexões quando necessário. A posição avançou em pequenos passos contínuos;
a coleta, as colisões, o cronômetro e as transições usaram `gameplay.js`.

Também foi calculada uma referência conservadora de percurso:

`2 × comprimento total das conexões / 3 + 2 + 0,8 × número de cristais`

Ela inclui a ida e a volta de todas as conexões. A simulação termina antes disso:
a vitória ocorre ao entrar no raio do último cristal, sem exigir retorno ao centro.

| Fase | Conexões (unidades) | Referência de percurso | Referência / limite | Conclusão simulada a 60 Hz | Tempo restante |
| --- | --- | --- | --- | --- | --- |
| 1 | 7,68 | 9,52 s | 21,2% | 6,62 s | 38,38 s |
| 2 | 9,67 | 11,65 s | 29,1% | 8,17 s | 31,83 s |
| 3 | 11,30 | 13,53 s | 38,7% | 10,68 s | 24,32 s |
| 4 | 13,50 | 15,80 s | 49,4% | 13,22 s | 18,78 s |
| 5 | 16,07 | 18,32 s | 61,1% | 14,10 s | 15,90 s |

A referência ocupa uma parcela crescente do tempo limite. Isso dá uma base
mensurável para reduzir a folga gradualmente. O controlador conhece os caminhos;
as medições demonstram viabilidade, e o tempo de um jogador depende de orientação,
desvios e familiaridade com os controles.

## Verificação final

- Sequência completa 1 → 5 concluída sem colisões ou tempo esgotado, com passos
  simulados de 1/20, 1/60 e 1/144 segundo. Isso verifica a lógica temporal, não
  constitui um teste de desempenho gráfico nessas frequências.
- Derrota por tempo no novo limite da fase 5 e restauração de cristais/tempo.
- Coleta seguida de colisão, restaurando o mesmo layout e a contagem inicial.
- Ausência de avanço para uma fase 6 e reinício da jornada na fase 1.
- HUD inicial e botão Recarregar sincronizados com o novo limite de 45 segundos.
- Renderização da página conferida no Chrome.

Para o teste humano final, abra pelo Live Server e jogue a sequência completa.
Observe principalmente a adaptação aos obstáculos móveis nas fases 4 e 5.
