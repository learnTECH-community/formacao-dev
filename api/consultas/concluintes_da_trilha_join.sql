-- T6.8, versão com JOIN: quem concluiu todos os itens de uma trilha (:trilha).
-- Junta as conclusões aos itens da trilha, conta por pessoa e compara com o
-- total de itens da trilha, que vem de uma tabela derivada (também por JOIN).
SELECT c.usuario AS usuario, max(c.concluida_em) AS concluiu_em
FROM conclusoes c
JOIN itens i ON i.codigo = c.item
JOIN (SELECT trilha, count(*) AS total FROM itens GROUP BY trilha) t ON t.trilha = i.trilha
WHERE i.trilha = :trilha
GROUP BY c.usuario
HAVING count(*) = max(t.total)
ORDER BY concluiu_em, usuario;
