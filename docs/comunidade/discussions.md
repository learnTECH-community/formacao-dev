# Discussions: categorias e passo a passo da abertura

As Discussions são a porta de entrada de quem chega pelo [CONTRIBUTING.md](../../CONTRIBUTING.md) ("Comece em 15 minutos") e pela issue [Comece aqui (#311)](https://github.com/learnTECH-community/formacao-dev/issues/311). Este documento traz o texto de cada categoria e o passo a passo para quem administra o repositório. Criar categorias, publicar e ligar opções é configuração: só quem administra faz (issue #320).

## As 4 categorias

O GitHub já cria 6 categorias em inglês (Announcements, General, Ideas, Polls, Q&A e Show and tell). Em vez de criar outras, **edite 4 delas**: o formato certo já vem pronto e nada se perde. Polls fica como está.

| Editar a categoria | Novo nome | Emoji | Formato | Descrição (copie) |
|---|---|---|---|---|
| General | **Boas-vindas** | 👋 | Open-ended discussion | Chegou agora? Conte quem é você, o que quer aprender e em qual trilha vai começar. O post fixado mostra o caminho dos primeiros 15 minutos. |
| Q&A | **Dúvidas** | 🙏 | Question / Answer | Travou numa tarefa? Diga qual, o que tentou e o que aconteceu. Quem perguntou marca a resposta que resolveu. |
| Ideas | **Ideias** | 💡 | Open-ended discussion | Proposta de tarefa nova, de trilha ou de melhoria no Painel de Formação. Diga o problema que ela resolve. |
| Show and tell | **Mostre seu projeto** | 🙌 | Open-ended discussion | Compartilhe o que você construiu com o que aprendeu aqui: link, print e qual tarefa do catálogo praticou. |

**Por que Boas-vindas é "Open-ended", e não "Announcement":** no formato Announcement só quem mantém o projeto pode abrir conversa. A categoria precisa receber a apresentação de quem chega. O post de boas-vindas fica fixado no topo dela do mesmo jeito. Announcements (avisos do projeto) fica como está, para uso da manutenção.

## Formulários de cada categoria

Os arquivos em [`.github/DISCUSSION_TEMPLATE/`](../../.github/DISCUSSION_TEMPLATE) viram formulários quando alguém abre uma conversa. O nome de cada arquivo precisa ser igual ao *slug* da categoria, a parte final do endereço dela:

| Arquivo | Categoria | Endereço esperado |
|---|---|---|
| `boas-vindas.yml` | Boas-vindas | `/discussions/categories/boas-vindas` |
| `duvidas.yml` | Dúvidas | `/discussions/categories/duvidas` |
| `ideias.yml` | Ideias | `/discussions/categories/ideias` |
| `mostre-seu-projeto.yml` | Mostre seu projeto | `/discussions/categories/mostre-seu-projeto` |

Se, depois de renomear, o endereço de alguma categoria ficar diferente, o formulário não aparece. Nesse caso, avise nas issues (#320): é só renomear o arquivo num PR pequeno.

## Passo a passo para quem administra

Faça depois do merge do PR da sprint na `main` (#318), para que os links do post apontem para arquivos que já existem na `main`.

1. **Conferir que as Discussions estão ligadas.** Em [Settings → General → Features](https://github.com/learnTECH-community/formacao-dev/settings), a caixa *Discussions* deve estar marcada. Hoje ela já está.
2. **Editar as 4 categorias.** Abra [Discussions](https://github.com/learnTECH-community/formacao-dev/discussions), clique no lápis ao lado de *Categories* e, em cada linha da tabela acima, clique em *Edit*: troque o nome, o emoji, a descrição e confira o formato. Salve com *Save changes*.
3. **Conferir os endereços.** Clique em cada categoria e compare o fim do endereço com a tabela dos formulários.
4. **Publicar o post de boas-vindas.** Clique em *New discussion*, escolha **Boas-vindas** e cole o título e o texto de [boas-vindas.md](boas-vindas.md). Revise antes de publicar: o post sai em seu nome.
5. **Fixar o post.** Dentro do post, na barra da direita, clique em *Pin discussion* e confirme. Ele passa a aparecer no topo da página de Discussions.
6. **Ligar a denúncia de conteúdo.** Em [Settings → General → Moderation options](https://github.com/learnTECH-community/formacao-dev/settings), em *Reported content*, escolha que qualquer pessoa pode denunciar e que as denúncias vão para quem mantém o projeto. Assim, o caminho de denúncia do [código de conduta](../../CODE_OF_CONDUCT.md) passa a existir de verdade.
7. **Avisar.** Comente na issue #320 "feito". A partir daí, a [triagem diária](triagem.md) passa a contar as conversas abertas.

Nada aqui apaga dados. Se quiser desfazer, as categorias podem ser renomeadas de volta e o post pode ser desafixado.
