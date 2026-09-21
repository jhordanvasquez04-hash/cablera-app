# Frontend React (Vite) servido con nginx. Contexto de build: RAÍZ del monorepo.
FROM node:22-bookworm-slim AS build
RUN npm install -g pnpm@12.3.4
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY frontend/package.json frontend/
RUN pnpm install --frozen-lockfile --filter frontend...

COPY packages/shared packages/shared
COPY frontend frontend

# Vite incrusta esta URL al compilar (no se puede cambiar después sin reconstruir la imagen).
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "Falta VITE_API_URL (URL https del backend)" && exit 1)
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @cablera/shared build && pnpm --filter frontend build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
