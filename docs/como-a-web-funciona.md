# Como a web funciona: do endereço até o painel na tela

Item **T0.1** do catálogo. Este texto segue o caminho de um pedido real: abrir o Painel de Formação no navegador. Hoje o painel roda na sua máquina (`npm run painel`, em `http://127.0.0.1:4317/`). Quando a T9.3 publicar o painel no GitHub Pages, o caminho ganha as etapas de DNS e HTTPS descritas abaixo. As duas versões aparecem no texto.

## O caminho em uma figura

```mermaid
sequenceDiagram
    autonumber
    actor P as Pessoa
    participant N as Navegador
    participant D as DNS
    participant S as Servidor (Pages ou Vite local)

    P->>N: digita o endereço e aperta Enter
    N->>D: qual é o IP deste nome?
    D-->>N: IP do servidor
    N->>S: abre a conexão (TCP e, em HTTPS, TLS)
    N->>S: GET / (HTTP)
    S-->>N: 200 OK + index.html
    N->>N: lê o HTML e monta o DOM
    N->>S: GET do CSS e do script principal
    S-->>N: 200 OK + arquivos
    N->>N: CSS vira CSSOM; DOM + CSSOM viram a árvore de renderização
    N->>N: layout e pintura: a página aparece
    N->>S: fetch("CATALOGO.md") pelo JavaScript do painel
    S-->>N: 200 OK + texto do catálogo
    N->>N: o JS transforma o texto em dados e desenha trilhas e barras
```

## 1. O endereço

O endereço (URL) tem partes com funções diferentes. Em `https://exemplo.github.io/formacao-dev/`:
- `https` é o protocolo: como o navegador vai conversar com o servidor;
- `exemplo.github.io` é o nome do servidor;
- `/formacao-dev/` é o caminho do recurso dentro dele.

No uso local, `http://127.0.0.1:4317/` já traz o IP (`127.0.0.1` é a própria máquina) e a porta (`4317`), então não há nome para traduzir.

## 2. DNS: do nome ao IP

Computadores se acham por números (IPs), não por nomes. O navegador pergunta a um servidor DNS qual IP corresponde ao nome. A resposta costuma ficar guardada por um tempo (cache) no navegador, no sistema e no provedor, então a segunda visita pula essa etapa. Sem a resposta do DNS, não há como seguir: o navegador mostra um erro de "endereço não encontrado".

## 3. A conexão: TCP e TLS

Com o IP em mãos, o navegador abre uma conexão TCP com o servidor, na porta 443 (HTTPS) ou 80 (HTTP). O TCP garante que os pedaços da conversa chegam inteiros e na ordem.

Em HTTPS, logo depois vem o TLS: o servidor mostra um certificado que prova ser dono do nome, e os dois combinam uma chave para cifrar o resto da conversa. Ninguém no meio do caminho consegue ler ou trocar o que passa. O GitHub Pages serve os sites com HTTPS. No uso local, o Vite fala HTTP simples, o que só é aceitável porque o pedido não sai da máquina.

## 4. HTTP: pedido e resposta

Pela conexão, o navegador manda um pedido HTTP: o método (`GET`), o caminho (`/`) e cabeçalhos (que tipos de arquivo aceita, idioma, cache). O servidor responde com:
- um código de situação: `200` deu certo, `404` não achou, `500` erro no servidor;
- cabeçalhos, como `Content-Type: text/html`;
- o corpo: aqui, o `index.html`.

O servidor do painel é simples: ele só entrega arquivos prontos. Em produção quem faz isso é o GitHub Pages; no uso local, o Vite. Os dois respondem do mesmo jeito para o navegador.

## 5. O navegador e o HTML

O navegador lê o HTML de cima para baixo e monta o **DOM**, a árvore de elementos da página (`header`, `nav`, `main`, `footer`...). Ao achar um `<link rel="stylesheet">` ou um `<script>`, ele pede esses arquivos ao servidor, cada um com seu próprio pedido HTTP.

Dois detalhes do painel mostram como a ordem importa:
- o script do tema fica escrito dentro do `<head>` (inline): o navegador para a leitura, roda o script e só então segue. É de propósito: o tema escolhido é aplicado antes de pintar, e a página não pisca no tema errado. Por ser inline e pequeno, não custa um pedido de rede (T7.12).
- o script principal (`painel/src/main.tsx`, que o Vite converte em JavaScript) é `type="module"`: o navegador o baixa sem parar a leitura e só o executa depois que o HTML inteiro foi lido.

## 6. O CSS

O CSS vira o **CSSOM**, a árvore de regras de estilo. O navegador junta DOM e CSSOM na árvore de renderização, que só tem o que aparece na tela. Enquanto o CSS não chega, o navegador não pinta, para não mostrar a página sem estilo e depois trocar tudo.

## 7. Layout e pintura

Com a árvore de renderização, o navegador calcula o tamanho e a posição de cada caixa (layout), conforme a largura da tela. É aqui que o CSS responsivo do painel (T2.2) decide se os cartões das trilhas ficam em uma, duas ou três colunas. Depois vem a pintura: cores, textos e bordas viram pixels.

## 8. O JavaScript do painel

O script principal faz mais um pedido HTTP, desta vez pelo código: `fetch("CATALOGO.md")`. Enquanto espera, a página diz "Carregando o catálogo…". Com a resposta, a função `lerCatalogo` transforma o texto em dados (trilhas e itens) e o painel desenha as barras de progresso. Cada mudança no DOM faz o navegador recalcular o layout e pintar de novo a parte afetada. Se o pedido falhar, a página mostra o erro e o botão "Tentar de novo" (T3.5).

## Fontes

Escrito com palavras próprias a partir de:
- MDN Web Docs, [How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works) (lido em 10/11/2026): DNS, TCP/IP, HTTP e a ordem dos arquivos.
- MDN Web Docs, [Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work) (lido em 10/11/2026): conexão TCP e TLS, montagem do DOM e do CSSOM, layout e pintura.
- MDN Web Docs, [Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) (lido em 10/11/2026): pedido, resposta, métodos e códigos de situação.
- Roadmap de referência da trilha T0: [Full Stack](https://roadmap.sh/full-stack), no roadmap.sh (só o link, ver ADR 001).
