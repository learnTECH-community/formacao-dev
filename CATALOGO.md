# Catálogo de formação

Cada item tem um código (ex.: `T2.3`). Ele é marcado com `[x]` quando o PR que o pratica no **Painel de Formação** entra na `main`. O PR cita o código no título.

O roadmap.sh é o nosso referencial: cada trilha cresce, na ordem dos tópicos do roadmap dela, até todo tópico ter um item prático aqui (issue de `cobertura` de cada trilha). Os itens foram escritos pela comunidade, com palavras próprias. O link de cada trilha leva ao roadmap correspondente no [roadmap.sh](https://roadmap.sh), onde está o conteúdo de estudo. Este repositório não copia o conteúdo do roadmap.sh: a licença dele só permite compartilhar os links (ver [ADR 001](docs/adr/001-roadmap-sh-so-por-link.md)).

**Progresso:** 3 de 63 itens

## T0 · Fundamentos
Roadmaps de referência: [Full Stack](https://roadmap.sh/full-stack) · [Computer Science](https://roadmap.sh/computer-science) · [Linux](https://roadmap.sh/linux)

- [ ] **T0.1** Explicar, num documento do repositório, o caminho de uma requisição: do endereço digitado até a página do painel na tela.
- [ ] **T0.2** Rodar o projeto só pelo terminal: clonar, instalar, testar e subir, com os comandos no README.
- [x] **T0.3** Escolher e registrar, numa ADR, a pilha do painel e o porquê.
- [ ] **T0.4** Escrever o `docs/MVP.md` do painel: problema, público, hipótese com meta e o que fica fora.

## T1 · Git e GitHub
Roadmap de referência: [Git e GitHub](https://roadmap.sh/git-github)

- [ ] **T1.1** Trabalhar com o fluxo `feature/data` → `developer/sprint-<quinta>` → `main`, com commits pequenos.
- [ ] **T1.2** Abrir uma issue no modelo do repositório: objetivo, motivo, 3 a 5 critérios e o que fica fora.
- [ ] **T1.3** Abrir um PR que fecha uma issue, com descrição, evidência e o código do item no título.
- [ ] **T1.4** Resolver um conflito de merge sem reescrever histórico.
- [ ] **T1.5** Configurar o modelo de issue e de PR do repositório (`.github/`).
- [ ] **T1.6** Publicar uma release com notas do que mudou.

## T2 · Frontend base
Roadmap de referência: [Frontend](https://roadmap.sh/frontend)

- [x] **T2.1** Montar a página do painel com HTML semântico: cabeçalho, navegação, conteúdo principal e rodapé.
- [x] **T2.2** Estilizar com CSS responsivo: a página funciona de 320 px a 1440 px, sem rolagem lateral.
- [ ] **T2.3** Mostrar o progresso de cada trilha com uma barra acessível (`role="progressbar"` e texto equivalente).
- [ ] **T2.4** Garantir contraste AA e foco visível em todos os controles.
- [ ] **T2.5** Oferecer tema claro e escuro, que respeita a preferência do sistema.
- [ ] **T2.6** Navegar pelo painel só com o teclado.

## T3 · JavaScript e TypeScript
Roadmaps de referência: [JavaScript](https://roadmap.sh/javascript) · [TypeScript](https://roadmap.sh/typescript)

- [ ] **T3.1** Ler o `CATALOGO.md` e transformar as trilhas e os itens em dados.
- [ ] **T3.2** Calcular o progresso por trilha e o total, com testes de unidade.
- [ ] **T3.3** Filtrar os itens por trilha e por situação (feito ou a fazer).
- [ ] **T3.4** Tipar os dados do catálogo com TypeScript, sem `any`.
- [ ] **T3.5** Tratar erro, vazio e carregamento ao buscar o catálogo.

## T4 · React
Roadmap de referência: [React](https://roadmap.sh/react)

- [ ] **T4.1** Dividir o painel em componentes: trilha, item, barra de progresso e filtro.
- [ ] **T4.2** Guardar o filtro escolhido no endereço da página, para poder compartilhar.
- [ ] **T4.3** Criar uma página de detalhe da trilha, com rota própria.
- [ ] **T4.4** Testar os componentes com Testing Library, pelo que a pessoa vê e faz.
- [ ] **T4.5** Medir e reduzir renderizações desnecessárias numa lista grande.

## T5 · Backend com Node e APIs
Roadmaps de referência: [Backend](https://roadmap.sh/backend) · [Node.js](https://roadmap.sh/nodejs) · [API Design](https://roadmap.sh/api-design)

- [ ] **T5.1** Criar uma API com `/health` e uma rota que devolve o catálogo.
- [ ] **T5.2** Validar a entrada no servidor, com mensagens de erro claras.
- [ ] **T5.3** Documentar a API: rotas, exemplos de pedido e resposta, códigos de erro.
- [ ] **T5.4** Registrar quem fez cada item (nome de usuário do GitHub e link do PR), lido da API do GitHub.
- [ ] **T5.5** Limitar pedidos por minuto e tratar a falha da API do GitHub.
- [ ] **T5.6** Testar a API sem banco, com repositório injetado.

## T6 · Bancos de dados
Roadmaps de referência: [SQL](https://roadmap.sh/sql) · [MongoDB](https://roadmap.sh/mongodb)

- [ ] **T6.1** Modelar trilhas, itens e conclusões num banco relacional, com chaves e índices.
- [ ] **T6.2** Escrever as consultas do painel (progresso por trilha, por pessoa) e explicar o plano de execução.
- [ ] **T6.3** Criar migrações versionadas e dados de teste fictícios.
- [ ] **T6.4** Comparar com um modelo em documentos (MongoDB) numa ADR: quando usar cada um.
- [ ] **T6.5** Garantir que dois pedidos ao mesmo tempo não registram a mesma conclusão duas vezes.

## T7 · Qualidade
Roadmaps de referência: [QA](https://roadmap.sh/qa) · [Desempenho no frontend](https://roadmap.sh/frontend-performance-best-practices)

- [ ] **T7.1** Teste de ponta a ponta (Playwright) do fluxo principal: abrir, filtrar, ver o detalhe.
- [ ] **T7.2** Checar acessibilidade com axe no teste de ponta a ponta, em tema claro e escuro.
- [ ] **T7.3** Medir o LCP no celular com Lighthouse, 3 execuções, e manter abaixo de 2,5 s.
- [ ] **T7.4** Simular falha de rede e lista vazia nos testes.
- [ ] **T7.5** Ter cobertura dos cálculos de progresso acima de 90%.

## T8 · Code review e colaboração
Roadmaps de referência: [Code Review](https://roadmap.sh/code-review) · [Boas práticas de code review](https://roadmap.sh/code-review-best-practices)

- [ ] **T8.1** Revisar um PR de outra pessoa da comunidade: um comentário de pergunta, um de sugestão e um elogio concreto.
- [ ] **T8.2** Responder a uma revisão recebida e ajustar o PR.
- [ ] **T8.3** Escrever o `CONTRIBUTING.md` com o que se espera de um PR e de uma revisão.
- [ ] **T8.4** Revisar um PR num projeto de fora (tradução, documentação ou código), citando o item do roadmap que a revisão pratica.
- [ ] **T8.5** Responder a uma dúvida nas Discussions de um projeto de fora.

## T9 · Entrega
Roadmaps de referência: [DevOps](https://roadmap.sh/devops) · [Docker](https://roadmap.sh/docker)

- [ ] **T9.1** CI que roda lint, testes e build em todo PR.
- [ ] **T9.2** Proteger a `main`: só entra por PR com o CI verde.
- [ ] **T9.3** Publicar o painel no GitHub Pages, por Actions, depois do CI verde.
- [ ] **T9.4** Empacotar a API num contêiner Docker, com `docker compose` para rodar local.
- [ ] **T9.5** Publicar a API num serviço gratuito e registrar o passo a passo.
- [ ] **T9.6** Atualizar dependências com o Dependabot, sem quebrar o CI.

## T10 · Segurança
Roadmap de referência: [Cyber Security](https://roadmap.sh/cyber-security)

- [ ] **T10.1** Nenhum segredo no código: só `.env.example` com os nomes das variáveis.
- [ ] **T10.2** Auditar dependências (`npm audit --omit=dev`) no CI.
- [ ] **T10.3** Cabeçalhos de segurança na API (`helmet`) e CORS só para o site do painel.
- [ ] **T10.4** Escrever a política de segurança (`SECURITY.md`): como avisar uma falha.
- [ ] **T10.5** Decidir, por escrito, que dados pessoais o painel guarda e por quê (LGPD).

## T11 · Comunidade e open source
Roadmap de referência: [Full Stack](https://roadmap.sh/full-stack)

- [ ] **T11.1** Abrir um PR mesclado num projeto open source de fora, citando o item do roadmap que ele pratica.
- [ ] **T11.2** Abrir uma issue útil (defeito reproduzível ou melhoria) num projeto de fora.
- [ ] **T11.3** Apresentar o painel numa Discussion da comunidade: o que foi feito, o que aprendeu, o que falta.
- [ ] **T11.4** Acolher uma pessoa nova: indicar uma issue `boa-primeira-issue` e revisar o primeiro PR dela.
- [ ] **T11.5** Escrever um registro de aprendizado da trilha concluída, com links para os PRs.
