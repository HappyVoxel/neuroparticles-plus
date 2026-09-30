# syntax=docker/dockerfile:1.7

# ---------- builder: node + pnpm via corepack, static build to dist/ ----------
FROM node:24-alpine AS builder
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# No `corepack prepare pnpm@<version>`: corepack reads the version from
# package.json's "packageManager" field, so there is only one place to bump it.
RUN corepack enable pnpm
WORKDIR /app

# pnpm-*.yaml: the lockfile, and pnpm-workspace.yaml when it exists. The latter
# approves dependency build scripts (allowBuilds); without it pnpm 12 refuses to install.
COPY package.json pnpm-*.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------- runner: nginx serving the static files, as a non-root user ----------
FROM nginxinc/nginx-unprivileged:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
# The unprivileged image can't bind 80; Easypanel's proxy port is 8080.
EXPOSE 8080
