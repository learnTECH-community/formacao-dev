# ADR 001 · Usar o roadmap.sh só por link

**Data:** 10/11/2026 · **Situação:** aceita

## Contexto

O pedido era catalogar os itens do roadmap.sh e marcá-los conforme o repositório cresce. O conteúdo do roadmap.sh fica no repositório `kamranahmedse/developer-roadmap`, e a licença dele, lida em 10/11/2026, diz que:
- o texto e as imagens têm direitos autorais;
- o uso pessoal é permitido;
- publicar o conteúdo em qualquer forma, inclusive escrita, não é permitido sem consentimento;
- compartilhar os links do repositório e do site é permitido.

Este repositório é público. Copiar a lista de itens de cada roadmap seria publicar o conteúdo.

## Decisão

- O catálogo (`CATALOGO.md`) é **próprio**: os 63 itens foram escritos pela comunidade, com palavras nossas, como tarefas práticas no Painel de Formação.
- Cada trilha leva o **link** do roadmap correspondente no roadmap.sh. Os links foram conferidos em 10/11/2026 (HTTP 200).
- Nenhum texto, imagem ou estrutura de nós do roadmap.sh é copiado.
- Quem quiser acompanhar o progresso pessoal nó a nó pode usar a conta do próprio roadmap.sh, que tem esse recurso.

## Consequências

- O catálogo não espelha o roadmap.sh nó a nó. A ligação é por trilha.
- Se o autor do roadmap.sh autorizar por escrito, esta ADR pode ser revista para espelhar os nós.

## Como desfazer

Pedir o consentimento ao autor, conforme a licença, e registrar a resposta numa ADR nova.
