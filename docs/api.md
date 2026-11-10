# API do Painel de Formação

A API fica em `api/` (Node 22.13+, Express 5, `helmet` e `zod`). Ela lê o `CATALOGO.md` da raiz e guarda quem fez cada item. A especificação OpenAPI 3.1 está em [`api/openapi.json`](../api/openapi.json) e as mudanças em [`api/CHANGELOG.md`](../api/CHANGELOG.md).

A API não está publicada: publicar é decisão do responsável. Os exemplos usam a API local (`npm start` dentro de `api/`).

```bash
API=http://127.0.0.1:4320
```

## Rotas

Todas as rotas ficam sob `/v1`. As respostas são JSON; os erros são `application/problem+json` (ver [Erros](#erros)).

### GET /v1/health

Situação da API e do repositório de dados. A rota lê o repositório: se ele não responde, a resposta é 503.

```bash
curl -s $API/v1/health
```

```json
{ "situacao": "ok", "repositorio": { "situacao": "ok", "conclusoes": 2 } }
```

### GET /v1/catalogo

Trilhas e itens do `CATALOGO.md`, com quem fez cada item. Um item conta como feito se está marcado no catálogo ou se tem uma conclusão registrada. O número da issue do item, quando há, vem em `issue`.

```bash
curl -s $API/v1/catalogo
```

```json
{
  "trilhas": [
    {
      "codigo": "T5",
      "nome": "Backend com Node e APIs",
      "itens": [
        {
          "codigo": "T5.7",
          "texto": "Cache do catálogo com ETag.",
          "feito": true,
          "issue": 89,
          "conclusoes": [{ "usuario": "pessoa-ficticia", "pr": "https://github.com/exemplo/repo/pull/12" }]
        }
      ]
    }
  ]
}
```

### GET /v1/itens

Itens de todas as trilhas, numa lista só, com filtros e paginação. Cada item traz o código da trilha.

| Parâmetro | Regra | Padrão |
|---|---|---|
| `trilha` | Código de uma trilha que existe, como `T2` | todas |
| `situacao` | `todos`, `feitos` ou `a-fazer` | `todos` |
| `limite` | Itens por página, de 1 a 50 | 20 |
| `pagina` | Página, a partir de 1 | 1 |

A resposta traz o `total` (depois do filtro, antes da paginação) e o endereço da `proxima` página, que também vai no cabeçalho `Link` com `rel="next"`. Na última página, `proxima` é `null`. Filtro fora da regra, repetido ou desconhecido recebe 400.

```bash
curl -s "$API/v1/itens?trilha=T5&situacao=a-fazer&limite=2"
```

```json
{
  "itens": [
    { "codigo": "T5.4", "texto": "Registrar quem fez cada item ...", "feito": false, "issue": 210, "conclusoes": [], "trilha": "T5" },
    { "codigo": "T5.5", "texto": "Limitar pedidos por minuto ...", "feito": false, "issue": 211, "conclusoes": [], "trilha": "T5" }
  ],
  "total": 9,
  "pagina": 1,
  "limite": 2,
  "proxima": "/v1/itens?trilha=T5&situacao=a-fazer&limite=2&pagina=2"
}
```

### GET /v1/itens/{codigo}

Um item pelo código. Código fora do formato `Tn.m` recebe 400; item que não existe, 404.

```bash
curl -s $API/v1/itens/T5.1
```

```json
{ "codigo": "T5.1", "texto": "Criar uma API com `/health` e uma rota que devolve o catálogo.", "feito": true, "issue": 207, "conclusoes": [], "trilha": "T5" }
```

### POST /v1/sincronizar

Lê, pela API do GitHub, os PRs mesclados na `main` ou numa sprint (`developer/sprint-*`, onde os PRs de item entram) e grava uma conclusão para cada código de item no título (`T2.3: ...`; vários códigos seguidos de dois-pontos valem todos). A conclusão leva o usuário que abriu o PR, o link e a data do merge. Rodar de novo não duplica. Código que não existe no catálogo é ignorado.

A API pública do GitHub basta para um repositório público (60 pedidos por hora). Com a variável `GITHUB_TOKEN` (do responsável), o limite sobe; o token nunca vai para o log.

```bash
curl -s -X POST $API/v1/sincronizar
```

```json
{ "lidas": 12, "novas": 3, "repetidas": 9 }
```

Se o GitHub falhar, as conclusões já gravadas continuam em `GET /v1/catalogo`:

| Falha do GitHub | Resposta |
|---|---|
| Rede fora, demora acima de 5 s, erro 5xx ou outro 4xx | 502 `falha-do-github` |
| Limite de pedidos esgotado (403 com `x-ratelimit-remaining: 0`, ou 429) | 503 `github-indisponivel`, com `Retry-After` |

### GET /v1/progresso.csv

O progresso de todos os itens em CSV, para abrir numa planilha. O arquivo sai por stream, uma linha por vez (`Transfer-Encoding: chunked`), sem ser montado inteiro na memória. Colunas: `trilha`, `codigo`, `texto`, `feito` (`sim` ou `não`), `usuarios` e `prs` (separados por espaço). Campos com vírgula, aspas ou quebra de linha vão entre aspas, com as aspas dobradas (RFC 4180); texto que começa com `=`, `+`, `-` ou `@` ganha um apóstrofo, para a planilha não o tratar como fórmula. O arquivo começa com o BOM do UTF-8, para os acentos abrirem certos.

```bash
curl -s -o progresso.csv $API/v1/progresso.csv && head -n 3 progresso.csv
```

```text
trilha,codigo,texto,feito,usuarios,prs
T0,T0.1,"Explicar, num documento do repositório, o caminho de uma requisição: do endereço digitado até a página do painel na tela.",sim,,
T0,T0.2,"Rodar o projeto só pelo terminal: clonar, instalar, testar e subir, com os comandos no README.",sim,,
```

### GET /v1/progresso/trilhas

O progresso de cada trilha, na ordem do catálogo, lido da view `v_progresso_trilha` (T6.10). Um item conta como feito se está com `[x]` no catálogo ou tem uma conclusão; o percentual arredonda para baixo, como o painel. Responde com `ETag`.

```bash
curl -s $API/v1/progresso/trilhas
```

```json
{ "trilhas": [{ "trilha": "T0", "nome": "Fundamentos", "feitos": 4, "total": 12, "percentual": 33 }] }
```

### GET /v1/progresso/pessoas

Quantos itens cada pessoa concluiu, em quantas trilhas, o percentual do catálogo e a primeira e a última conclusão. Quem concluiu mais vem antes; no empate, ordem alfabética. As consultas e o plano de execução estão em [docs/consultas.md](consultas.md).

```bash
curl -s $API/v1/progresso/pessoas
```

```json
{ "pessoas": [{ "usuario": "pessoa-ficticia-01", "concluidos": 41, "trilhas": 4, "percentual": 25, "primeira": "2026-09-28T12:00:00.000Z", "ultima": "2026-11-04T12:00:00.000Z" }] }
```

### GET /v1/trilhas/{codigo}/concluintes

Quem tem conclusão em todos os itens da trilha, com a data em que fechou a trilha (a última conclusão dela), do mais antigo para o mais novo. Trilha que não existe recebe 404. A consulta e a comparação das duas versões estão em [docs/consultas.md](consultas.md).

```bash
curl -s $API/v1/trilhas/T1/concluintes
```

```json
{ "trilha": "T1", "concluintes": [{ "usuario": "pessoa-ficticia-05", "concluiu_em": "2026-10-27T12:00:00.000Z" }] }
```

### GET /v1/auth/entrar

Começa o login com a conta do GitHub (OAuth). A API gera um `state` aleatório, guarda num cookie `oauth_state` (`HttpOnly`, `Secure`, `SameSite=Lax`, 10 minutos) e redireciona (302) para `github.com/login/oauth/authorize`. Sem `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` configurados, responde 503 e o resto da API segue funcionando. Criar o app OAuth no GitHub e pôr os segredos é do responsável.

```bash
curl -si $API/v1/auth/entrar | grep -i '^location'
```

### GET /v1/auth/retorno

O GitHub volta aqui com `code` e `state`. A API confere o `state` contra o cookie (contra CSRF: um `state` diferente ou sem cookie recebe 403), troca o `code` por um token, lê o login do usuário e **descarta o token**. Cria a sessão no servidor e põe o cookie `sessao` (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/v1`, 8 horas). Depois redireciona ao painel (`URL_DO_PAINEL`).

```bash
# Quem chama é o navegador, vindo do GitHub; à mão, sem o cookie do state, a resposta é 403.
curl -si "$API/v1/auth/retorno?code=x&state=y" | head -n 1
```

### POST /v1/auth/sair

Apaga a sessão **no servidor** e o cookie. Quem guardou o cookie antigo não entra mais.

```bash
curl -si -X POST $API/v1/auth/sair -H "Cookie: sessao=$SESSAO" | head -n 1   # HTTP/1.1 204 No Content
```

### GET /v1/auth/eu

Quem está na sessão: o usuário do GitHub e o papel. Sem sessão, 401.

```bash
curl -s $API/v1/auth/eu -H "Cookie: sessao=$SESSAO"
```

```json
{ "usuario": "pessoa-ficticia", "papel": "mantenedor" }
```

### GET /v1/catalogo.md

**Rota antiga.** Devolve o texto do `CATALOGO.md`, para o painel que ainda lê o arquivo. Antiga desde 10/11/2026; sai do ar em 08/02/2027. Use `GET /v1/catalogo`. A resposta traz os cabeçalhos `Deprecation`, `Sunset` e `Link` (ver [Versões e desativação](#versões-e-desativação)).

```bash
curl -si $API/v1/catalogo.md | head -n 12
```

```text
HTTP/1.1 200 OK
Deprecation: @1794268800
Sunset: Mon, 08 Feb 2027 00:00:00 GMT
Link: </v1/catalogo>; rel="successor-version"
Content-Type: text/markdown; charset=utf-8
```

### POST /v1/conclusoes

Registra que uma pessoa fez um item. **Só para quem tem o papel `mantenedor`** (ver [Sessão e papéis](#sessão-e-papéis)). O servidor valida a entrada e põe a data. A mesma pessoa no mesmo item não duplica: a segunda vez responde 200 com a conclusão que já existia.

| Campo | Regra |
|---|---|
| `item` | Código no formato `Tn.m`, de um item que existe no catálogo |
| `usuario` | Nome de usuário do GitHub: até 39 letras, números ou hífens, sem hífen no começo, no fim ou dois seguidos |
| `pr` | Link de um PR do GitHub, como `https://github.com/dono/repo/pull/12` |

```bash
curl -s -X POST $API/v1/conclusoes \
  -H 'Content-Type: application/json' -H "Cookie: sessao=$SESSAO" \
  -d '{"item":"T5.7","usuario":"pessoa-ficticia","pr":"https://github.com/exemplo/repo/pull/12"}'
```

Resposta `201`:

```json
{ "id": 1, "item": "T5.7", "usuario": "pessoa-ficticia", "pr": "https://github.com/exemplo/repo/pull/12", "concluidaEm": "2026-11-10T12:00:00.000Z" }
```

Resposta `400`, com um campo inválido:

```json
{
  "type": "https://github.com/learnTECH-community/formacao-dev/blob/main/docs/api.md#validacao",
  "title": "Entrada inválida",
  "status": 400,
  "detail": "Um campo está inválido: confira \"erros\".",
  "instance": "/v1/conclusoes",
  "erros": [{ "campo": "item", "mensagem": "item precisa estar no formato Tn.m, como T2.3." }]
}
```

## Sessão e papéis

- Há dois papéis: `pessoa` (qualquer conta que entrou) e `mantenedor` (os logins da variável `MANTENEDORES`). O papel é decidido no servidor, a cada login; nada que venha no pedido o muda.
- `POST /v1/conclusoes` (conclusão manual) é só para `mantenedor`: sem sessão, 401 `nao-autenticado`; com sessão de `pessoa`, 403 `proibido`. A tela pode esconder o botão, mas quem barra é o servidor.
- As sessões ficam na memória da API: reiniciar encerra todas. Com mais de um servidor, seria preciso um armazenamento comum (fora desta versão).
- O cookie usa `SameSite=Lax`: outro site não consegue mandar um `POST` com ele. A rota também exige `Content-Type: application/json`, que um formulário de outro site não envia sem passar pelo CORS.

## Limite de pedidos

Cada endereço pode fazer até `LIMITE_POR_MINUTO` pedidos por minuto (padrão 60), numa janela fixa de 60 s. Toda resposta traz `RateLimit-Limit`, `RateLimit-Remaining` e `RateLimit-Reset` (segundos até a janela virar). Acima do limite, a resposta é 429 `limite-de-pedidos`, com `Retry-After`.

O limite fica na memória do processo: com mais de um servidor, cada um conta o seu.

## Cache e ETag

O texto do `CATALOGO.md` fica em memória pelo tempo de `TEMPO_DO_CACHE_EM_SEGUNDOS` (padrão 60): nesse tempo, a API não lê o arquivo de novo. Uma mudança no arquivo aparece depois que o tempo vence.

`GET /v1/catalogo`, `GET /v1/itens` e `GET /v1/itens/{codigo}` respondem com:

- `ETag`: um hash do corpo. Muda quando o catálogo ou as conclusões mudam.
- `Cache-Control: no-cache`: o cliente pode guardar a resposta, mas pergunta sempre se ela mudou.

Quem manda `If-None-Match` com o ETag que tem recebe `304 Not Modified`, sem corpo, se nada mudou.

```bash
ETAG=$(curl -si $API/v1/catalogo | grep -i '^etag:' | cut -d' ' -f2 | tr -d '\r')
curl -si $API/v1/catalogo -H "If-None-Match: $ETAG" | head -n 1   # HTTP/1.1 304 Not Modified
```

## Erros

Todo erro sai no formato Problem Details ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)), com o tipo `application/problem+json` e os campos:

| Campo | O que é |
|---|---|
| `type` | Link para a explicação do erro, nesta página |
| `title` | Nome curto do erro |
| `status` | O código HTTP |
| `detail` | O que aconteceu, para quem chamou |
| `instance` | A rota do pedido |
| `erros` | Só no 400 de validação: a lista de `{ campo, mensagem }` |

O 500 nunca traz a pilha nem a mensagem interna: elas vão para o log do servidor.

| Código | Tipo | Quando |
|---|---|---|
| 400 | `validacao` | Um ou mais campos fora da regra |
| 400 | `json-malformado` | O corpo não é JSON |
| 401 | `nao-autenticado` | A rota pede sessão e não há |
| 403 | `proibido` | Sem o papel pedido, ou `state` do login que não confere |
| 404 | `nao-encontrado` | Rota ou item que não existe |
| 413 | `corpo-grande` | Corpo acima de 10 KB |
| 429 | `limite-de-pedidos` | Pedidos demais no minuto (ver [Limite de pedidos](#limite-de-pedidos)) |
| 500 | `interno` | Falha inesperada do nosso lado |
| 502 | `falha-do-github` | O GitHub falhou ou demorou |
| 503 | `indisponivel` | O repositório de dados não respondeu |
| 503 | `github-indisponivel` | O limite da API do GitHub acabou |

### Tipos de erro

#### validacao
A entrada não segue a regra. Leia `erros`: cada item diz o campo e o motivo. Corrija e envie de novo.

#### json-malformado
O corpo não pôde ser lido como JSON. Confira aspas, vírgulas e o cabeçalho `Content-Type: application/json`.

#### corpo-grande
O corpo passou de 10 KB. Nenhuma rota precisa de tanto.

#### nao-autenticado
A rota precisa de sessão. Entre com a conta do GitHub em `/v1/auth/entrar`.

#### proibido
A sessão não tem o papel que a rota pede, ou o `state` do login não conferiu.

#### nao-encontrado
A rota não existe, ou o item pedido não está no catálogo.

#### limite-de-pedidos
Mais pedidos por minuto do que o limite. Espere os segundos de `Retry-After`.

#### falha-do-github
O GitHub não respondeu, demorou demais ou respondeu com erro. As conclusões já gravadas continuam disponíveis; tente sincronizar mais tarde.

#### github-indisponivel
O limite de pedidos da API do GitHub acabou. Espere os segundos de `Retry-After`.

#### indisponivel
O repositório de dados não respondeu. Tente de novo em instantes.

#### interno
Algo falhou do nosso lado. O detalhe ficou no log do servidor.

## Logs

A API escreve uma linha JSON por pedido na saída padrão, com `hora`, `nivel`, `id`, `metodo`, `rota` (o modelo, como `/v1/itens/:codigo`), `status` e `ms`. O mesmo `id` volta no cabeçalho `X-Request-Id`; um id recebido nesse cabeçalho (8 a 64 letras, números, `-` ou `_`) é mantido. Erro 4xx sai como `warn`, 5xx como `error`. O nível mínimo vem de `NIVEL_DO_LOG` (`debug`, `info`, `warn`, `error`).

O log nunca guarda a query, o corpo nem os cabeçalhos do pedido; campos como `token`, `senha`, `cookie`, `authorization`, `usuario` e `email` viram `[omitido]`.

```json
{"hora":"2026-11-10T12:00:00.000Z","nivel":"info","msg":"pedido","id":"3f1c...","metodo":"GET","rota":"/v1/catalogo","status":200,"ms":4.2}
```

## Versões e desativação

- A versão vai no caminho: `/v1`. Mudança que quebra um cliente (tirar um campo, mudar o tipo, mudar o sentido) só entra numa versão nova, `/v2`.
- Mudança que não quebra (rota nova, campo novo opcional) entra na versão atual e vai para o changelog.
- Para tirar uma rota: ela é marcada como antiga, com pelo menos **90 dias** de aviso. Nesse tempo, a rota responde com:
  - `Deprecation: @<segundos>`: desde quando é antiga ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745));
  - `Sunset: <data>`: quando sai do ar ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594));
  - `Link: <rota nova>; rel="successor-version"`: o que usar no lugar.
- A rota antiga fica marcada com `deprecated: true` no `openapi.json` e no changelog, com as duas datas.
- Um teste (`api/test/documentacao.test.mjs`) confere que toda rota antiga cumpre o prazo e está marcada.
