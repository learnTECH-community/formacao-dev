-- T6.8, versão com subconsulta: quem concluiu todos os itens de uma trilha (:trilha).
-- "Divisão relacional": a pessoa entra se não existe item da trilha que ela
-- não concluiu. O EXISTS de fora evita que uma trilha sem itens devolva todo mundo.
SELECT p.usuario AS usuario,
       (SELECT max(c.concluida_em) FROM conclusoes c JOIN itens i ON i.codigo = c.item
         WHERE c.usuario = p.usuario AND i.trilha = :trilha) AS concluiu_em
FROM (SELECT DISTINCT usuario FROM conclusoes) p
WHERE EXISTS (SELECT 1 FROM itens WHERE trilha = :trilha)
  AND NOT EXISTS (
    SELECT 1 FROM itens i
    WHERE i.trilha = :trilha
      AND NOT EXISTS (SELECT 1 FROM conclusoes c WHERE c.item = i.codigo AND c.usuario = p.usuario)
  )
ORDER BY concluiu_em, usuario;
