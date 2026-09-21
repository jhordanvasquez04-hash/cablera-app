# Despliegue en Dokploy

Backend (NestJS + Prisma), frontend (React/nginx) y Postgres en un único proyecto **Compose**.
La app Android usa el mismo backend.

## Antes de empezar

- El código debe estar en un repositorio Git **privado** (GitHub/GitLab/Gitea) que Dokploy pueda leer.
  El proyecto hoy no es un repo: `git init`, commit y push.
- Dos subdominios apuntando (registro DNS tipo A) a la IP del servidor Dokploy:
  `api.tu-dominio.com` (backend) y `app.tu-dominio.com` (frontend).
- `backend/prisma/seed-data/` está en `.gitignore` (datos personales reales): no viaja con el repo.

## 1. Crear el proyecto

1. Dokploy → *Create Service* → **Compose** → origen Git, rama principal.
2. *Compose Path*: `./docker-compose.prod.yml`.
3. Pestaña **Environment**: pega el contenido de `.env.production.example` con valores reales
   (`JWT_SECRET` con `openssl rand -hex 48`; `POSTGRES_PASSWORD` solo letras y números).
   `CORS_ORIGIN` debe ser exactamente `https://app.tu-dominio.com`.
   `VITE_API_URL` debe ser `https://api.tu-dominio.com` (se incrusta al compilar el frontend).
4. Pestaña **Domains**, con HTTPS y certificado Let's Encrypt:
   - `api.tu-dominio.com` → servicio `backend`, puerto `3000`
   - `app.tu-dominio.com` → servicio `frontend`, puerto `80`
5. **Deploy**. Al arrancar, el backend aplica las migraciones solo (`prisma migrate deploy`).

## 2. Primer arranque (base en cero)

Desde la pestaña *Terminal* del servicio `backend` (o `docker exec -it <contenedor> sh`):

```sh
prisma db seed      # empresa, usuarios y catálogos base
```

En producción el seed **se niega a correr** si faltan `SEED_GESTOR_PASSWORD`,
`SEED_COBRADOR_PASSWORD` o `SEED_SUPERADMIN_PASSWORD`, o si tienen menos de 10 caracteres o son
`cambiar123`.

Para cargar los clientes de PARIAS (semilla), copia el archivo de datos al volumen `backups`
(la imagen no lo incluye a propósito) y córrela indicando su ruta:

```sh
# En tu PC:
docker cp backend/prisma/seed-data/parias-clientes.json <contenedor-backend>:/app/backend/backups/
# Dentro del contenedor backend:
SEED_CLIENTES_ARCHIVO=backups/parias-clientes.json ts-node prisma/seed-clientes-parias.ts
# Cuando termine, borra el archivo (contiene datos personales):
rm backups/parias-clientes.json
```

Es idempotente: se puede repetir sin duplicar clientes.

## 3. Verificación

- `https://api.tu-dominio.com/configuracion` responde JSON.
- `https://app.tu-dominio.com` carga y permite iniciar sesión (sin errores de CORS en la consola).
- Cambia las contraseñas de las cuentas creadas por el seed si las compartiste por un canal inseguro.
- Sube un logo en Configuración, redeploya y comprueba que sigue ahí (volumen `uploads`).

## 4. App Android

En `android/release.properties`: `CABLERA_API_URL=https://api.tu-dominio.com/` más la keystore
(ver `android/README.md`, sección "Generar el release").

## Datos que persisten (volúmenes)

| Volumen         | Contenido                                         |
| --------------- | ------------------------------------------------- |
| `postgres_data` | Base de datos                                     |
| `uploads`       | Logos subidos                                     |
| `backups`       | Respaldos en Excel que genera el cron del backend |

Programa además un respaldo del volumen `postgres_data` (Dokploy → *Backups*, o `pg_dump` periódico
fuera del servidor). Los respaldos en Excel no reemplazan a `pg_dump`.

## Límites conocidos

- Suspender una empresa no cierra las sesiones ya iniciadas: el bloqueo aplica en su próximo login
  (los tokens duran `JWT_EXPIRES_IN`, 8 h por defecto).
- `CORS_ORIGIN` admite un solo origen.
- El cron de cargos corre dentro del backend: mantén **una sola réplica** o se generarían duplicados
  (el índice único `servicio + año + mes` los evitaría, pero no lo dejes al azar).
