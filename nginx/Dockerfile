# syntax=docker/dockerfile:1
# T9.7: o painel construído e servido pelo Nginx. Contexto: a raiz do repositório.
#   docker build -f nginx/Dockerfile -t formacao-dev-web .

# Estágio 1: dependências e código do painel.
FROM node:24-alpine AS painel
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY vite.config.mjs tsconfig.json CATALOGO.md ./
COPY painel ./painel

# T9.14: o Vite em modo de desenvolvimento, com recarga ao salvar (compose.dev.yaml).
FROM painel AS desenvolvimento
EXPOSE 4317
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "4317", "--strictPort"]

# Estágio 2: build do painel. VITE_API_URL=/api: o painel fala com a API pelo
# mesmo endereço, atrás do Nginx, sem CORS.
FROM painel AS build
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Estágio final: só o Nginx (sem root) e os arquivos do dist/.
FROM nginxinc/nginx-unprivileged:1.28-alpine AS final
# T9.13: os pacotes do Alpine com as correções de segurança publicadas depois da imagem base.
USER root
RUN apk upgrade --no-cache
USER 101
COPY nginx/painel.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
