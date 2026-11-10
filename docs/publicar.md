# Publicar o painel e a API

Passo a passo da publicação (trilha T9). O código e os workflows estão no repositório; **ligar cada serviço é do responsável**: contas, Settings, variáveis e segredos. Nenhum segredo entra neste documento nem no Git. A issue que acompanha a publicação é a #230.

| O quê | Onde | Workflow ou arquivo | Item |
|---|---|---|---|
| Painel | GitHub Pages | `.github/workflows/pages.yml` | T9.3 |
| API | Render (ou parecido), com MongoDB Atlas M0 | `render.yaml` | T9.5 |
| Imagem da API | GitHub Container Registry | `.github/workflows/imagem.yml` | T9.10 |
| Checagem de disponibilidade | GitHub Actions, a cada 6 horas | `.github/workflows/disponibilidade.yml` | T9.8 |

## Painel no GitHub Pages (T9.3)

O workflow `Pages` roda quando o CI termina verde na `main` (ou à mão, em Actions → Pages → Run workflow). Ele gera o build com a base `/formacao-dev/` e publica o `dist/`. O build traz o `404.html` igual ao `index.html`, para o Pages abrir as rotas do React (`/trilha/T2`). Em PR, o job `previa` gera o mesmo build e confere os caminhos.

Do responsável:
1. Settings → Pages → **Build and deployment → Source: GitHub Actions**.
2. Settings → Secrets and variables → Actions → aba **Variables** → `PAGES_ATIVO` = `sim`. Sem ela, o job de publicação fica pulado e a `main` segue verde.
3. Settings → Pages → marcar **Enforce HTTPS** (T10.10).
4. Rodar Actions → Pages → **Run workflow** na `main`, ou esperar o próximo merge.
5. Conferir: `curl -I https://learntech-community.github.io/formacao-dev/` → 200; abrir `/formacao-dev/trilha/T2` e recarregar a página (a rota abre, sem 404).
6. Com a API publicada: variável `URL_DA_API` = endereço da API (`https://...`, sem barra no fim). O próximo build do Pages passa a ler a API.

Depois do passo 5, o critério 7 do `docs/MVP.md` pode ser medido no ar (`npm run lcp -- https://learntech-community.github.io/formacao-dev/`), se o projeto passar a N2.

## Checagem de disponibilidade (T9.8)

O workflow `Disponibilidade` roda a cada 6 horas (minuto 23) e à mão. Ele chama o painel e o `/v1/health` da API com `scripts/disponibilidade.mjs` e grava a tabela (situação, endereço, status, tempo) no resumo da execução: o histórico fica em Actions → Disponibilidade. Se algum endereço falhar, ele abre a issue "Incidente: painel ou API fora do ar" com o rótulo `incidente`, ou comenta nela se já estiver aberta. O log mostra só o endereço, o status e o tempo.

Do responsável, depois da publicação:
1. Variables → `URL_DO_PAINEL` = `https://learntech-community.github.io/formacao-dev/`.
2. Variables → `URL_DA_API` = endereço da API publicada.
3. Actions → Disponibilidade → **Run workflow** e conferir a tabela no resumo.
4. Para testar o aviso, pôr por um momento um endereço que não existe em `URL_DA_API`, rodar, ver a issue de incidente aberta e voltar o valor.

Sem as duas variáveis, o job registra "nada a conferir" e termina verde.
