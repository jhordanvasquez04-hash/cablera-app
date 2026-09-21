# Cablera (Android)

App nativa Android (Kotlin + Jetpack Compose) para el flujo de cobranza en
campo: login, resumen de cobranza por zona, ficha de cliente, registrar pago
(boleta), historial de boletas y reporte de gastos de campo. Consume la
misma API NestJS de `../backend` — no tiene backend propio. Guarda en el
teléfono las últimas respuestas (ver "Caché local") para abrir pantallas al
instante, pero **no** registra pagos ni cambios sin conexión.

## Requisitos

- Android Studio reciente (probado con AGP 9.1.1 / Kotlin 2.2.10 / Gradle
  9.3.1, ya instalados en esta máquina).
- El backend de `../backend` corriendo (ver su propio README):
  ```bash
  docker compose up -d
  pnpm prisma:migrate
  pnpm prisma:seed
  pnpm dev:backend
  ```
- Usuarios de prueba (semilla por defecto en `backend/.env.example`):
  - Gestor: `gestor@cablera.local` / `cambiar123`
  - Cobrador: `cobrador@cablera.local` / `cambiar123`

## Abrir el proyecto

Abrir la carpeta `android/` directamente en Android Studio (File → Open) y
dejar que sincronice Gradle. También puede compilarse desde la terminal:

```bash
./gradlew assembleDebug
```

## Apuntar la app a tu backend

La URL base de la API se define en `app/build.gradle.kts` como
`BuildConfig.API_BASE_URL`, por build type:

- **debug**: `http://10.0.2.2:4000/` — funciona tal cual contra un backend
  corriendo en `localhost:4000` cuando la app corre en el **emulador**
  Android (`10.0.2.2` es el loopback del host desde el emulador).
- Para probar en un **dispositivo físico**, cambia esa URL por la IP de LAN
  de la máquina donde corre el backend (ej. `http://192.168.1.50:4000/`) y
  asegúrate de que `CORS_ORIGIN`/firewall del backend lo permitan.
- **release**: la URL se inyecta al publicar (ver "Generar el release"); ya
  no hay un placeholder en el código.

## Caché local

`data/cache/ApiCache.kt` guarda las respuestas de la API en memoria y en el
almacenamiento privado de la app (`filesDir/api_cache`, JSON):

- Las pantallas pintan al instante lo último conocido y refrescan solo si el
  dato venció: **catálogos** (zonas, tipos de servicio, categorías, marca)
  10 min; **listas y resúmenes** (cobranza, clientes, boletas, caja, servicios
  técnicos, ficha) 30 s.
- Toda escritura (pago, cliente, gasto, etc.) invalida las listas para no
  mostrar datos viejos. **Registrar pago** no usa caché: siempre consulta la
  deuda real.
- Sin conexión se muestra la última copia guardada; los errores del servidor
  (401, 500, validaciones) nunca se tapan con datos viejos.
- Se borra al cerrar sesión, al iniciar sesión y ante un 401, así un usuario
  nunca ve datos de otro.
- No se respalda en la nube (`allowBackup=false`).

## Pruebas

`./gradlew testDebugUnitTest` corre dos grupos de pruebas de JVM (sin dispositivo):

- `ApiCacheTest`: la caché local (vigencia, respaldo sin conexión, invalidación, limpieza).
- `ApiContractTest` — **pruebas de contrato**: los archivos de `app/src/test/resources/fixtures` son
  respuestas reales del backend (datos personales anonimizados) y cada DTO de la app debe poder leerlas.
  Si el backend cambia una respuesta y un DTO deja de coincidir, la prueba falla antes de llegar a un
  teléfono (así se detectó `ConfiguracionDto.id`, que era `Int` y el servidor manda un UUID).

Para regenerar los fixtures tras cambiar el backend: levanta el backend con datos de ejemplo
(`pnpm prisma:seed` y `pnpm prisma:seed:clientes`, y genera los cargos del día con
`POST /cron/generar-cargos`) y corre `node android/tools/capture-fixtures.mjs`.

## Generar el release

1. Copia `release.properties.example` como `release.properties` (ignorado por
   git) y completa `CABLERA_API_URL` (https) y los datos de la keystore. Sin
   keystore el APK sale sin firmar; sin URL https el build falla a propósito.
2. `./gradlew assembleRelease` (APK) o `./gradlew bundleRelease` (AAB para
   Play). El release usa R8 (minify + shrink); las reglas están en
   `app/proguard-rules.pro`.
3. Respalda la keystore fuera del repo: si se pierde no se pueden publicar
   actualizaciones.

## Alcance actual (MVP)

Cubre el flujo de cobranza en campo (clientes con deuda, ficha de cliente,
registrar pago/boleta, boletas, reportar gasto). Fuera de esta primera
entrega: CRUD de zonas y tipos de servicio, descuentos, configuración de
marca, importación desde Excel, gestión de usuarios, aprobación de gastos y
caja — esos módulos se siguen operando desde `../frontend` mientras tanto.
