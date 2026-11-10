# Segurança do painel e da API

O que protege o Painel de Formação e a API, onde está no código e qual teste prova. Trilha T10 do catálogo. Para avisar uma falha, veja o [SECURITY.md](../SECURITY.md).

## Cabeçalhos e CORS (T10.3)

- A API usa o `helmet` em toda resposta, inclusive nas de erro: `Content-Security-Policy` com `default-src 'self'` e `frame-ancestors 'self'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer` e `Cross-Origin-Opener-Policy: same-origin`.
- CORS só para as origens de `ORIGENS_PERMITIDAS` (o endereço do painel). Outra origem não recebe `Access-Control-Allow-Origin` nem `Access-Control-Allow-Credentials`, nem no preflight. Sem a variável, nenhuma origem recebe; não há curinga (`*`).
- Código: `api/src/app.mjs` (função `cors`). Testes: `api/test/endurecimento.test.mjs` e `api/test/app.test.mjs`.

## API endurecida (T10.14)

| Proteção | Como | Teste |
|---|---|---|
| Corpo grande | `express.json({ limit: '10kb' })`; acima disso, 413 em Problem Details | `endurecimento.test.mjs`, `erros.test.mjs` |
| Sem assinatura do servidor | `app.disable('x-powered-by')` e o `helmet` | `endurecimento.test.mjs` |
| Cliente lento | `requestTimeout` 15 s e `headersTimeout` 10 s (`TEMPO_DO_PEDIDO_EM_MS`, `TEMPO_DOS_CABECALHOS_EM_MS`); depois disso, 408 e a conexão fecha. Cabeçalhos acima de 16 KB recebem 431 | `endurecimento.test.mjs` (cliente que manda metade dos cabeçalhos) |
| Erro sem detalhe interno | o middleware central (`api/src/erros.mjs`) troca qualquer erro inesperado por uma mensagem fixa; a pilha vai só para o log | `endurecimento.test.mjs` com `NODE_ENV=production`, `erros.test.mjs` |
| Excesso de pedidos | limite por endereço (`LIMITE_POR_MINUTO`), 429 com `Retry-After` | `limite.test.mjs` |

Os tempos limite ficam em `api/src/tempos.mjs`. Eles valem para receber o pedido: a rota de eventos em tempo real (`/v1/eventos`) segue aberta depois que o pedido chegou.

## Segredos e dependências (T10.1, T10.2)

- Nenhum segredo no Git: só variáveis de ambiente, com os nomes em `api/.env.example`. O `node scripts/segredos.mjs` roda no CI e falha se achar `.env` versionado ou texto com cara de credencial.
- `npm audit --omit=dev --audit-level=high` no painel (job `app`) e na API (job `api`).
