# Roteiro da triagem diária (regra das 48 horas)

**A regra:** toda issue, PR ou conversa nas Discussions aberta por quem é de fora recebe a primeira resposta em até 48 horas. Conta como resposta um comentário de um membro da organização ou de alguém com acesso ao repositório. A regra está no [CONTRIBUTING.md](../../CONTRIBUTING.md), seção "Tempo de resposta" (PR #326, issue #324).

**Quando:** uma vez por dia, de segunda a sábado, de manhã. Leva de 5 a 15 minutos.

**Quem:** quem mantém o projeto. O relatório só lê o GitHub; responder, rotular e mesclar continua sendo uma pessoa.

## 1. Gerar o relatório (1 minuto)

```bash
node scripts/triagem.mjs            # grava triagem/AAAA-MM-DD.md (a pasta fica fora do Git)
```

O script chega com o PR #326. Ele precisa do `gh` com login feito.

## 2. Ler o resumo e agir pela cor

| No relatório | O que significa | O que fazer hoje |
|---|---|---|
| sem marca | aberta há menos de 36 h | responder, se der; se não, fica para amanhã |
| 🟠 | sem resposta há 36 h ou mais | **responder hoje**, nem que seja a resposta curta abaixo |
| 🔴 | passou das 48 h | responder agora e anotar o motivo no diário do dia |
| "respondido" | alguém de dentro já comentou | nada; acompanhar pela notificação |

## 3. Responder (respostas prontas)

Ajuste o nome e a tarefa. O importante é a pessoa saber que foi vista e quando terá retorno.

**Resposta curta (qualquer item):**
> Oi, @pessoa! Recebi, obrigado. Vou olhar com calma até <dia>. Se travar antes disso, pode perguntar aqui mesmo.

**Apresentação em Boas-vindas:**
> Que bom ter você aqui, @pessoa! Para a trilha <trilha>, uma boa primeira tarefa é a #<número>. Comente "vou fazer" nela e siga o "Comece em 15 minutos" do CONTRIBUTING.

**Dúvida:**
> Oi, @pessoa! Para eu entender: qual comando você rodou e qual mensagem apareceu? Se puder, cole o texto do erro (sem senhas ou dados pessoais).

**PR de quem é de fora:**
> Obrigado pelo PR, @pessoa! O CI está rodando. Eu reviso até <dia>. Enquanto isso, confira se a descrição diz qual issue o PR fecha (`Closes #N`).

## 4. Rotular e encaminhar

- Dúvida que virou defeito: abrir uma issue com o modelo "Defeito no painel ou na API" e linkar na conversa.
- Ideia que virou tarefa: abrir uma issue com o modelo "Novo item do catálogo" e linkar na conversa.
- Conversa de Dúvidas resolvida: pedir a quem perguntou que marque a resposta (*Mark as answer*).
- Conteúdo que fere o [código de conduta](../../CODE_OF_CONDUCT.md): seguir os passos de moderação de lá, e não discutir na conversa.

## 5. As outras partes do relatório

- **Dependabot:** PR com mais de 2 dias aparece na lista com a recomendação. Mesclar é de quem administra; a recomendação não é aplicada sozinha. A ordem e os motivos ficam no [CONTRIBUTING.md](../../CONTRIBUTING.md), seção "Dependências (Dependabot)".
- **Exceções do Trivy:** a que vence em até 7 dias ganha 🟠. Antes do vencimento, ou se atualiza a imagem, ou se renova a exceção com motivo.
- **1ª resposta nas abertas já respondidas:** a mediana e o pior caso, em horas, entre a abertura e o primeiro comentário de alguém de dentro. É a métrica "Time to First Response" da [CHAOSS](https://chaoss.community/kb/metric-time-to-first-response/). Com o pior acima de 48 h, ganha 🔴. Toda semana, anote a mediana e o pior na #324. Leia junto com a linha "Sem resposta há 36 h ou mais": quem ainda não foi respondido não entra no "pior". Uma review de alguém de dentro num PR também conta como resposta.
- **Issues de entrada livres:** conta as `good first issue` sem ninguém atribuído, sem PR ligado e sem um comentário de quem é de fora pedindo a issue ("vou fazer", "vou pegar", "quero fazer", "posso fazer?", "eu faço", "deixa comigo"; "não vou fazer" e "vou fazer uma pergunta" não contam). Abaixo de 10, ganha 🟠 repor: prepare uma nova no padrão do CONTRIBUTING, seção "Issues de entrada", e acrescente-a na lista do #311. As que têm alguém trabalhando aparecem em "Prazos", para acompanhar o PR.
- **`depende-do-responsavel`:** a lista do que está esperando quem administra. Serve para a conversa da semana, não para a triagem do dia.

## 6. Como saber se está funcionando

- **Meta:** zero 🔴 por semana.
- **Conferência:** toda semana, anotar na issue #324 quantos 🔴 apareceram e qual foi a primeira resposta mais lenta.
- **Se aparecer 🔴 duas semanas seguidas:** a regra está pesada para o tamanho da equipe. Discutir em Ideias se o prazo muda ou se entra mais alguém na triagem, em vez de deixar o prazo vencer calado.
