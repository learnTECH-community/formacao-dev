# Roteiro de resposta a incidente

O que fazer quando algo dá errado na segurança do painel ou da API: um segredo vazou, uma falha foi avisada, alguém mexeu no que não devia. Item T10.13 do catálogo. Para avisar, veja o [SECURITY.md](../SECURITY.md).

## Papéis

| Papel | Quem | O que pode |
|---|---|---|
| Quem acha | qualquer pessoa da comunidade | avisar pelo canal do `SECURITY.md`; não espalhar o segredo |
| Quem mantém | quem tem acesso de escrita ao repositório | abrir o aviso privado, corrigir o código, abrir PR |
| Responsável | dono da organização `learnTECH-community` | revogar e trocar segredos, mudar Settings, hospedagem e contas, reescrever histórico se decidir |

Agentes de IA seguem o papel "quem mantém": não revogam, não trocam segredos e não reescrevem histórico.

## Passos

### 1. Conter (quem mantém, na primeira hora)

- Abrir um aviso privado (Security → Advisories) ou uma issue sem detalhes, com o rótulo `depende-do-responsavel`.
- Se o problema está numa rota da API publicada, pedir ao responsável para desligar a rota ou o serviço.
- Não apagar logs: eles são a prova.

### 2. Revogar (responsável, assim que souber)

- Apagar um arquivo **não** revoga um segredo: ele segue no histórico do Git. Revogar é desligar a credencial onde ela foi criada:
  - token do GitHub: Settings → Developer settings → Personal access tokens → revogar;
  - app OAuth (`GITHUB_CLIENT_SECRET`): Settings da organização → OAuth Apps → gerar um segredo novo e apagar o antigo;
  - banco (`MONGO_URL`): apagar o usuário do banco e criar outro.

### 3. Trocar (responsável e quem mantém)

- O responsável cria a credencial nova e a põe **só** na variável do serviço (Render ou Actions), nunca no código.
- Quem mantém tira o valor do código, troca por `process.env.NOME` e confere com `node scripts/segredos.mjs`.
- Reescrever o histórico para apagar o segredo antigo é decisão do responsável. Com a credencial revogada, ela já não vale.

### 4. Avisar (responsável)

- Se dados de pessoas foram expostos, avisar as pessoas afetadas e registrar o que foi exposto (LGPD, ver [docs/dados-pessoais.md](dados-pessoais.md)).
- Responder a quem avisou, com o prazo do `SECURITY.md`.

### 5. Registrar (quem mantém)

- Uma issue com: o que aconteceu, quando, como foi achado, o que foi feito em cada passo e o horário de cada um.
- Uma lição nova no `docs/seguranca.md` ou um teste que pegaria o problema mais cedo.
- Publicar o aviso de segurança do GitHub depois da correção.

## Onde ler os logs

| Fonte | O que mostra | Quem acessa |
|---|---|---|
| Log da API (saída padrão, uma linha JSON por pedido) | id do pedido (`X-Request-Id`), método, rota, status, tempo; erros com a pilha. Sem token, cookie nem usuário (T5.10) | quem roda a API; no serviço publicado, o painel de logs da hospedagem (responsável) |
| GitHub Actions (aba Actions) | o que cada workflow rodou, com os segredos mascarados | quem mantém |
| Histórico do Git (`git log -p -S 'trecho'`) | em que commit um texto entrou e quem fez | qualquer pessoa |
| Log de auditoria da organização | quem mudou Settings, permissões e tokens | responsável |
| Aba Security (Dependabot, CodeQL, avisos) | dependências vulneráveis, alertas de código e avisos privados | quem mantém |

## Ensaio com um segredo falso (10/11/2026)

Ensaio feito num repositório descartável, fora deste, com um token do GitHub **falso** (o prefixo certo e 36 caracteres inventados). Os tempos dos passos automáticos foram medidos com `date +%s%3N`; os passos de pessoa foram percorridos no papel, sem credencial real.

| Etapa | O que foi feito | Tempo |
|---|---|---|
| Vazar | arquivo `config.mjs` com o token falso, commit | 0,5 s |
| Detectar | `conferirRepositorio()` do `scripts/segredos.mjs` → `config.mjs:1: parece token do GitHub` | 0,3 s |
| Conter | no ensaio, nada publicado; no caso real, abrir a issue sem detalhes | (papel) |
| Revogar | token falso: nada a revogar. No caso real, é o passo 2, do responsável | (papel) |
| Trocar | `config.mjs` passou a ler `process.env.GITHUB_TOKEN`, commit, nova conferência → nenhum achado | 0,6 s |
| Registrar | esta seção | — |

O que o ensaio mostrou:
- O detector pega o token antes do push, se a pessoa roda `node scripts/segredos.mjs` (ou no CI, depois do push).
- Depois da troca, o arquivo ficou limpo, mas `git log --all -p | grep -c <prefixo do token falso>` ainda achou **2** linhas no histórico. Por isso o passo "revogar" vem antes de "trocar": apagar do código não basta.
- O passo mais lento é o de pessoa (revogar e avisar). Meta: revogar em até 1 hora depois do aviso.

Repita o ensaio uma vez por semestre ou quando entrar um segredo novo na API.
