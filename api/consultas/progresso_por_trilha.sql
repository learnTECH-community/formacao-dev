-- T6.2: progresso por trilha, na ordem do catálogo. O cálculo mora na view (T6.10).
SELECT trilha, nome, feitos, total, percentual
FROM v_progresso_trilha
ORDER BY posicao;
