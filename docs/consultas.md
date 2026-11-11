# Consultas do painel e plano de execução

As consultas ficam em arquivos `.sql` versionados em [`api/consultas/`](../api/consultas/) (T6.2). O plano de cada uma foi lido com `EXPLAIN QUERY PLAN` em 10/11/2026, no banco de estudo com os dados fictícios (`npm run semear`: 12 trilhas, 161 itens, 288 conclusões), SQLite do Node 24.

Como ler o plano:
- `SCAN tabela`: lê a tabela inteira (ou o índice inteiro, se diz `USING INDEX`).
- `SEARCH tabela USING INDEX x (coluna=?)`: vai direto às linhas pelo índice. É o que queremos dentro de laços.
- `COVERING INDEX`: o índice já tem todas as colunas pedidas; a tabela nem é lida.
- `USE TEMP B-TREE`: uma ordenação ou agrupamento em memória temporária.

O teste `api/test/progresso.test.mjs` confere os trechos `SEARCH` abaixo: se um índice sumir, ele falha.

## Progresso por trilha

[`progresso_por_trilha.sql`](../api/consultas/progresso_por_trilha.sql) lê a view `v_progresso_trilha` (migração 003, T6.10). Rota: `GET /v1/progresso/trilhas`.

```text
CO-ROUTINE v_progresso_trilha
  SCAN t USING INDEX sqlite_autoindex_trilhas_1
  SEARCH i USING INDEX idx_itens_trilha (trilha=?) LEFT-JOIN
  USE TEMP B-TREE FOR GROUP BY
  CORRELATED SCALAR SUBQUERY 3
    SEARCH c USING COVERING INDEX sqlite_autoindex_conclusoes_1 (item=?)
  CORRELATED SCALAR SUBQUERY 4
    SEARCH c USING COVERING INDEX sqlite_autoindex_conclusoes_1 (item=?)
SCAN v_progresso_trilha
USE TEMP B-TREE FOR ORDER BY
```

- As trilhas são lidas inteiras (`SCAN t`): é o que a consulta pede, todas as trilhas. São 12.
- Para cada trilha, os itens vêm pelo índice `idx_itens_trilha`, sem varrer `itens`.
- Para cada item, o `EXISTS` procura uma conclusão pelo índice da restrição `UNIQUE (item, usuario)`, que começa por `item`. É `COVERING`: não lê a tabela `conclusoes`.
- O `EXISTS` aparece duas vezes (`SUBQUERY 3` e `4`) porque a view repete a expressão em `feitos` e em `percentual`. Com 161 itens, custa pouco; se o catálogo crescer muito, calcular `feitos` uma vez numa subconsulta e derivar o percentual dela tira a repetição.
- As duas `TEMP B-TREE` (agrupar e ordenar por `posicao`) trabalham com 12 linhas.

## Progresso por pessoa

[`progresso_por_pessoa.sql`](../api/consultas/progresso_por_pessoa.sql). Rota: `GET /v1/progresso/pessoas`.

```text
SCAN c USING INDEX idx_conclusoes_usuario
SEARCH i USING INDEX sqlite_autoindex_itens_1 (codigo=?)
SCALAR SUBQUERY 1
  SCAN itens USING COVERING INDEX sqlite_autoindex_itens_1
USE TEMP B-TREE FOR count(DISTINCT)
USE TEMP B-TREE FOR ORDER BY
```

- As conclusões são lidas inteiras, mas na ordem do índice `idx_conclusoes_usuario`: o `GROUP BY usuario` sai pronto, sem ordenar antes.
- Cada conclusão acha o seu item pela chave primária de `itens` (`SEARCH ... (codigo=?)`), para saber a trilha.
- O total de itens (`SELECT count(*) FROM itens`) roda uma vez só (`SCALAR SUBQUERY`, não `CORRELATED`) e conta pelo índice.
- `count(DISTINCT i.trilha)` e o `ORDER BY concluidos DESC` usam árvores temporárias: a ordem depende de um valor calculado, que nenhum índice tem.

## Quando usar uma view (T6.10)

Uma view é uma consulta com nome, guardada no banco. Usamos para o progresso por trilha porque:
- **Um lugar só para a regra.** "Feito = marcado no catálogo ou com conclusão" e o arredondamento para baixo moram na view. A API não repete o cálculo, e um teste compara a view com o cálculo do painel (`painel/src/progresso.ts`, T3.2) com o catálogo real.
- **Leitura simples.** Quem consulta escreve `SELECT ... FROM v_progresso_trilha`, sem saber do `LEFT JOIN` nem do `EXISTS`.
- **Mudança por migração.** Trocar a regra é uma migração nova, que troca a view para todo mundo.

