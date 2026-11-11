# ADR 004 · Banco relacional ou em documentos para o painel

**Data:** 10/11/2026 · **Situação:** aceita · Item T6.4

## Contexto

A API do painel (trilhas T5 e T6) guarda as **conclusões**: quem fez cada item e com qual PR. As trilhas e os itens vêm do `CATALOGO.md`, mas o banco guarda uma cópia deles para checar as chaves e responder às consultas. As consultas do painel são:

- progresso por trilha (itens feitos sobre o total, T6.2 e T6.10);
- progresso por pessoa (T6.2);
- quem concluiu uma trilha inteira (T6.8);
- ranking e progresso por semana (T6.9).

A trilha T6 pede para comparar dois modelos: relacional (SQLite no estudo, com caminho para Postgres) e em documentos (MongoDB, T6.12 e T6.13).

## O mesmo dado nos dois modelos

Uma conclusão, no **modelo relacional** (`api/migracoes/`), é uma linha que aponta para o item, que aponta para a trilha:

```sql
-- trilhas(codigo PK)  ←  itens(codigo PK, trilha FK)  ←  conclusoes(id PK, item FK)
INSERT INTO conclusoes (item, usuario, pr, concluida_em)
VALUES ('T2.3', 'pessoa-ficticia-01', 'https://github.com/exemplo/repo/pull/12', '2026-11-10T12:00:00.000Z');
-- UNIQUE (item, usuario) impede a repetição; a chave estrangeira impede item que não existe.
```

No **modelo em documentos**, há duas formas comuns. Embutir as conclusões no item:

```json
{
  "_id": "T2.3",
  "trilha": { "codigo": "T2", "nome": "Frontend base" },
  "texto": "Barra de progresso acessível",
  "conclusoes": [
    { "usuario": "pessoa-ficticia-01", "pr": "https://github.com/exemplo/repo/pull/12", "concluidaEm": "2026-11-10T12:00:00.000Z" }
  ]
}
```

Ou uma coleção só de conclusões, com o código da trilha repetido em cada uma para não precisar de junção:

```json
{ "_id": "...", "item": "T2.3", "trilha": "T2", "usuario": "pessoa-ficticia-01", "pr": "https://github.com/exemplo/repo/pull/12", "concluidaEm": "2026-11-10T12:00:00.000Z" }
```

## Critérios

| Critério | Relacional | Documentos |
|---|---|---|
| **Integridade** | O banco recusa dado ruim: chave estrangeira, `UNIQUE`, `CHECK` (T6.7). A regra vale para qualquer cliente, até um `INSERT` à mão. | O índice único também existe. Mas não há chave estrangeira: uma conclusão de item que não existe entra, a não ser que o código cheque. Validação de esquema (`$jsonSchema`) cobre o formato, não a ligação entre coleções. |
| **Consultas do painel** | Todas são agregações que cruzam conclusões, itens e trilhas. `JOIN`, `GROUP BY`, funções de janela e view resolvem em SQL, com plano de execução para conferir (T6.2, T6.8). | Embutindo, o progresso de um item é uma leitura só; mas "por pessoa" e "ranking" precisam abrir todos os itens. Em coleção separada, a agregação (`$match`, `$group`, `$lookup`) resolve, com o código da trilha copiado em cada documento. |
| **Escala** | Os números do painel são pequenos (161 itens, dezenas de pessoas). Um SQLite aguenta com folga; Postgres aguenta muito mais. Escalar escrita para vários servidores exige mais trabalho. | Distribui bem os dados em vários servidores (sharding). É uma vantagem para volumes que o painel não tem nem deve ter. |
| **Mudança de forma** | Mudar uma coluna pede migração (o que já fazemos, numerada e testada, T6.3). | Documentos aceitam campos novos sem migração. Em troca, documentos antigos e novos convivem com formas diferentes, e o código lida com as duas. |
| **Custo de operação** | SQLite: um arquivo, sem servidor, dentro do Node (`node:sqlite`). Postgres gerenciado tem plano gratuito em vários provedores. | Precisa de um servidor (ou do Atlas). No CI, um contêiner de serviço. |

## Decisão

- O painel usa **banco relacional**: SQLite no estudo, com o mesmo SQL pensado para migrar a Postgres se a API for publicada.
- Motivo principal: os dados são poucos, muito ligados entre si (trilha → item → conclusão) e as consultas são agregações que cruzam as três tabelas. A integridade fica no banco, não no código.
- O MongoDB entra como **estudo** (T6.12 e T6.13): um repositório alternativo com a mesma interface, escolhido por variável de ambiente, para comparar na prática. Não é o banco padrão.

## Quando usar cada um

- **Relacional:** dados com ligações fortes e regras que não podem falhar (pagamento, estoque, matrícula); relatórios que cruzam tabelas; quando a forma dos dados é estável.
- **Documentos:** cada registro é lido e gravado inteiro e quase sem ligação com outros (um perfil, um carrinho, um evento de log); a forma muda muito ou varia por registro; o volume pede distribuir os dados em vários servidores.

## Consequências

- As regras ficam no banco e no código (a API também valida, T5.2): duas linhas de defesa.
- Quem for publicar a API escolhe um Postgres ou mantém o SQLite num disco persistente. Essa escolha é do responsável.
- O repositório MongoDB (T6.12) precisa repetir no código as regras que o relacional tem no banco, e os testes de contrato do repositório mostram se ele consegue.

## Como desfazer

Se o painel passar a ter dados sem ligação entre si e em volume alto, ou se a hospedagem escolhida só oferecer MongoDB, trocar o repositório padrão pelo de documentos: a interface (`api/src/repositorios/contrato.mjs`) é a mesma, e a troca é uma variável de ambiente. Registrar numa ADR nova.

## Fontes

Lidas em 10/11/2026; as ideias acima estão escritas com palavras próprias.
- SQLite, "Appropriate Uses For SQLite": https://www.sqlite.org/whentouse.html
- SQLite, "SQLite Foreign Key Support": https://www.sqlite.org/foreignkeys.html
- MongoDB, "Data Modeling" (embutir ou referenciar): https://www.mongodb.com/docs/manual/data-modeling/
- MongoDB, "Schema Validation": https://www.mongodb.com/docs/manual/core/schema-validation/
- Kleppmann, M. *Designing Data-Intensive Applications*. O'Reilly, 2017, capítulo 2 (modelos relacional e de documentos).
