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

Faça depois do merge do PR da sprint na `main` (#318), para que os links do post apontem para arquivos que já existem na `main`. Leva cerca de 15 minutos. Em cada passo, a coluna "O que aparece na tela" diz o que você deve ver. Se aparecer outra coisa, pare e tire um print: ele mostra onde o caminho mudou.

| # | Faça | O que aparece na tela (o print esperado) |
|---|---|---|
| 1 | **Conferir que as Discussions estão ligadas.** Abra [Settings](https://github.com/learnTECH-community/formacao-dev/settings) e desça até *Features*. | Na lista de recursos, a caixa *Discussions* está marcada, com o botão *Set up discussions* ou *Discussions* ao lado. Hoje ela já está ligada: só confira. |
| 2 | **Abrir o editor de categorias.** Abra [Discussions](https://github.com/learnTECH-community/formacao-dev/discussions). Na coluna da esquerda, ao lado de *Categories*, clique no lápis. | A página *Manage discussion categories*, com 6 linhas: Announcements, General, Ideas, Polls, Q&A e Show and tell, cada uma com *Edit* e *Delete*. **Não clique em Delete.** |
| 3 | **Editar as 4 categorias.** Em General, Q&A, Ideas e Show and tell, clique em *Edit* e preencha como na tabela "As 4 categorias" acima: o emoji, o nome, a descrição e o formato. Salve cada uma com *Save changes*. | O formulário *Edit category*, com o campo do emoji à esquerda do nome, a descrição abaixo e os formatos (*Open-ended discussion*, *Question / Answer*, *Announcement*, *Poll*) como opções. Depois de salvar, a lista mostra os nomes novos. |
| 4 | **Conferir os endereços.** Volte a Discussions e clique em cada categoria nova. | O endereço termina em `/categories/boas-vindas`, `/duvidas`, `/ideias` e `/mostre-seu-projeto`. Se algum for diferente, anote e avise na #320: eu ajusto o nome do formulário. |
| 5 | **Conferir um formulário.** Em Dúvidas, clique em *New discussion*. | Os campos "Em qual tarefa ou issue você está?", "O que você tentou?" e "O que aconteceu, e o que você esperava?", em vez de uma caixa de texto em branco. Feche sem publicar. |
| 6 | **Publicar o post de boas-vindas.** Em Boas-vindas, clique em *New discussion* e cole o título e o texto de [boas-vindas.md](boas-vindas.md). Use a aba *Preview* para revisar antes de clicar em *Start discussion*. O post sai em seu nome. | No *Preview*: o título, 3 blocos com subtítulos (Por onde começar, Onde conversar, Nosso compromisso) e os links em azul. Depois de publicar, a página do post, com o seu nome e a categoria Boas-vindas. |
| 7 | **Fixar o post.** Na página do post, na coluna da direita, clique em *Pin discussion* e depois em *Pin discussion* de novo na janela. | Na página inicial das Discussions, o post aparece num cartão no topo, acima da lista. |
| 8 | **Ligar a denúncia de conteúdo.** Abra [Settings](https://github.com/learnTECH-community/formacao-dev/settings). Na coluna da esquerda, em *Access*, clique em *Moderation options* e depois em *Reported content*. Escolha a opção que aceita denúncias de todos e salve. | A página *Reported content*, com as opções de quem pode denunciar (todos, quem já contribuiu, ou só colaboradores e membros). Depois de salvar, aparece a confirmação no topo. A partir daí, o menu `...` de cada comentário mostra *Report content*. |
| 9 | **Avisar.** Comente "feito" na issue #320, com um print dos passos 4 e 7. | A partir do dia seguinte, a [triagem diária](triagem.md) passa a contar as conversas abertas. |

Nada aqui apaga dados. Para desfazer, renomeie as categorias de volta e desafixe o post.
