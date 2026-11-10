# Catálogo de formação

Cada item tem um código (ex.: `T2.3`). O PR que pratica o item no **Painel de Formação** já traz o `[x]`; o item conta como feito quando esse PR chega à `main` (regra decidida na #154). O PR cita o código no título.

O roadmap.sh é o nosso referencial: cada trilha cresce, na ordem dos tópicos do roadmap dela, até todo tópico ter um item prático aqui (issue de `cobertura` de cada trilha). Os itens foram escritos pela comunidade, com palavras próprias. O link de cada trilha leva ao roadmap correspondente no [roadmap.sh](https://roadmap.sh), onde está o conteúdo de estudo. Este repositório não copia o conteúdo do roadmap.sh: a licença dele só permite compartilhar os links (ver [ADR 001](docs/adr/001-roadmap-sh-so-por-link.md)).

**Progresso:** 82 de 161 itens

## T0 · Fundamentos
Roadmaps de referência: [Full Stack](https://roadmap.sh/full-stack) · [Computer Science](https://roadmap.sh/computer-science) · [Linux](https://roadmap.sh/linux)

- [x] **T0.1** Explicar, num documento do repositório, o caminho de uma requisição: do endereço digitado até a página do painel na tela.
- [x] **T0.2** Rodar o projeto só pelo terminal: clonar, instalar, testar e subir, com os comandos no README.
- [x] **T0.3** Escolher e registrar, numa ADR, a pilha do painel e o porquê.
- [x] **T0.4** Escrever o `docs/MVP.md` do painel: problema, público, hipótese com meta e o que fica fora.
- [ ] **T0.5** Índice de itens por código. (#46)
- [ ] **T0.6** Ordem natural dos códigos. (#47)
- [ ] **T0.7** Percentuais sem erro de arredondamento. (#48)
- [ ] **T0.8** Busca sem acento em UTF-8. (#49)
- [ ] **T0.9** Script de shell que conta o catálogo. (#50)
- [ ] **T0.10** API como serviço no Linux. (#51)
- [ ] **T0.11** Diagnóstico de rede pelo terminal. (#52)
- [ ] **T0.12** Padrões de projeto e diagrama de sequência. (#53)

## T1 · Git e GitHub
Roadmap de referência: [Git e GitHub](https://roadmap.sh/git-github)

- [x] **T1.1** Trabalhar com o fluxo `feature/data` → `developer/sprint-<quinta>` → `main`, com commits pequenos.
- [ ] **T1.2** Abrir uma issue no modelo do repositório: objetivo, motivo, 3 a 5 critérios e o que fica fora.
- [ ] **T1.3** Abrir um PR que fecha uma issue, com descrição, evidência e o código do item no título.
- [ ] **T1.4** Resolver um conflito de merge sem reescrever histórico.
- [ ] **T1.5** Configurar o modelo de issue e de PR do repositório (`.github/`).
- [ ] **T1.6** Publicar uma release com notas do que mudou.
- [ ] **T1.7** Trabalhar a partir de um fork. (#54)
- [ ] **T1.8** Pausar uma mudança com stash. (#55)
- [ ] **T1.9** Quadro do painel no Project. (#57)
- [ ] **T1.10** Achar o commit que quebrou um teste. (#58)
- [ ] **T1.11** Desfazer com revert por PR. (#59)
- [ ] **T1.12** Hook de pre-commit versionado. (#60)
- [ ] **T1.13** Script com gh para listar itens. (#61)
- [ ] **T1.14** Devcontainer para o Codespaces. (#62)

## T2 · Frontend base
Roadmap de referência: [Frontend](https://roadmap.sh/frontend)

- [x] **T2.1** Montar a página do painel com HTML semântico: cabeçalho, navegação, conteúdo principal e rodapé.
- [x] **T2.2** Estilizar com CSS responsivo: a página funciona de 320 px a 1440 px, sem rolagem lateral.
- [ ] **T2.3** Mostrar o progresso de cada trilha com uma barra acessível (`role="progressbar"` e texto equivalente).
- [x] **T2.4** Garantir contraste AA e foco visível em todos os controles.
- [x] **T2.5** Oferecer tema claro e escuro, que respeita a preferência do sistema.
- [x] **T2.6** Navegar pelo painel só com o teclado.
- [ ] **T2.7** Build com Vite e tamanho dos arquivos. (#63)
- [ ] **T2.8** ESLint e Prettier no CI. (#64)
- [ ] **T2.9** Copiar o link de um item. (#65)
- [ ] **T2.10** Content Security Policy no painel. (#66)
- [ ] **T2.11** Catálogo pré-renderizado no build. (#67)
- [ ] **T2.12** Tokens de design e página de componentes. (#68)
- [ ] **T2.13** Painel instalável e legível sem rede. (#69)

## T3 · JavaScript e TypeScript
Roadmaps de referência: [JavaScript](https://roadmap.sh/javascript) · [TypeScript](https://roadmap.sh/typescript)

- [x] **T3.1** Ler o `CATALOGO.md` e transformar as trilhas e os itens em dados.
- [x] **T3.2** Calcular o progresso por trilha e o total, com testes de unidade.
- [x] **T3.3** Filtrar os itens por trilha e por situação (feito ou a fazer).
- [x] **T3.4** Tipar os dados do catálogo com TypeScript, sem `any`.
- [x] **T3.5** Tratar erro, vazio e carregamento ao buscar o catálogo.
- [ ] **T3.6** Converter o código do item. (#70)
- [ ] **T3.7** Lista renderizada com a API do DOM. (#71)
- [ ] **T3.8** Buscas em paralelo com tempo limite. (#72)
- [ ] **T3.9** Módulos ES sem globais. (#73)
- [ ] **T3.10** Leitura do catálogo com gerador. (#74)
- [ ] **T3.11** Depurar um defeito com as DevTools. (#75)
- [ ] **T3.12** Validar a resposta da API com type guards. (#76)
- [ ] **T3.13** Função genérica de agrupamento. (#77)
- [ ] **T3.14** Estado da tela como união discriminada. (#78)

## T4 · React
Roadmap de referência: [React](https://roadmap.sh/react)

- [x] **T4.1** Dividir o painel em componentes: trilha, item, barra de progresso e filtro.
- [x] **T4.2** Guardar o filtro escolhido no endereço da página, para poder compartilhar.
- [x] **T4.3** Criar uma página de detalhe da trilha, com rota própria.
- [x] **T4.4** Testar os componentes com Testing Library, pelo que a pessoa vê e faz.
- [x] **T4.5** Medir e reduzir renderizações desnecessárias numa lista grande.
- [x] **T4.6** App React com Vite e TypeScript. (#79)
- [x] **T4.7** Hook useCatalogo. (#80)
- [x] **T4.8** Estado compartilhado de tema e fixados. (#81)
- [ ] **T4.9** CSS Modules com os tokens. (#82)
- [ ] **T4.10** Filtro com componente headless acessível. (#83)
- [x] **T4.11** Dados com TanStack Query. (#84)
- [x] **T4.12** Formulário "Propor item" com validação. (#85)
- [x] **T4.13** Error boundary por trilha. (#86)
- [x] **T4.14** Detalhe carregado sob demanda. (#87)
- [x] **T4.15** Detalhe do item em modal com portal. (#88)

## T5 · Backend com Node e APIs
Roadmaps de referência: [Backend](https://roadmap.sh/backend) · [Node.js](https://roadmap.sh/nodejs) · [API Design](https://roadmap.sh/api-design)

- [x] **T5.1** Criar uma API com `/health` e uma rota que devolve o catálogo. (#207)
- [x] **T5.2** Validar a entrada no servidor, com mensagens de erro claras. (#208)
- [x] **T5.3** Documentar a API: rotas, exemplos de pedido e resposta, códigos de erro. (#209)
- [x] **T5.4** Registrar quem fez cada item (nome de usuário do GitHub e link do PR), lido da API do GitHub. (#210)
- [x] **T5.5** Limitar pedidos por minuto e tratar a falha da API do GitHub. (#211)
- [x] **T5.6** Testar a API sem banco, com repositório injetado. (#212)
- [x] **T5.7** Cache do catálogo com ETag. (#89)
- [x] **T5.8** Avisos em tempo real com SSE. (#91)
- [x] **T5.9** Erros centralizados em Problem Details. (#92)
- [x] **T5.10** Logs estruturados com id do pedido. (#93)
- [x] **T5.11** Exportar o progresso em CSV por stream. (#94)
- [x] **T5.12** Rota /itens com filtros e paginação. (#95)
- [x] **T5.13** Entrar com a conta do GitHub. (#96)
- [x] **T5.14** Papéis checados no servidor. (#97)
- [x] **T5.15** Versão da API e política de desativação. (#98)

## T6 · Bancos de dados
Roadmaps de referência: [SQL](https://roadmap.sh/sql) · [MongoDB](https://roadmap.sh/mongodb)

- [x] **T6.1** Modelar trilhas, itens e conclusões num banco relacional, com chaves e índices. (#213)
- [x] **T6.2** Escrever as consultas do painel (progresso por trilha, por pessoa) e explicar o plano de execução. (#214)
- [x] **T6.3** Criar migrações versionadas e dados de teste fictícios. (#215)
- [x] **T6.4** Comparar com um modelo em documentos (MongoDB) numa ADR: quando usar cada um. (#216)
- [x] **T6.5** Garantir que dois pedidos ao mesmo tempo não registram a mesma conclusão duas vezes. (#217)
- [x] **T6.6** Operações com SQL parametrizado. (#99)
- [x] **T6.7** Restrições no banco. (#100)
- [x] **T6.8** Quem concluiu uma trilha inteira. (#101)
- [x] **T6.9** Ranking e progresso semanal. (#102)
- [x] **T6.10** View de progresso por trilha. (#103)
- [ ] **T6.11** Acesso mínimo e backup testado. (#104)
- [x] **T6.12** Repositório MongoDB alternativo. (#105)
- [x] **T6.13** Progresso por trilha com agregação. (#106)

## T7 · Qualidade
Roadmaps de referência: [QA](https://roadmap.sh/qa) · [Desempenho no frontend](https://roadmap.sh/frontend-performance-best-practices)

- [x] **T7.1** Teste de ponta a ponta (Playwright) do fluxo principal: abrir, filtrar, ver o detalhe.
- [x] **T7.2** Checar acessibilidade com axe no teste de ponta a ponta, em tema claro e escuro.
- [ ] **T7.3** Medir o LCP no celular com Lighthouse, 3 execuções, e manter abaixo de 2,5 s.
- [x] **T7.4** Simular falha de rede e lista vazia nos testes.
- [x] **T7.5** Ter cobertura dos cálculos de progresso acima de 90%.
- [x] **T7.6** Plano de testes do painel. (#107)
- [ ] **T7.7** Sessão de teste exploratório. (#108)
- [x] **T7.8** Teste de contrato da API. (#109)
- [x] **T7.9** Ponta a ponta no celular e em vários navegadores. (#110)
- [x] **T7.10** Teste de carga da API. (#111)
- [x] **T7.11** Relatório do Playwright no CI. (#112)
- [x] **T7.12** Orçamento de peso da página no CI. (#113)
- [ ] **T7.13** Compressão e cabeçalhos de cache. (#114)
- [ ] **T7.14** Fontes, imagens e CSS otimizados. (#115)

## T8 · Code review e colaboração
Roadmaps de referência: [Code Review](https://roadmap.sh/code-review) · [Boas práticas de code review](https://roadmap.sh/code-review-best-practices)

- [ ] **T8.1** Revisar um PR de outra pessoa da comunidade: um comentário de pergunta, um de sugestão e um elogio concreto.
- [ ] **T8.2** Responder a uma revisão recebida e ajustar o PR.
- [ ] **T8.3** Escrever o `CONTRIBUTING.md` com o que se espera de um PR e de uma revisão.
- [ ] **T8.4** Revisar um PR num projeto de fora (tradução, documentação ou código), citando o item do roadmap que a revisão pratica.
- [ ] **T8.5** Responder a uma dúvida nas Discussions de um projeto de fora.
- [ ] **T8.6** Definição de pronto do PR. (#116)
- [ ] **T8.7** Correção começando por um teste que falha. (#117)
- [ ] **T8.8** Autorrevisão antes de pedir revisão. (#118)
- [ ] **T8.9** Revisão com prioridades marcadas. (#119)
- [ ] **T8.10** Revisão de mudança no contrato da API. (#120)
- [ ] **T8.11** Segunda rodada de revisão. (#121)
- [ ] **T8.12** Conferência depois do merge. (#122)
- [ ] **T8.13** Item feito em programação em par. (#123)

## T9 · Entrega
Roadmaps de referência: [DevOps](https://roadmap.sh/devops) · [Docker](https://roadmap.sh/docker)

- [x] **T9.1** CI que roda lint, testes e build em todo PR.
- [ ] **T9.2** Proteger a `main`: só entra por PR com o CI verde.
- [ ] **T9.3** Publicar o painel no GitHub Pages, por Actions, depois do CI verde.
- [x] **T9.4** Empacotar a API num contêiner Docker, com `docker compose` para rodar local.
- [ ] **T9.5** Publicar a API num serviço gratuito e registrar o passo a passo.
- [x] **T9.6** Atualizar dependências com o Dependabot, sem quebrar o CI.
- [x] **T9.7** Nginx na frente do painel e da API. (#124)
- [ ] **T9.8** Checagem agendada de disponibilidade. (#125)
- [ ] **T9.9** Métricas da API no compose. (#126)
- [ ] **T9.10** Imagem da API no GHCR. (#127)
- [x] **T9.11** Volume nomeado para o banco. (#128)
- [x] **T9.12** Dockerfile em estágios. (#129)
- [ ] **T9.13** Varredura da imagem no CI. (#130)
- [ ] **T9.14** Desenvolver dentro do compose. (#131)

## T10 · Segurança
Roadmap de referência: [Cyber Security](https://roadmap.sh/cyber-security)

- [x] **T10.1** Nenhum segredo no código: só `.env.example` com os nomes das variáveis.
- [x] **T10.2** Auditar dependências (`npm audit --omit=dev`) no CI.
- [x] **T10.3** Cabeçalhos de segurança na API (`helmet`) e CORS só para o site do painel.
- [x] **T10.4** Escrever a política de segurança (`SECURITY.md`): como avisar uma falha.
- [ ] **T10.5** Decidir, por escrito, que dados pessoais o painel guarda e por quê (LGPD).
- [x] **T10.6** Modelagem de ameaças do painel. (#133)
- [x] **T10.7** Testes contra XSS e injeção de SQL. (#134)
- [x] **T10.8** Sessão protegida contra roubo e CSRF. (#135)
- [x] **T10.9** Cookie assinado com HMAC. (#136)
- [ ] **T10.10** Só HTTPS, com HSTS. (#137)
- [x] **T10.11** Análise estática de segurança. (#138)
- [ ] **T10.12** Varredura do OWASP ZAP no CI. (#139)
- [x] **T10.13** Roteiro de resposta a incidente. (#140)
- [x] **T10.14** Endurecer a API. (#141)

## T11 · Comunidade e open source
Roadmap de referência: [Full Stack](https://roadmap.sh/full-stack)

- [ ] **T11.1** Abrir um PR mesclado num projeto open source de fora, citando o item do roadmap que ele pratica.
- [ ] **T11.2** Abrir uma issue útil (defeito reproduzível ou melhoria) num projeto de fora.
- [ ] **T11.3** Apresentar o painel numa Discussion da comunidade: o que foi feito, o que aprendeu, o que falta.
- [ ] **T11.4** Acolher uma pessoa nova: indicar uma issue `boa-primeira-issue` e revisar o primeiro PR dela.
- [ ] **T11.5** Escrever um registro de aprendizado da trilha concluída, com links para os PRs.
- [ ] **T11.6** Triagem das issues novas por uma semana. (#142)
- [ ] **T11.7** Tradução de documentação open source. (#143)
- [ ] **T11.8** Reprodução mínima de um defeito de fora. (#144)
- [ ] **T11.9** Preparar issues boa-primeira-issue. (#145)
- [ ] **T11.10** Código de conduta da comunidade. (#146)
