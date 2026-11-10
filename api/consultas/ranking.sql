-- T6.9: ranking de quem mais concluiu itens, com CTE e função de janela.
-- Empate: RANK() dá a mesma posição a quem tem o mesmo número e pula as seguintes
-- (1, 1, 3), como num pódio. "empatado" diz se a posição é dividida.
-- Dentro da mesma posição, a ordem é alfabética, só para a lista sair estável.
WITH por_pessoa AS (
  SELECT usuario, count(*) AS concluidos
  FROM conclusoes
  GROUP BY usuario
)
SELECT
  RANK() OVER (ORDER BY concluidos DESC)          AS posicao,
  usuario,
  concluidos,
  count(*) OVER (PARTITION BY concluidos) > 1     AS empatado
FROM por_pessoa
ORDER BY posicao, usuario;
