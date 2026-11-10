-- T6.9: conclusões por semana e o total acumulado, com CTE e função de janela.
-- A semana começa na segunda-feira, em UTC: date(..., '-6 days', 'weekday 1')
-- leva qualquer dia à segunda-feira da sua semana.
WITH por_semana AS (
  SELECT date(concluida_em, '-6 days', 'weekday 1') AS semana, count(*) AS concluidas
  FROM conclusoes
  GROUP BY semana
)
SELECT
  semana,
  concluidas,
  sum(concluidas) OVER (ORDER BY semana ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado
FROM por_semana
ORDER BY semana;
