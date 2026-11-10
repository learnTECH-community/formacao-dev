-- T6.10: o progresso de cada trilha, calculado num lugar só.
-- Um item conta como feito se está com [x] no catálogo ou tem uma conclusão.
-- O percentual arredonda para baixo, como o painel (painel/src/progresso.ts):
-- a divisão de inteiros do SQLite já descarta a parte decimal.

CREATE VIEW v_progresso_trilha AS
SELECT
  t.codigo  AS trilha,
  t.nome    AS nome,
  t.posicao AS posicao,
  count(i.codigo) AS total,
  count(i.codigo) FILTER (
    WHERE i.marcado = 1 OR EXISTS (SELECT 1 FROM conclusoes c WHERE c.item = i.codigo)
  ) AS feitos,
  CASE WHEN count(i.codigo) = 0 THEN 0
       ELSE count(i.codigo) FILTER (
              WHERE i.marcado = 1 OR EXISTS (SELECT 1 FROM conclusoes c WHERE c.item = i.codigo)
            ) * 100 / count(i.codigo)
  END AS percentual
FROM trilhas t
LEFT JOIN itens i ON i.trilha = t.codigo
GROUP BY t.codigo, t.nome, t.posicao;
