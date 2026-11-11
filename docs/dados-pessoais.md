# Dados pessoais do painel (LGPD)

> **Situação: aprovada em 11/11/2026 pelo responsável** (#248), depois de revisada contra o texto da Lei 13.709/2018. A conferência manual dele está na #271.

A Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) pede que cada tratamento de dado pessoal tenha finalidade, base legal e só o mínimo necessário. Este documento diz o que o painel e a API guardam, por quê, com qual base e por quanto tempo. Ele também serve como o registro das operações de tratamento pedido no art. 37.

## O que é guardado

| Dado | Onde | Para quê | Base legal | Por quanto tempo |
|---|---|---|---|---|
| Tema (claro ou escuro) e itens fixados | `localStorage` do navegador da pessoa | lembrar a preferência na próxima visita | não há tratamento pela organização: o dado não sai do navegador | até a pessoa limpar o navegador |
| Usuário do GitHub e link do PR de quem concluiu um item | banco da API (tabela `conclusoes`) | mostrar quem fez cada item, que é o propósito do painel | legítimo interesse (art. 7º, IX, e art. 10, I); o dado foi tornado público pela própria pessoa no PR mesclado (art. 7º, §§ 3º, 4º e 7º) | enquanto o item estiver no catálogo; apagado a pedido |
| Usuário do GitHub e papel na sessão | memória da API | saber quem está logado e o que pode fazer | procedimento a pedido do titular: o login que a própria pessoa inicia (art. 7º, V) | até 8 horas, ou até sair, ou até a API reiniciar |
| Endereço IP | memória da API, no limite de pedidos | barrar excesso de pedidos | legítimo interesse em segurança (art. 7º, IX; art. 46) | a contagem vale 1 minuto; o endereço some quando a janela vence ou a API reinicia; não vai para log nem banco |
| Token do GitHub do login | memória da API, durante o retorno do login | ler o usuário uma vez | procedimento a pedido do titular (art. 7º, V) | descartado no mesmo pedido; nunca gravado |

## O que não é guardado

- E-mail, nome, foto ou qualquer dado do perfil além do usuário.
- O token do GitHub.
- Endereço IP, cookie ou usuário no log: o log guarda só a rota, o status e o tempo (T5.10, `api/src/log.mjs`).
- O formulário "Propor item" não envia nada: ele monta um link para abrir a issue no GitHub, na conta da própria pessoa.
- Nenhum dado sensível (art. 5º, II).

## Avaliação do legítimo interesse

Para as duas linhas que usam o legítimo interesse, respondemos às condições do art. 10:

1. **Finalidade legítima e concreta (art. 10, caput e I).** Mostrar quem concluiu cada item apoia a atividade da comunidade, que é aprender em público. Limitar pedidos protege o serviço de abuso.
2. **Só o necessário (art. 10, § 1º; art. 6º, III).** Guardamos o usuário e o link do PR, nada do perfil. O IP fica só em memória e por pouco tempo.
3. **Expectativa da pessoa.** Quem abre um PR público num repositório público espera que o nome de usuário apareça ligado a ele. O painel mostra o mesmo dado, com a mesma finalidade de reconhecer a contribuição (art. 7º, § 7º).
4. **Direitos que podem prevalecer.** O dado não é sensível e já é público. O risco é a pessoa não querer aparecer: por isso o apagamento a pedido, sem justificativa.
5. **Transparência (art. 10, § 2º).** Este documento é público no repositório, e o README do painel aponta para ele.

## Direitos de quem aparece no painel

A pessoa pode exercer, a qualquer momento e sem custo, os direitos do art. 18:
- **Confirmar e acessar:** `GET /v1/catalogo` mostra tudo o que a API guarda sobre conclusões. Se pedirem uma declaração completa, respondemos em até 15 dias, o prazo do art. 19, II.
- **Corrigir e apagar:** a pessoa pede numa issue ou pelo canal do [SECURITY.md](../SECURITY.md), e um mantenedor corrige ou apaga a conclusão. O repositório já tem `apagarConclusao`, mas ainda não há rota HTTP: hoje o apagamento é direto no banco. A rota está na #249.
- **Prazo que adotamos para apagar ou corrigir:** 15 dias. A lei deixa esse prazo para regulamento (art. 18, § 5º); usamos o mesmo do art. 19, II, por coerência.
- **Fim do tratamento (arts. 15 e 16):** quando um item sai do catálogo, um mantenedor apaga as conclusões dele com `apagarConclusao`. Nenhuma obrigação legal exige guardá-las.

## Segurança

As medidas do art. 46 estão em `docs/seguranca.md` e `docs/ameacas.md`: cookie assinado e `HttpOnly`, HTTPS com HSTS, SQL parametrizado, acesso mínimo ao banco, varreduras no CI. Incidentes seguem `docs/incidente.md`, que inclui avisar as pessoas afetadas e, quando houver risco ou dano relevante, a ANPD (art. 48).

## Dados de teste

Os testes e o `npm run semear` usam só nomes fictícios (`pessoa-ficticia`, `pessoa-mantenedora`) e PRs de um repositório de exemplo. Nenhum dado real entra em teste, documento ou issue.

## Controlador e encarregado

- **Controlador (art. 5º, VI):** o responsável pela organização `learnTECH-community` no GitHub.
- **Encarregado (art. 41):** a lei pede um, mas permite que a ANPD dispense a indicação conforme o porte (art. 41, § 3º). A dispensa para agentes de pequeno porte ainda será conferida na norma da ANPD (#271). Até lá, o contato é o canal do [SECURITY.md](../SECURITY.md).

## Decisão

Aprovados em 11/11/2026, pelo responsável:
1. A base legal de cada linha da tabela.
2. Mostrar o usuário do GitHub de quem concluiu cada item no painel publicado.
3. O prazo de 15 dias para apagar ou corrigir a pedido.
4. O responsável pela organização como controlador.

## Referências (fontes originais)

- Lei 13.709/2018 (LGPD), texto oficial: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm>. Artigos usados: 5º (I, II, VI, X, XIV), 6º (I, III, VII), 7º (V, IX, §§ 3º, 4º e 7º), 10, 15, 16, 18, 19, 37, 41, 46 e 48. Lido em 11/11/2026.
- ANPD, "Guia orientativo: hipóteses legais de tratamento de dados pessoais – legítimo interesse": <https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_hipoteses_legais_tratamento_de_dados_pessoais_legitimo_interesse>. A conferência do conteúdo está na #271.
- ANPD, "Guia orientativo para definições dos agentes de tratamento de dados pessoais e do encarregado": <https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado>. A conferência do conteúdo está na #271.
