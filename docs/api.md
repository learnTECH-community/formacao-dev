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

Registra que uma pessoa fez um item. O servidor valida a entrada e põe a data. A mesma pessoa no mesmo item não duplica: a segunda vez responde 200 com a conclusão que já existia.

| Campo | Regra |
|---|---|
| `item` | Código no formato `Tn.m`, de um item que existe no catálogo |
| `usuario` | Nome de usuário do GitHub: até 39 letras, números ou hífens, sem hífen no começo, no fim ou dois seguidos |
| `pr` | Link de um PR do GitHub, como `https://github.com/dono/repo/pull/12` |

```bash
curl -s -X POST $API/v1/conclusoes \
  -H 'Content-Type: application/json' \
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
| 404 | `nao-encontrado` | Rota ou item que não existe |
| 413 | `corpo-grande` | Corpo acima de 10 KB |
| 500 | `interno` | Falha inesperada do nosso lado |
| 503 | `indisponivel` | O repositório de dados não respondeu |

### Tipos de erro

#### validacao
A entrada não segue a regra. Leia `erros`: cada item diz o campo e o motivo. Corrija e envie de novo.

#### json-malformado
O corpo não pôde ser lido como JSON. Confira aspas, vírgulas e o cabeçalho `Content-Type: application/json`.

#### corpo-grande
O corpo passou de 10 KB. Nenhuma rota precisa de tanto.

#### nao-encontrado
A rota não existe, ou o item pedido não está no catálogo.

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
