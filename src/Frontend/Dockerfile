# Imagen del SPA Angular: compilación con pnpm y servicio con nginx sin privilegios.

# ─── Etapa de compilación ────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /origen

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@12.4.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ─── Etapa final ─────────────────────────────────────────────────────────────
FROM nginxinc/nginx-unprivileged:1.28-alpine AS final

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /origen/dist/*/browser /usr/share/nginx/html

EXPOSE 8080
