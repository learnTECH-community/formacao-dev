# formacao-dev

Formação de desenvolvedor fullstack em comunidade, da **learnTECH Community**.

Seguimos as trilhas do [roadmap.sh](https://roadmap.sh) com um **catálogo próprio de 161 itens práticos**, em 12 trilhas. Cada item é praticado num projeto real, o **Painel de Formação**. O PR que pratica um item já traz o `[x]`; o item conta como feito quando o PR chega à `main`.

> Sem afiliação com o roadmap.sh. Usamos só os links das trilhas: a licença do roadmap.sh não permite copiar o conteúdo dele ([ADR 001](docs/adr/001-roadmap-sh-so-por-link.md)). Para estudar cada tema, siga o link da trilha.

## Como funciona

1. **Escolha um item** no [CATALOGO.md](CATALOGO.md), ou uma issue aberta com o rótulo `item-do-catalogo`. As boas para começar têm `boa-primeira-issue`.
2. **Comente na issue** que vai fazer.
3. **Pratique no painel**, numa branch `feature/AAAA-MM-DD`, com o código do item no título do PR: `T2.3: barra de progresso acessível`.
4. **No PR**, marque o item com `[x]` no catálogo e rode `node scripts/catalogo.mjs --atualizar`. O CI confere o catálogo.
5. **Alguém da comunidade revisa.** Com o CI verde e a revisão, o PR entra.

## O roadmap.sh guia o catálogo

O roadmap.sh é o nosso referencial técnico e teórico. A meta é **concluir todo o conteúdo de cada trilha**:

1. Cada trilha tem uma issue de **cobertura** (rótulo `cobertura`).
2. A comunidade percorre os tópicos da trilha no roadmap.sh, **na ordem do site**.
3. Para cada tópico, alguém propõe um item prático no painel, com o modelo **"Novo item"**, escrito com palavras próprias e com o link da trilha.
4. A trilha está concluída quando todo tópico dela tem um item nosso **e** todos esses itens estão com `[x]`.

O texto dos tópicos fica no roadmap.sh: o catálogo traz a nossa tarefa prática e o link, não a cópia ([ADR 001](docs/adr/001-roadmap-sh-so-por-link.md)).

## O projeto prático: Painel de Formação

Uma página que lê o próprio `CATALOGO.md` e mostra o progresso de cada trilha, quem fez cada item e o PR que o fez. Ele nasceu simples (HTML e CSS, trilha T2) e cresce a cada trilha: JavaScript e TypeScript (T3), React (T4, em uso), API em Node (T5), banco (T6), testes (T7), publicação (T9).

## Fora deste repositório: contribuir em outros projetos

A comunidade também pratica fora daqui. Ao abrir um PR, uma issue ou uma revisão em outro projeto do GitHub, use o modelo **"Contribuição externa"**. Ele registra o link, a trilha do roadmap.sh que a contribuição pratica e o código do item (`T8.4`, `T11.1`...).

Regras para contribuir fora:
- Leia o `CONTRIBUTING.md` do outro projeto antes e siga as regras dele.
- Contribuição real: um defeito, uma melhoria, uma tradução, uma dúvida bem escrita. Nada de PR para subir número.
- No PR de fora, cite a trilha do roadmap.sh só se ajudar quem revisa, por exemplo numa melhoria de acessibilidade ou de desempenho.

## Dúvidas

Use as [Discussions](https://github.com/learnTECH-community/formacao-dev/discussions). Uma resposta que resolve a dúvida é marcada como aceita por quem perguntou.

## Rodar o catálogo

Requisito: Node 22.12 ou mais novo.

```bash
node scripts/catalogo.mjs              # confere o catálogo e mostra o progresso
node scripts/catalogo.mjs --atualizar  # reescreve a linha "Progresso"
npm test                               # testes do catálogo e do painel
```

## Rodar o painel

O painel fica em `painel/`, é um app React com Vite e TypeScript e lê o `CATALOGO.md` da raiz (pilha nas ADRs [002](docs/adr/002-pilha-do-painel.md) e [003](docs/adr/003-react-no-painel.md)). Requisitos: Git e Node 22.12 ou mais novo (o mesmo do `engines` no `package.json`). Tudo roda pelo terminal:

```bash
git clone https://github.com/learnTECH-community/formacao-dev.git   # baixa o repositório
cd formacao-dev                         # entra na pasta do projeto
npm ci                                  # instala as dependências de desenvolvimento
npm run painel                          # abre o painel em http://127.0.0.1:4317/ (Vite); Ctrl+C para parar
npm run typecheck                       # confere os tipos do painel (TypeScript, strict)
npm run lint                            # confere o código com o oxlint (React, hooks e acessibilidade)
npm test                                # testes do catálogo e das funções do painel (Vitest)
npm run cobertura                       # cobertura dos cálculos (progresso, catálogo, filtro); abaixo de 90% falha
npm run build                           # gera o site em dist/, com o CATALOGO.md junto
npm run orcamento                       # confere o peso do dist/: até 500 KB no total e 150 KB de JS (gzip)
npx playwright install chromium webkit  # baixa os navegadores dos testes (uma vez)
npm run test:e2e                        # testes no navegador: Chromium (claro e escuro), WebKit e celular
npm run servir                          # serve o dist/ com Brotli/gzip e cache, como a hospedagem deve fazer (porta 4318)
npm run lcp                             # Lighthouse móvel 3 vezes no dist/ (ou: node scripts/lcp.mjs <endereço>); meta: LCP até 2,5 s
```

O painel tem rotas: `/` (trilhas e itens, com o filtro no endereço, como `/?trilha=T2&situacao=feitos`) e `/trilha/T2` (detalhe da trilha). Para publicar numa subpasta, gere o build com a base dela: `BASE_DO_PAINEL=/formacao-dev/ npm run build`. O build traz um `404.html` igual ao `index.html`, para a hospedagem estática abrir as rotas.

## Rodar a API

A API fica em `api/`, com Node 22.13 ou mais novo (a trava de acesso ao banco, T6.11, pede o 24.10), Express 5, `helmet` e `zod` (trilhas T5 e T6). Ela tem o próprio `package.json` e lê o `CATALOGO.md` da raiz. Os testes usam o repositório em memória e o SQLite em memória; os do MongoDB rodam com `MONGO_URL` (no CI, sempre) e, sem ela, aparecem pulados com o motivo.

```bash
cd api
npm ci                                  # instala as dependências da API
npm test                                # testes das rotas e do repositório (node:test)
npm run semear                          # cria o banco SQLite (api/dados/) com dados fictícios
npm start                               # sobe em http://127.0.0.1:4320/v1/health; Ctrl+C para parar
curl http://127.0.0.1:4320/v1/catalogo  # trilhas, itens e quem fez cada item
npm run carga                           # teste de carga: 50 conexões, meta p95 < 300 ms (docs/carga.md)
```

Para o painel usar a API (quem fez cada item e avisos em tempo real), suba a API e depois o painel com a URL dela:

```bash
cd api && npm start                                   # num terminal: API em 127.0.0.1:4320
VITE_API_URL=http://127.0.0.1:4320 npm run painel     # noutro, na raiz: o painel lê a API e ouve /v1/eventos
```

Sem `VITE_API_URL`, o painel lê o `CATALOGO.md`, como antes. As variáveis estão em `api/.env.example` (só os nomes e valores de exemplo). A API não está publicada: publicar é decisão do responsável.

## Documentos

- [CATALOGO.md](CATALOGO.md): as trilhas e os itens.
- [CONTRIBUTING.md](CONTRIBUTING.md): fluxo, PR e revisão.
- [docs/MVP.md](docs/MVP.md): estado do projeto pela régua da comunidade.
- [docs/api.md](docs/api.md): rotas da API, exemplos, erros e a política de versão.
- [docs/banco.md](docs/banco.md): tabelas, migrações e dados de teste do banco.
- [docs/consultas.md](docs/consultas.md): consultas do painel, plano de execução e quando usar view.
- [docs/backup.md](docs/backup.md): acesso mínimo ao banco, backup e restauração.
- [docs/carga.md](docs/carga.md): teste de carga da API, meta e resultado.
- [SECURITY.md](SECURITY.md): como avisar uma falha de segurança.
- [docs/incidente.md](docs/incidente.md): roteiro de resposta a incidente, com o ensaio.
- [docs/seguranca.md](docs/seguranca.md): cabeçalhos, CORS, segredos e o endurecimento da API (T10).
- [docs/plano-de-testes.md](docs/plano-de-testes.md): o que se testa em cada nível e os riscos que cada teste cobre.
- [docs/como-a-web-funciona.md](docs/como-a-web-funciona.md): do endereço digitado até o painel na tela.
- [docs/adr/](docs/adr/): decisões.

## Licença

Código e textos deste repositório: [MIT](LICENSE). Os links para o roadmap.sh levam a conteúdo de outro autor, com licença própria.
