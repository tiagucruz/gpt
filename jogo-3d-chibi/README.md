# Órbita — jogo 3D

## Etapa atual: 9 de 9 — implementação concluída

Cena inicial com piso, iluminação, câmera superior inclinada e personagem chibi
construído com primitivas do Three.js. Movimento no plano X/Z com WASD ou setas,
animação senoidal de braços e pernas ao caminhar e câmera acompanhando o personagem.
Cinco configurações de fase, cada uma com semente própria, e `carregarFase(n)`
para gerar e substituir o cenário. A jornada começa na fase 1 e avança até a 5.
Ao encostar em um obstáculo, a mesma fase é recarregada e o personagem volta
ao centro. Cristais são coletados ao encostar e o cronômetro começa ao carregar
a fase. Tempo esgotado também reinicia a tentativa. Coletar todos os cristais
congela movimento e tempo e abre uma tela de conclusão com botão para avançar.
Após a fase 5, a tela final mostra as cinco fases concluídas e o total de cristais.
**Jogar novamente** começa uma nova jornada pela fase 1.
Nas fases 4 e 5, os obstáculos se movem no plano X/Z, dentro da amplitude
reservada pela geração. O HUD fica fixo no topo, com cartões de fase atual,
tempo restante em minutos e segundos e cristais coletados/total. Barras indicam
tempo disponível e progresso da coleta. Nos últimos dez segundos, o cartão
ganha destaque coral e o texto **Pouco tempo**, sem piscar.

## Como visualizar

1. Abra esta pasta no VS Code.
2. Com a extensão **Live Server** instalada, clique com o botão direito em
   `index.html` e escolha **Open with Live Server**.
3. Use **WASD** ou **setas** para andar. Os controles seguem a orientação da câmera.
4. Segure duas direções para andar na diagonal e solte para conferir a pose parada.
5. Vá até a borda: o personagem fica limitado ao piso circular. A câmera acompanha
   sua posição, mantendo o enquadramento e a inclinação.
6. Troque de aba enquanto anda e volte: o personagem deve ficar parado até uma nova tecla.
7. Observe os marcadores **1 a 5**: indicam a fase atual e as já concluídas.
8. Use **Recarregar**: as posições devem ser as mesmas e a tentativa deve reiniciar.
9. Encoste em uma esfera coral. Confira o reinício da fase e a mensagem.
   Solte a tecla e pressione novamente para continuar.
10. Ative **Ver caminhos** e siga as linhas do centro até os cristais.
    As linhas indicam rotas livres, não paredes. Você pode andar fora delas.
    Recarregar reproduz tanto as posições quanto a paleta.
11. Encoste em um cristal: ele desaparece e a contagem aumenta uma única vez.
12. Colete todos: confira a tela de conclusão e a parada do cronômetro.
    Clique em **Ir para a fase seguinte** (ou pressione Enter no botão focado).
    Confira a nova fase, com tempo completo, contagem zerada e personagem no centro.
13. Após coletar algum cristal, encoste em um obstáculo: todos os cristais
    reaparecem, a contagem zera e o tempo volta ao limite da fase.
14. Deixe o tempo acabar para testar o reinício automático. Na fase 5, são 30 s.
15. Confira que as esferas ficam paradas nas fases 1–3 e se movem nas fases 4–5.
16. Troque de aba: o tempo pausa enquanto a página estiver oculta e o personagem
    fica parado ao voltar. O jogo continua contando tempo se apenas perder foco
    sem ocultar a aba.
17. Complete a fase 5: confira a tela **Todas as fases concluídas!** e os 25 cristais.
18. Clique em **Jogar novamente**: deve voltar à fase 1 com todos os dados reiniciados.
19. Confira no HUD a fase **1 / 5**, o tempo **00:45** e a coleta **0 / 3** ao iniciar.
    Ao coletar, a barra verde aumenta; ao reiniciar, os valores e barras são restaurados.
20. Deixe o tempo chegar a **00:10** e confira o destaque de pouco tempo.
    Na conclusão, os indicadores ficam congelados junto com a partida.
21. Redimensione a janela: os cartões continuam visíveis; em telas estreitas,
    o cenário fica abaixo dos textos e controles, sem cobrir o personagem.

Os números usam largura estável para não deslocar os cartões durante a contagem.
Leitores de tela recebem avisos de fase, coleta e pouco tempo, sem anunciar
cada segundo. As barras são complementares aos valores escritos.

## Música, efeitos e volume

Os efeitos são sintetizados localmente pela Web Audio API, sem arquivos de áudio,
downloads ou CDN. Há sons de coleta, passos, colisão, tempo esgotado, início de
tentativa, conclusão de fase e conclusão da jornada. Um aviso toca aos dez segundos
e depois a cada segundo entre cinco e um, sem repetição a cada quadro.

O navegador libera áudio depois da primeira interação com a página: clique ou
pressione uma tecla para jogar. O rodapé oferece **Efeitos ligados / desligados**
e **Música ligada / desligada**, cada um com seu próprio volume. A tela de conclusão
também permite silenciar cada canal. As preferências são salvas neste navegador.
Volume zero silencia somente o canal correspondente.

A música é uma composição instrumental original a 72 BPM, com acordes suaves
e melodia sem percussão, sintetizada em `music.js`. O ciclo dura aproximadamente
27 segundos e se repete continuamente. A renderização inclui um ciclo anterior
para preservar as caudas dos acordes na emenda, sem intervalo entre as voltas.
O volume inicial da música é 25%, abaixo dos 40% dos efeitos.

