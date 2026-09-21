# Backend NestJS. El contexto de build es la RAÍZ del monorepo (ver docker-compose.prod.yml):
#   docker build -f backend/Dockerfile .
FROM node:22-bookworm-slim

# openssl: lo necesita el motor de Prisma en Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@12.3.4

WORKDIR /app

# Primero solo los manifiestos: la instalación de dependencias queda en caché si no cambian.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter backend...

COPY packages/shared packages/shared
COPY backend backend

RUN pnpm --filter @cablera/shared build \
    && cd backend \
    && node_modules/.bin/prisma generate \
    && pnpm build

ENV NODE_ENV=production
WORKDIR /app/backend
# `prisma db seed` invoca a ts-node por nombre: tiene que estar en el PATH.
ENV PATH=/app/backend/node_modules/.bin:$PATH

# Los logos subidos y los respaldos en Excel se guardan en estas carpetas: montar volúmenes ahí.
RUN mkdir -p uploads/logos backups && chown -R node:node uploads backups
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "require('net').connect(process.env.PORT||3000,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"

# Aplica las migraciones pendientes antes de arrancar (no toca datos existentes).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
