# Dados pessoais do painel (LGPD)

> **Situação: proposta, aguardando a aprovação do responsável.** Escrita em 10/11/2026 (item T10.5). Ela vale como decisão só depois que o responsável aprovar na issue do item. Até lá, descreve o que o código faz hoje e o que propomos.

A Lei Geral de Proteção de Dados (Lei 13.709/2018) pede que cada dado pessoal tenha uma finalidade, uma base legal e o mínimo necessário. Aqui está o que o painel e a API guardam, por quê e por quanto tempo.

## O que é guardado

| Dado | Onde | Para quê | Base legal proposta | Por quanto tempo |
|---|---|---|---|---|
| Tema (claro ou escuro) e itens fixados | `localStorage` do navegador da pessoa | lembrar a preferência na próxima visita | não é dado pessoal: fica só no navegador, não vai para servidor nenhum | até a pessoa limpar o navegador |
| Usuário do GitHub e link do PR de quem concluiu um item | banco da API (tabela `conclusoes`) | mostrar quem fez cada item, que é o propósito do painel | legítimo interesse da comunidade; o dado já é público no GitHub, no PR mesclado | enquanto o item estiver no catálogo; apagado a pedido |
| Usuário do GitHub e papel na sessão | memória da API | saber quem está logado e o que pode fazer | execução do serviço pedido pela pessoa (o login) | até 8 horas, ou até sair, ou até a API reiniciar |
| Endereço IP | memória da API, no limite de pedidos | barrar excesso de pedidos | legítimo interesse (segurança) | a contagem vale 1 minuto; o endereço fica na memória até a API reiniciar ou limpar as janelas vencidas; não vai para log nem banco |
| Token do GitHub do login | memória da API, durante o retorno do login | ler o usuário uma vez | execução do serviço | descartado no mesmo pedido; nunca gravado |

## O que não é guardado

- E-mail, nome, foto ou qualquer dado do perfil além do usuário.
- O token do GitHub.
- Endereço IP, cookie ou usuário no log: o log guarda só a rota, o status e o tempo (T5.10, `api/src/log.mjs`).
- O formulário "Propor item" não envia nada: ele monta um link para abrir a issue no GitHub, na conta da própria pessoa.

## Direitos de quem aparece no painel

- **Ver**: `GET /v1/catalogo` mostra tudo o que a API guarda sobre conclusões.
- **Apagar**: a pessoa pede numa issue; um mantenedor apaga a conclusão. O repositório já tem `apagarConclusao`, mas ainda não há rota HTTP para isso: hoje o apagamento é direto no banco. A rota está proposta na issue "Rota para apagar uma conclusão a pedido". Prazo proposto: 15 dias.
- **Corrigir**: do mesmo jeito, por um mantenedor.

## Dados de teste

Os testes e o `npm run semear` usam só nomes fictícios (`pessoa-ficticia`, `pessoa-mantenedora`) e PRs de um repositório de exemplo. Nenhum dado real entra em teste, documento ou issue.

## Quem é o controlador

O responsável pela organização `learnTECH-community` no GitHub. Pedidos sobre dados pessoais vão pelo canal do [SECURITY.md](../SECURITY.md) ou numa issue, sem expor dado de outra pessoa.

## Para o responsável aprovar

1. A base legal de cada linha da tabela.
2. Mostrar o usuário do GitHub de quem concluiu cada item no painel publicado.
3. O prazo de 15 dias para apagar a pedido.
4. Você ser o controlador dos dados.
