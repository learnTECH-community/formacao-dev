# Teste de carga da API (T7.10)

O script [`api/carga/carga.mjs`](../api/carga/carga.mjs) usa o [autocannon](https://github.com/mcollina/autocannon). Ele sobe a API no mesmo processo, com o SQLite em memória e os dados fictícios (`npm run semear`: 161 itens, 288 conclusões), e faz **50 conexões simultâneas** em cada rota. A latência de cada resposta é guardada para calcular o p95 (o autocannon entrega p90 e p97,5, não o p95).

**Meta:** p95 abaixo de **300 ms** e nenhum erro em toda rota. O script sai com código 1 se alguma rota passar da meta.

```bash
cd api
npm run carga            # 3 execuções de 10 s por rota
npm run carga -- 1 5     # 1 execução de 5 s
```

O limite por minuto (T5.5) fica alto durante a carga: o teste mede a API, não o limitador.

## Resultado de 10/11/2026

Windows 10, Node 24.22, na mesma máquina que outros processos (a CPU não estava livre: os números são um piso, não um teto). Três execuções de 10 s por rota:

| Execução | Rota | Pedidos | Pedidos/s | Erros | p50 (ms) | p95 (ms) | p99 (ms) | Máx. (ms) |
|---|---|---|---|---|---|---|---|---|
| 1 | `/v1/health` | 64500 | 6452 | 0 | 6.8 | 13.0 | 20.5 | 69.8 |
| 1 | `/v1/catalogo` | 5950 | 595 | 0 | 79.0 | 152.8 | 184.7 | 191.6 |
| 1 | `/v1/itens?trilha=T5&limite=20` | 10196 | 1020 | 0 | 44.0 | 75.6 | 116.8 | 175.1 |
| 1 | `/v1/progresso/trilhas` | 23146 | 2315 | 0 | 18.8 | 38.5 | 51.9 | 79.9 |
| 1 | `/v1/ranking` | 31014 | 3102 | 0 | 13.7 | 28.2 | 41.8 | 54.2 |
| 2 | `/v1/health` | 64863 | 6487 | 0 | 6.8 | 13.3 | 22.6 | 93.3 |
| 2 | `/v1/catalogo` | 6289 | 629 | 0 | 77.6 | 119.5 | 173.0 | 186.8 |
| 2 | `/v1/itens?trilha=T5&limite=20` | 10245 | 1025 | 0 | 42.3 | 81.3 | 116.7 | 163.4 |
| 2 | `/v1/progresso/trilhas` | 23314 | 2332 | 0 | 18.7 | 40.4 | 55.6 | 85.4 |
| 2 | `/v1/ranking` | 30514 | 3052 | 0 | 13.6 | 35.6 | 53.2 | 90.9 |
| 3 | `/v1/health` | 66646 | 6666 | 0 | 6.8 | 11.3 | 22.6 | 38.8 |
| 3 | `/v1/catalogo` | 6496 | 650 | 0 | 72.2 | 125.0 | 183.3 | 210.6 |
| 3 | `/v1/itens?trilha=T5&limite=20` | 10302 | 1030 | 0 | 42.4 | 80.0 | 113.5 | 148.8 |
| 3 | `/v1/progresso/trilhas` | 24396 | 2441 | 0 | 18.5 | 34.8 | 52.5 | 73.2 |
| 3 | `/v1/ranking` | 33845 | 3385 | 0 | 13.4 | 23.4 | 42.4 | 62.5 |

**Meta cumprida** nas 3 execuções: o maior p95 foi 152,8 ms (`/v1/catalogo`), e não houve erro.

## Gargalo

`/v1/catalogo` é a rota mais lenta (p95 de 119 a 153 ms, ~630 pedidos/s): a cada pedido ela lê todas as conclusões, junta aos 161 itens, gera ~50 KB de JSON e calcula o sha256 do ETag. O `/v1/itens` repete o mesmo caminho (p95 ~80 ms). As rotas que leem da view e das consultas SQL (`/v1/progresso/trilhas`, `/v1/ranking`) ficam entre 23 e 40 ms. O gargalo virou a issue [#231](https://github.com/learnTECH-community/formacao-dev/issues/231): guardar a resposta pronta até uma conclusão mudar.