A trilha é preparada uma única vez, após a interação inicial, e usa o mesmo
contexto de áudio dos efeitos. Ela continua entre tentativas e fases, com entrada
e alterações de volume graduais. Ao ocultar a aba, o contexto pausa; ao voltar,
retoma da mesma posição, sem sobrepor cópias da música. Silenciar os efeitos não
silencia a trilha, e vice-versa. Não há arquivos de áudio ou serviços externos.

Os efeitos param ao ocultar a aba ou reiniciar a tentativa; efeitos antigos não são
reproduzidos em sequência quando o áudio é liberado. O jogo continua funcionando
se o navegador não oferecer áudio. Para testar, caminhe, colete um cristal,
encoste em um obstáculo e complete uma fase. Confira também o silêncio e o volume.

O seletor de teste foi substituído por progresso sequencial. Colisão ou tempo
esgotado reiniciam somente a fase atual. A tela de resultado mantém o foco no
botão de continuar/recomeçar; Escape não a fecha. Cliques repetidos não pulam fases.

O movimento não inclui pulo ou gravidade. Braços e pernas opostos balançam juntos.
A velocidade usa o tempo entre quadros e é igual nas direções retas e diagonais.

A colisão usa raios lógicos de 0,6 (personagem) e 0,55 (obstáculo), com centros
na mesma altura no plano de movimento. A condição é `distância < soma dos raios`,
calculada com distâncias ao quadrado. A penalidade escolhida é reiniciar,
sem sistema de vidas.

## Configurações finais

| Fase | Seed | Itens | Obstáculos | Tempo | Móveis | Velocidade máxima |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 104729 | 3 | 2 | 45 s | Não | 0 |
| 2 | 130363 | 4 | 3 | 40 s | Não | 0 |
| 3 | 155921 | 5 | 4 | 35 s | Não | 0 |
| 4 | 180503 | 6 | 5 | 32 s | Sim | 0,50 |
| 5 | 205019 | 7 | 6 | 30 s | Sim | 0,75 |

O tempo diminui enquanto o número de itens e obstáculos aumenta. Os obstáculos
móveis começam mais devagar na fase 4 e aceleram na fase 5. Sementes, dimensões
e margens de segurança foram preservadas. As medições e o critério de ajuste estão
em [BALANCEAMENTO.md](./BALANCEAMENTO.md).

A geração segue a abordagem da escultura generativa: **pontos + regra de conexão
+ paleta**. A implementação parte da descrição do projeto anterior; seu código
original não está nesta pasta.

1. `gerarPosicoes(seed, parametros)` distribui cristais no plano X/Z por
   amostragem uniforme da área circular, reservando o centro e separando os pontos.
2. `conectarPontos` conecta centro e cristais pelo algoritmo de Prim: liga o ponto
   isolado mais próximo à rede, formando uma árvore sem ciclos.
3. Obstáculos são gerados fora dos corredores dessa árvore. A folga considera
   raio do personagem + raio do obstáculo + margem de 0,15. Para as fases 4 e 5,
   também reserva 0,3 de amplitude para o movimento dos obstáculos.
4. Uma sequência separada da mesma semente define a paleta do piso, dos cristais
   verdes e dos obstáculos coral. Recarregar mantém cores e posições.

Assim, cada cristal tem uma rota conectada ao centro com espaço para o personagem.
Os segmentos ficam dentro do disco navegável. As linhas opcionais mostram o centro
dos corredores, não sua largura. A geração tem limite de tentativas e rejeita
configurações impossíveis, preservando o cenário anterior. Não há posições fixas
nem uso de `Math.random`. A dificuldade muda somente pelos parâmetros em `FASES`.

O movimento dos obstáculos usa seno ao longo de uma direção derivada da semente.
A velocidade da tabela é em unidades por segundo e a posição inicial se repete
ao reiniciar. Cristais coletados ficam invisíveis dentro do grupo até o próximo
carregamento, quando seus recursos são liberados junto com os demais objetos.

O cronômetro desconta os segundos reais entre quadros; apenas o passo de movimento
do personagem é limitado para evitar saltos. Se o prazo já acabou no quadro,
a derrota por tempo tem prioridade; em seguida, a colisão tem prioridade sobre
a coleta. Após a vitória, atualizações não alteram tempo, coleta ou obstáculos.

Ao trocar de fase, o grupo anterior é removido e suas geometrias e materiais
são liberados. Chão, luzes e personagem são mantidos. Números inválidos são
rejeitados antes de alterar o cenário atual.

Não abra por `file://`: os módulos ES precisam ser servidos por HTTP.
Depois de baixar o projeto, não é necessária conexão com a internet para executar.

## Arquivos

- `index.html`: página e textos da apresentação.
- `style.css`: aparência e adaptação a telas menores.
- `main.js`: cena, chão, luzes, câmera e renderização.
- `character.js`: personagem e grupos dos membros.
- `movement.js`: teclado, movimento, animação de caminhada e acompanhamento da câmera.
- `collision.js`: detecção por distância e criação de obstáculos.
- `levels.js`: array `FASES`, criação dos objetos e gerenciador de fases.
- `gameplay.js`: estado da partida, coleta, cronômetro, resultados e obstáculos móveis.
- `completion.js`: telas de conclusão de fase e de jornada, com ações e foco do teclado.
- `hud.js`: apresentação dos indicadores, formatação do tempo e avisos acessíveis.
- `sound.js`: síntese dos efeitos, controle de volume, silêncio e liberação do áudio.
- `music.js`: composição instrumental, geração do ciclo e reprodução contínua.
- `layout.js`: geração por semente, conexões, corredores livres e paleta.
- `vendor/three/`: Three.js 0.180.0 e sua licença MIT, distribuídos localmente.

O Three.js foi obtido do pacote oficial `three@0.180.0` do registro npm.
`three.module.js` importa `three.core.js` da mesma pasta. Nenhum CDN é usado.