Quando não usar: a view não guarda resultado (no SQLite, ela roda a consulta toda vez). Se o cálculo ficar caro e for lido muito mais do que muda, a saída é uma tabela de resumo atualizada a cada conclusão, não uma view.

## Quem concluiu uma trilha inteira (T6.8)

A pergunta "quem tem conclusão em todos os itens da trilha" foi escrita de dois jeitos, com o mesmo resultado (testado nas 12 trilhas com os dados fictícios):

- [`concluintes_da_trilha_join.sql`](../api/consultas/concluintes_da_trilha_join.sql): junta as conclusões aos itens da trilha, conta por pessoa e compara com o total de itens (tabela derivada, também por `JOIN`).
- [`concluintes_da_trilha_subconsulta.sql`](../api/consultas/concluintes_da_trilha_subconsulta.sql): "divisão relacional". A pessoa entra se **não existe** item da trilha que ela **não** concluiu (`NOT EXISTS` dentro de `NOT EXISTS`).

Plano da versão com JOIN (trilha T1):

```text
CO-ROUTINE t
  SEARCH itens USING COVERING INDEX idx_itens_trilha (trilha=?)
SEARCH i USING INDEX idx_itens_trilha (trilha=?)
SEARCH c USING INDEX sqlite_autoindex_conclusoes_1 (item=?)
SEARCH t USING AUTOMATIC PARTIAL COVERING INDEX (trilha=?)
USE TEMP B-TREE FOR GROUP BY
USE TEMP B-TREE FOR ORDER BY
```

Plano da versão com subconsulta:

```text
CO-ROUTINE p
  SCAN conclusoes USING COVERING INDEX idx_conclusoes_usuario
SEARCH itens EXISTS USING COVERING INDEX idx_itens_trilha (trilha=?)
SCAN p
CORRELATED SCALAR SUBQUERY 5
  SEARCH i USING INDEX idx_itens_trilha (trilha=?)
  CORRELATED SCALAR SUBQUERY 4
    SEARCH c USING COVERING INDEX sqlite_autoindex_conclusoes_1 (item=? AND usuario=?)
CORRELATED SCALAR SUBQUERY 1
  SEARCH c USING INDEX idx_conclusoes_usuario (usuario=?)
  SEARCH i USING INDEX sqlite_autoindex_itens_1 (codigo=?)
USE TEMP B-TREE FOR ORDER BY
```

| | JOIN | Subconsulta |
|---|---|---|
| Ponto de partida | Os itens da trilha (pelo índice) | Todas as pessoas com alguma conclusão |
| Trabalho | Uma passada: cada item da trilha, as suas conclusões | Para cada pessoa, cada item da trilha, uma busca; e outra subconsulta para a data |
| Subconsultas correlacionadas | Nenhuma | Três |
| Tempo medido (500 execuções, T1, dados fictícios) | 0,098 ms | 0,153 ms |
| Cresce com | Conclusões da trilha | Pessoas × itens da trilha |

**Escolhida: a versão com JOIN.** Ela parte só do que interessa (os itens da trilha) e não roda nada por pessoa. A subconsulta é mais fácil de ler como frase, mas o custo cresce com o número de pessoas, mesmo as que nunca tocaram na trilha. A rota `GET /v1/trilhas/{codigo}/concluintes` usa a versão com JOIN; um teste confere que o plano dela não tem subconsulta correlacionada.

## Ranking e progresso por semana (T6.9)

- [`ranking.sql`](../api/consultas/ranking.sql): a CTE `por_pessoa` conta as conclusões de cada pessoa; `RANK() OVER (ORDER BY concluidos DESC)` dá a posição. **Empate**: `RANK` repete a posição e pula as seguintes (1, 2, 2, 4). `DENSE_RANK` daria 1, 2, 2, 3, e `ROW_NUMBER` desempataria por acaso; escolhemos `RANK` porque "quarto lugar" deve dizer que três pessoas fizeram mais. `count(*) OVER (PARTITION BY concluidos) > 1` marca quem divide a posição, e a ordem alfabética só deixa a lista estável dentro dela.
- [`progresso_semanal.sql`](../api/consultas/progresso_semanal.sql): a CTE `por_semana` agrupa pela segunda-feira da semana (`date(concluida_em, '-6 days', 'weekday 1')`, em UTC; domingo ainda é a semana que começou na segunda anterior). `sum(concluidas) OVER (ORDER BY semana ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` soma do começo até a semana da linha.
- Semana sem nenhuma conclusão não aparece na lista (a CTE só tem semanas com linhas). Para um gráfico contínuo, quem desenha preenche o buraco com o acumulado anterior.
- O painel, com a API configurada, mostra a tabela "Quem mais concluiu" na página inicial, com o resultado do ranking.
