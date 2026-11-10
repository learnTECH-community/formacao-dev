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

## Só HTTPS, com HSTS (T10.10)

- Toda resposta da API leva `Strict-Transport-Security: max-age=31536000; includeSubDomains` (1 ano): depois da primeira visita, o navegador nem tenta o HTTP.
- Na hospedagem, o TLS termina no proxy, que repassa em HTTP com `X-Forwarded-Proto`. Com `SO_HTTPS=sim`, a API redireciona com 308 (mantém método e corpo) o que chegou em HTTP para o mesmo endereço em HTTPS, e confia no primeiro proxy para o IP e o protocolo (`trust proxy`). Local, sem a variável, nada muda.
- O GitHub Pages serve o painel só em HTTPS quando a opção "Enforce HTTPS" está ligada (configuração do responsável).
- Código: `api/src/https.mjs`. Teste: `api/test/https.test.mjs`.
- **Falta a prova no ar** (depende da publicação, #230): `curl -I http://<api>/v1/health` → 308 para `https://`; `curl -I https://<api>/v1/health` → `strict-transport-security`; console do painel publicado sem aviso de conteúdo misto (`Mixed Content`); registrar a data e o resultado aqui.

## Sessão contra roubo e CSRF (T10.8)

- Cookie `sessao` com `HttpOnly` (o JavaScript da página não lê), `Secure` (só HTTPS ou localhost), `SameSite=Lax` (não vai em POST vindo de outro site), `Path=/v1` e `Max-Age` de 8 horas. A sessão também vence no servidor depois de 8 horas.
- O login sempre cria um id novo e apaga a sessão que já vinha no cookie: quem planta um id antes do login não fica com a sessão de quem entrou (fixação de sessão).
- Rotas que mudam dados (POST, PUT, PATCH, DELETE) passam pelo `conferirOrigem` (`api/src/autenticacao.mjs`): com o cabeçalho `Origin`, só aceitam as origens de `ORIGENS_PERMITIDAS` ou a da própria API (`Origin: null` é recusado); sem `Origin`, recusam o que o navegador marca como `Sec-Fetch-Site: cross-site`. Recusa: 403 em Problem Details.
- O login com o GitHub tem o `state` contra CSRF (T5.13).
- Testes: `api/test/sessao.test.mjs` (outra origem, `null`, `cross-site`, sem sessão, troca do id no login, validade) e `api/test/autenticacao.test.mjs`.

## Cookie assinado com HMAC (T10.9)

- O valor do cookie é `id.assinatura`: o id aleatório (32 bytes) e o HMAC-SHA256 dele, com a chave `CHAVE_DA_SESSAO` (32 caracteres ou mais, só no ambiente). Cookie com o id, a assinatura ou o formato alterado é recusado antes de olhar a sessão.
- A comparação da assinatura usa `timingSafeEqual` e confere todas as chaves, sem parar na primeira, para o tempo não dizer qual parte bateu.
- Sem `CHAVE_DA_SESSAO`, a API gera uma chave aleatória a cada início. Como as sessões ficam em memória e já morrem no reinício, nada se perde.

### Troca da chave

Quem faz: o responsável, nas variáveis do serviço publicado.

1. Gere uma chave nova: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
2. Ponha a chave atual em `CHAVE_DA_SESSAO_ANTERIOR` e a nova em `CHAVE_DA_SESSAO`.
3. Reinicie a API. Sessões novas saem com a chave nova; a anterior só confere.
4. Depois de 8 horas (a validade da sessão), apague `CHAVE_DA_SESSAO_ANTERIOR` e reinicie.

**Decisão sobre as sessões abertas:** hoje as sessões ficam em memória, então o reinício do passo 3 já encerra todas: as pessoas entram de novo com o GitHub, sem perder nenhum dado. Aceitamos isso. A `CHAVE_DA_SESSAO_ANTERIOR` passa a valer quando as sessões ficarem fora da memória (o `criarSessoes` aceita um armazém injetado; o teste da troca usa um compartilhado). Se a chave vazou, pule o passo da anterior: troque direto e reinicie, para derrubar todas as sessões (ver [docs/incidente.md](incidente.md)).

## XSS e injeção de SQL (T10.7)

Os dois casos estão na categoria **Injection** do [OWASP Top 10](https://owasp.org/Top10/): A03 na lista de 2021 e A05 na de 2025. Nos dois, o ataque é o mesmo: texto que vem de fora é tratado como código.

| Caso | Onde o texto de fora entra | Por que não vira código | Teste |
|---|---|---|---|
| XSS (OWASP A03:2021 e A05:2025, Injection) | o título dos itens, lido do `CATALOGO.md` | o React escapa todo texto; o painel não usa `innerHTML` nem `dangerouslySetInnerHTML`; os trechos entre crases viram `<code>` com o texto dentro (`painel/src/componentes/TextoDoItem.tsx`) | `e2e/xss.spec.mjs`: `<script>`, `<img onerror>` e link `javascript:` aparecem como texto, nenhum elemento é criado e nada roda |
| Injeção de SQL (OWASP A03:2021 e A05:2025, Injection) | filtros (`?trilha=`), parâmetros de rota (`/trilhas/:codigo`) e o corpo dos POST | entrada validada com `zod` (`T\d+` para trilha) e toda consulta com parâmetros `?` ou `:nome` (`api/src/repositorios/sqlite.mjs`) | `api/test/injecao.test.mjs`: `' OR 1=1 --`, `UNION` e `DROP TABLE` são recusados (400 ou 404) na API e, direto no repositório, viram um valor que não acha nada; a tabela segue inteira |

Regra: **nenhuma consulta é montada com texto do usuário**. O teste `injecao.test.mjs` lê o código da API e falha se um `prepare` ou `exec` tiver `${...}`; as únicas exceções contam as linhas de tabelas com nome fixo no código (backup e semente). No MongoDB, a mesma validação com `zod` só aceita texto nos campos, e um objeto como `{"$gt": ""}` é recusado com 400.

## Análise estática (T10.11)

- O CodeQL (`.github/workflows/codeql.yml`, consultas `security-and-quality`) analisa o JavaScript e o TypeScript do painel, da API e dos scripts, e os workflows do Actions. Roda em todo PR, em push nas branches de trabalho e toda segunda.
- Os resultados vão para a aba **Security → Code scanning** (`security-events: write` só nesse job).
- Primeira análise, 10/11/2026, PR #254: `gh api repos/learnTECH-community/formacao-dev/code-scanning/analyses` → `javascript-typescript` com 201 regras e **0 alertas**; `actions` com 27 regras e **0 alertas**. Nenhum alerta para corrigir nem dispensar.
- Regra para os próximos: alerta alto se corrige ou ganha issue com prazo; dispensa só com motivo escrito (`CONTRIBUTING.md`).

## Segredos e dependências (T10.1, T10.2)

- Nenhum segredo no Git: só variáveis de ambiente, com os nomes em `api/.env.example`. O `node scripts/segredos.mjs` roda no CI e falha se achar `.env` versionado ou texto com cara de credencial.
- `npm audit --omit=dev --audit-level=high` no painel (job `app`) e na API (job `api`).
