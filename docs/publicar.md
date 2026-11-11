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

## API no Render, com o MongoDB Atlas (T9.5)

O `render.yaml` da raiz é um Blueprint: ele cria o serviço `formacao-dev-api` no plano gratuito, a partir do `api/Dockerfile` (estágio final, sem root), com o `/v1/health` como checagem de saúde. O disco do plano gratuito some a cada deploy, por isso o banco é o MongoDB Atlas M0 (`REPOSITORIO=mongo`), e não o SQLite.

Do responsável:

**1. Banco no Atlas M0**
1. Criar um cluster M0. Na criação, **desmarcar** "Automate security setup" e "Preload sample dataset" (o assistente cria usuário com papel de administrador).
2. Database Access → Add New Database User, só para esta API: senha gerada, só com letras e números; Specific Privileges → `readWrite` com Database = `painel` e Collection vazia (o papel aparece como `readWrite@painel`).
3. Network Access → Allow Access from Anywhere (`0.0.0.0/0`): o plano gratuito do Render não tem IP fixo.
4. Copiar a URI com o nome do banco antes do `?`: `mongodb+srv://<usuario>:<senha>@<cluster>/painel?retryWrites=true&w=majority`. Ela é segredo: vai só no Render.

**2. Serviço no Render**
1. Render → New → **Blueprint** → este repositório, branch `main`.
2. Preencher os valores pedidos (`sync: false`): `MONGO_URL` (a URI do passo 1.4), `MANTENEDORES` (logins do GitHub, separados por vírgula) e, se for ligar o login, `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` (app OAuth da organização, com a URL de retorno `https://<api>/v1/auth/retorno`). `GITHUB_TOKEN` é opcional. A `CHAVE_DA_SESSAO` o Render gera.
3. Apply e acompanhar os logs até a linha `API em http://0.0.0.0:4320/v1/health (MongoDB, banco painel)`.

**3. Conferir o endereço real**

O nome `formacao-dev-api.onrender.com` pode já ser de outra conta; nesse caso o Render acrescenta um sufixo. Copiar o endereço real do painel do Render e, se for diferente, corrigir por PR o `URL_DE_RETORNO` do `render.yaml` e a variável `URL_DA_API` do repositório.

**4. Conferir no ar** (registrar comando, data e resultado no `docs/MVP.md`)
1. `curl -i https://<api>/v1/health` → 200 com `"repositorio":{"situacao":"ok"`: esse `/health` lê o banco.
2. `curl -s https://<api>/v1/catalogo | head -c 300` → as trilhas.
3. `curl -I http://<api>/v1/health` → 308 para `https://` e `curl -I https://<api>/v1/health` → `strict-transport-security` (T10.10).
4. `curl -i -X POST -H 'Origin: https://site-de-fora.exemplo' https://<api>/v1/conclusoes` → 403 (T10.8).
5. Definir a variável `URL_DA_API` no repositório e rodar o Pages: o painel publicado passa a ler a API.

**Limites do plano gratuito:** a API dorme depois de uns 15 minutos sem acesso e leva cerca de 1 minuto para acordar; até 512 MB de memória; o M0 tem 512 MB de dados.

**Atenção ao login:** o painel no Pages (`github.io`) e a API no Render (`onrender.com`) são sites diferentes. O cookie da sessão é `SameSite=Lax` (T10.8) e não vai nos `fetch` de um site para o outro: o login funciona na API, mas o painel publicado não verá a sessão. Para o login valer no painel, os dois precisam ficar no mesmo site (um domínio próprio, como `painel.exemplo.org` e `api.exemplo.org`). Essa decisão é do responsável, na #230. A leitura do catálogo e de quem fez cada item funciona sem login.

## Checagem de disponibilidade (T9.8)

O workflow `Disponibilidade` roda a cada 6 horas (minuto 23) e à mão. Ele chama o painel e o `/v1/health` da API com `scripts/disponibilidade.mjs` e grava a tabela (situação, endereço, status, tempo) no resumo da execução: o histórico fica em Actions → Disponibilidade. Se algum endereço falhar, ele abre a issue "Incidente: painel ou API fora do ar" com o rótulo `incidente`, ou comenta nela se já estiver aberta. O log mostra só o endereço, o status e o tempo.

Do responsável, depois da publicação:
1. Variables → `URL_DO_PAINEL` = `https://learntech-community.github.io/formacao-dev/`.
2. Variables → `URL_DA_API` = endereço da API publicada.
3. Actions → Disponibilidade → **Run workflow** e conferir a tabela no resumo.
4. Para testar o aviso, pôr por um momento um endereço que não existe em `URL_DA_API`, rodar, ver a issue de incidente aberta e voltar o valor.

Sem as duas variáveis, o job registra "nada a conferir" e termina verde.
