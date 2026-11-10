# Política de segurança

Este repositório é o Painel de Formação da learnTECH Community: um site estático que lê o `CATALOGO.md` e uma API em Node (`api/`) que ainda não está publicada.

## Como avisar uma falha

**Não abra uma issue pública** com os detalhes de uma falha de segurança.

1. Use o aviso privado do GitHub: aba **Security** → **Report a vulnerability** ([link direto](https://github.com/learnTECH-community/formacao-dev/security/advisories/new)). Só quem mantém o repositório lê.
   - Se o botão não aparecer, o aviso privado ainda não foi ligado no repositório (configuração do responsável). Nesse caso, abra uma issue com o título **"Pedido de contato de segurança"** e **nenhum detalhe** da falha. Quem mantém responde com um canal privado.
2. Conte o que achou, como reproduzir (passos, pedido, versão ou commit) e o impacto que você imagina.
3. Não use dados reais de outras pessoas para provar a falha. Use contas e nomes fictícios.

Se achou um segredo (token, senha, chave) num commit, avise do mesmo jeito. Não copie o segredo no aviso: diga só o arquivo e o commit.

## O que esperar

| Etapa | Prazo |
|---|---|
| Confirmação de que recebemos | até 3 dias úteis |
| Primeira avaliação (é falha? qual a gravidade?) | até 7 dias úteis |
| Correção ou plano, para falha alta ou crítica | até 30 dias |

Somos uma comunidade de estudo, sem equipe de plantão: os prazos são a nossa meta, não um contrato. Avisamos se precisarmos de mais tempo. Depois da correção, a falha é descrita no aviso do GitHub, com o crédito para quem avisou, se a pessoa quiser.

## O que está no escopo

- O código deste repositório: o painel (`painel/`), a API (`api/`), os scripts (`scripts/`) e os workflows (`.github/workflows/`).
- O site publicado do painel, quando houver (item T9.3 do catálogo).

Fora do escopo: o roadmap.sh e outros sites para os quais o catálogo só aponta; ataques de negação de serviço por volume; engenharia social contra pessoas da comunidade.

## Versões

Só a `main` recebe correção. Não mantemos versões antigas.

## Como a gente cuida

- Proteções e testes: [docs/seguranca.md](docs/seguranca.md).
- O que fazer quando algo vaza: [docs/incidente.md](docs/incidente.md).
- Dependências: Dependabot semanal e `npm audit` no CI ([CONTRIBUTING.md](CONTRIBUTING.md)).
