# Frontend keysls (React + Vite) servido con nginx. Contexto de build: frontend-keysls/.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite incrusta esta URL al compilar (no se puede cambiar después sin reconstruir la imagen).
ARG VITE_BACKEND_URL
RUN test -n "$VITE_BACKEND_URL" || (echo "Falta VITE_BACKEND_URL (URL https del backend)" && exit 1)
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
