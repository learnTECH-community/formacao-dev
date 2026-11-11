# Changelog da API

Mudanças da API do Painel de Formação, da mais nova para a mais antiga. A política de versão e de desativação está em [docs/api.md](../docs/api.md#versões-e-desativação).

Tipos de mudança: **Novo**, **Mudou**, **Antiga** (vai sair, com data), **Removido**, **Corrigido**.

## v1 · 10/11/2026

- **Novo:** `GET /v1/health`, que lê o repositório de dados (T5.1).
- **Novo:** `GET /v1/catalogo`, com as trilhas, os itens e quem fez cada item (T5.1).
- **Novo:** `POST /v1/conclusoes`, com validação e erros em Problem Details (T5.2, T5.9).
- **Novo:** `GET /v1/itens`, com filtros por trilha e situação e paginação, e `GET /v1/itens/{codigo}` (T5.12).
- **Novo:** log em JSON com `X-Request-Id` (T5.10).
- **Novo:** cache do catálogo com tempo de vida, `ETag`, `Cache-Control` e 304 (T5.7).
- **Novo:** `POST /v1/sincronizar`, que lê os PRs mesclados na `main` ou numa sprint e grava quem fez cada item (T5.4).
- **Novo:** limite de pedidos por minuto e falhas do GitHub em 502 e 503 (T5.5).
- **Novo:** `GET /v1/progresso.csv`, o progresso em CSV por stream (T5.11).
- **Novo:** `GET /v1/progresso/trilhas` (da view `v_progresso_trilha`) e `GET /v1/progresso/pessoas` (T6.2, T6.10).
- **Novo:** `GET /v1/trilhas/{codigo}/concluintes`, quem concluiu a trilha inteira (T6.8).
- **Novo:** login com a conta do GitHub (`/v1/auth/entrar`, `retorno`, `sair`, `eu`), sessão em cookie (T5.13).
- **Mudou:** `POST /v1/conclusoes` passa a exigir sessão com o papel `mantenedor`: 401 sem sessão, 403 sem o papel (T5.14).
- **Novo:** `GET /v1/eventos`, avisos em tempo real com SSE (T5.8); `GET /v1/catalogo` passa a trazer os `roadmaps` de cada trilha.
- **Novo:** `GET /v1/ranking` e `GET /v1/progresso/semanas` (T6.9).
- **Novo:** `REPOSITORIO=mongo`: o mesmo contrato com o MongoDB (T6.12, T6.13).
- **Antiga:** `GET /v1/catalogo.md` devolve o texto do `CATALOGO.md` para o painel atual. Antiga desde 10/11/2026; sai do ar em 08/02/2027. Use `GET /v1/catalogo` (T5.15).
