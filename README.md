# formacao-dev

Formação de desenvolvedor fullstack em comunidade, da **learnTECH Community**.

Seguimos as trilhas do [roadmap.sh](https://roadmap.sh) com um **catálogo próprio de 63 itens práticos**, em 12 trilhas. Cada item é praticado num projeto real, o **Painel de Formação**. Quando o PR que pratica um item entra na `main`, o item ganha o `[x]` no catálogo.

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

Uma página que lê o próprio `CATALOGO.md` e mostra o progresso de cada trilha, quem fez cada item e o PR que o fez. Ele nasce simples (HTML e CSS, trilha T2) e cresce a cada trilha: JavaScript e TypeScript (T3), React (T4), API em Node (T5), banco (T6), testes (T7), publicação (T9).

## Fora deste repositório: contribuir em outros projetos

A comunidade também pratica fora daqui. Ao abrir um PR, uma issue ou uma revisão em outro projeto do GitHub, use o modelo **"Contribuição externa"**. Ele registra o link, a trilha do roadmap.sh que a contribuição pratica e o código do item (`T8.4`, `T11.1`...).

Regras para contribuir fora:
- Leia o `CONTRIBUTING.md` do outro projeto antes e siga as regras dele.
- Contribuição real: um defeito, uma melhoria, uma tradução, uma dúvida bem escrita. Nada de PR para subir número.
- No PR de fora, cite a trilha do roadmap.sh só se ajudar quem revisa, por exemplo numa melhoria de acessibilidade ou de desempenho.

## Dúvidas

Use as [Discussions](https://github.com/learnTECH-community/formacao-dev/discussions). Uma resposta que resolve a dúvida é marcada como aceita por quem perguntou.

## Rodar o catálogo

Requisito: Node 20 ou mais novo.

```bash
node scripts/catalogo.mjs              # confere o catálogo e mostra o progresso
node scripts/catalogo.mjs --atualizar  # reescreve a linha "Progresso"
npm test                               # testes do catálogo
```

## Rodar o painel

O painel fica em `painel/`. Requisito: Node 20 ou mais novo.

```bash
npm ci                                  # instala as dependências de desenvolvimento
npm run painel                          # abre o painel em http://127.0.0.1:4317/
npx playwright install chromium         # baixa o navegador dos testes (uma vez)
npm run test:e2e                        # testes do painel no navegador, temas claro e escuro
```

## Documentos

- [CATALOGO.md](CATALOGO.md): as trilhas e os itens.
- [CONTRIBUTING.md](CONTRIBUTING.md): fluxo, PR e revisão.
- [docs/MVP.md](docs/MVP.md): estado do projeto pela régua da comunidade.
- [docs/adr/](docs/adr/): decisões.

## Licença

Código e textos deste repositório: [MIT](LICENSE). Os links para o roadmap.sh levam a conteúdo de outro autor, com licença própria.
