# syntax=docker/dockerfile:1
# T9.4 e T9.12: imagem da API em estágios.
# O contexto do build é a raiz do repositório (a API lê o CATALOGO.md da raiz):
#   docker build -f api/Dockerfile -t formacao-dev-api .
# Dentro da imagem, as pastas seguem o repositório: /app/CATALOGO.md, /app/scripts/catalogo.mjs e /app/api/.

# Estágio 1: só as dependências de produção (sem ajv, autocannon e outras de teste).
FROM node:24-alpine AS dependencias
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

# Estágio de desenvolvimento (T9.14): todas as dependências, código montado pelo compose.
FROM node:24-alpine AS desenvolvimento
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
ENV ENDERECO=0.0.0.0 PORTA=4320
EXPOSE 4320
CMD ["node", "--watch-path=src", "src/servidor.mjs"]

# Estágio final: Node, as dependências de produção e o código. Nada de testes nem do npm cache.
FROM node:24-alpine AS final
ENV NODE_ENV=production \
    ENDERECO=0.0.0.0 \
    PORTA=4320 \
    CAMINHO_DO_BANCO=/dados/painel.db
WORKDIR /app/api
COPY --from=dependencias /app/api/node_modules ./node_modules
COPY api/package.json ./
COPY api/src ./src
COPY api/migracoes ./migracoes
COPY api/consultas ./consultas
COPY CATALOGO.md /app/CATALOGO.md
# A API lê o catálogo com o mesmo leitor do script da raiz (api/src/catalogo.mjs).
COPY scripts/catalogo.mjs /app/scripts/catalogo.mjs
# A pasta do SQLite pertence ao usuário "node" (uid 1000), que já existe na imagem oficial.
# T9.13: os pacotes do Alpine com as correções publicadas depois da imagem base. A API roda com "node" e não usa o npm, o npx, o yarn nem o corepack da imagem base;
# tirá-los diminui a imagem e o que a varredura acha (as dependências do próprio npm).
RUN apk upgrade --no-cache  && mkdir -p /dados && chown node:node /dados  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn*            /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack
# O processo não roda como root.
USER node
EXPOSE 4320
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4320/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/servidor.mjs"]
