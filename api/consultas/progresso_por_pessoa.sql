-- T6.2: progresso por pessoa. Quantos itens cada pessoa concluiu, em quantas
-- trilhas, o percentual do catálogo e a primeira e a última conclusão.
-- Ordem: quem concluiu mais vem antes; no empate, ordem alfabética.
SELECT
  c.usuario                AS usuario,
  count(*)                 AS concluidos,
  count(DISTINCT i.trilha) AS trilhas,
  count(*) * 100 / (SELECT count(*) FROM itens) AS percentual,
  min(c.concluida_em)      AS primeira,
  max(c.concluida_em)      AS ultima
FROM conclusoes c
JOIN itens i ON i.codigo = c.item
GROUP BY c.usuario
ORDER BY concluidos DESC, usuario;
