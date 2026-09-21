# Handoff para Android — SaaS de gestión para cableras

Paquete pensado para un agente que trabaja en Android Studio. Los archivos `.dc.html` son **referencia visual** (prototipos que se abren en el navegador), no código a portar. La tarea es recrear estas pantallas en la app Android con Jetpack Compose y Material 3.

## Qué es la app

Sistema multiempresa de gestión para cableras. Dos aplicaciones distintas:

- **App de la empresa** (`Movil A - Pestanas.dc.html`) — la usan el administrador y los cobradores de cada cablera.
- **Panel del proveedor** (`Movil Superadmin.dc.html`) — la usa el dueño de la plataforma para dar de alta empresas cliente. Es una app aparte, no una pantalla más de la anterior.

Cada empresa tiene su propia base de datos. La app móvil consume la API de su instancia; el panel del proveedor habla con endpoints administrativos (`/admin/*`).

## Roles y permisos

| Permiso | Administrador | Cobrador |
|---|---|---|
| Cobrar y emitir boletas | Sí | Sí |
| Ver y buscar clientes | Sí | Sí |
| Reportar un gasto | Sí | Sí |
| Registrar egresos en caja | Sí | No |
| Ver caja y saldo del negocio | Sí | No |
| Editar ajustes y tarifas | Sí | No |
| Crear usuarios | Sí | No |
| Alta y baja de clientes | Sí | No |

El rol cambia la barra de navegación y el contenido. La verificación real va en el backend; la UI solo oculta lo que no corresponde.

## Navegación

Barra inferior (`NavigationBar` de Material 3) con destinos de primer nivel y pantallas de detalle apiladas encima (`NavHost` + `navigate`, flecha atrás en la `TopAppBar`).

Destinos de primer nivel — administrador: `cobranza`, `clientes`, `servicios`, `caja`, `ajustes`. Cobrador: `cobranza`, `clientes`, `servicios`, `perfil`.

Pantallas apiladas: `ficha/{clienteId}`, `pago/{clienteId}`, `boleta/{boletaId}`, `boletas`, `servicioNuevo`, `clienteNuevo`, `usuarioNuevo`.

Hojas inferiores (`ModalBottomSheet`): cobro rápido, gasto (reporte / egreso / ingreso manual) y baja de cliente.

## Pantallas de la app de la empresa

1. **Login** — mitad superior azul con logo, nombre de la empresa y bajada; tarjeta blanca inferior con esquinas superiores redondeadas (28.dp) que contiene usuario, contraseña y botón de ancho completo. En la demo el usuario escrito decide el rol.
2. **Cobranza** — `SearchBar` dentro de la barra superior azul; dos tarjetas de resumen; `LazyRow` de chips de caserío; acción contextual según rol; `LazyColumn` de tarjetas de cliente con nombre, dirección, deuda en monoespaciada, chips de meses vencidos y botones "Cobrar" y "Llamar".
3. **Clientes** — misma lista, con búsqueda por nombre, DNI, teléfono o caserío.
4. **Ficha del cliente** — tarjeta oscura con el saldo y dos acciones (cobro rápido / elegir cargos); `TabRow` de tres pestañas: Deuda (cargos mes a mes + datos del cliente, con editar y dar de baja solo para admin), Pagos (historial con enlace a boletas) y Servicios (historial técnico y crear uno nuevo).
5. **Registrar pago** — cargos pendientes como filas con casilla; monto editable; nota de saldo restante recalculada en vivo; método de pago en cuatro botones; folio a emitir; acciones registrar/emitir y guardar sin imprimir.
6. **Boleta** — comprobante de 80 mm en tipografía monoespaciada con separadores punteados; acciones imprimir en ticketera, enviar por WhatsApp, guardar PDF y anular/reemitir (solo admin). Una boleta emitida no se edita.
7. **Boletas** — búsqueda por folio o cliente; tarjetas con folio, fecha, estado (Emitida / Anulada), cliente, concepto, método y monto.
8. **Servicios técnicos** — chips de estado; botón nuevo servicio; tarjetas con folio, tipo, estado, cliente, fechas de creación y liquidación, comentario y acciones comentar/liquidar; estado vacío cuando el filtro no devuelve nada.
9. **Nuevo servicio** — tipo de servicio en botones apilados y un bloque de campos que **cambia según el tipo** (los tipos y sus campos los define el administrador en Ajustes); cliente, fecha de creación fija, fecha programada, técnico y comentario.
10. **Nuevo cliente** — DNI, nombre, teléfono, dirección; caserío en chips; monto base; fecha de facturación global o propia.
11. **Caja y egresos (admin)** — tarjeta oscura con ingresos menos egresos; registrar egreso e ingreso manual; bandeja de gastos reportados por cobradores con registrar/rechazar; cobrado por método; egresos del periodo.
12. **Ajustes (admin)** — identidad (logo, nombre, RUC, teléfono, color principal entre cuatro muestras), facturación y boleta (fecha global, formato A4 o ticket, modo de caja), catálogos (tipos de servicio técnico, categorías de egreso, tipos de servicio contratado, zonas), usuarios con crear usuario, y copia automática a Excel.
13. **Crear usuario** — datos, rol en dos botones y tabla de permisos que se recalcula con el rol.

## Pantallas del panel del proveedor

Login oscuro propio; Empresas (cuatro indicadores, crear empresa, chips de estado, búsqueda y tarjetas con RUC, subdominio, rubro, plan, clientes, estado y acciones entrar / ver detalle); Detalle de empresa (suscripción, datos de la instancia, cambio de plan, restablecer clave, suspender); Crear empresa (nombre, RUC, subdominio con sufijo fijo, contacto, sistema, plan con su nota y administrador inicial); Actividad (eventos administrativos con hora, empresa y texto).

## Colores

```kotlin
val Primary        = Color(0xFF1F3A63)  // azul institucional; configurable por empresa
val PrimaryPressed = Color(0xFF17304F)
val PrimaryLight   = Color(0xFFEAEEF5)
val Ink            = Color(0xFF16191D)  // texto y superficies oscuras
val InkBorder      = Color(0xFF3A4149)  // borde dentro de superficie oscura
val InkMuted       = Color(0xFFAEB5BD)  // texto tenue sobre oscuro
val Surface        = Color(0xFFFFFFFF)
val SurfaceDim     = Color(0xFFF7F8FA)
val Background     = Color(0xFFF4F5F7)
val BackgroundApp  = Color(0xFFEEF0F3)  // fuera del contenedor en pantallas anchas
val Outline        = Color(0xFFE4E7EC)  // borde de tarjeta
val OutlineField   = Color(0xFFCFD4DA)  // borde de campo
val Divider        = Color(0xFFF2F4F6)
val TextSecondary  = Color(0xFF464D56)
val TextTertiary   = Color(0xFF5D646D)
val TextMuted      = Color(0xFF6D747E)

// Estados
val Success   = Color(0xFF1F5C45); val SuccessBg = Color(0xFFE9EFEC)
val Warning   = Color(0xFF7C5312); val WarningBg = Color(0xFFF7F0E0)
val Error     = Color(0xFF8F2C22); val ErrorBg   = Color(0xFFF6EAE8)
val ErrorLine = Color(0xFFE3C9C6); val Neutral   = Color(0xFF464D56); val NeutralBg = Color(0xFFEBEDF0)
```

Significado de los estados: verde = pagado, al día, liquidado, activo. Ámbar = pago parcial, servicio en proceso, empresa en prueba. Rojo = deuda, boleta anulada, suspensión, baja. Gris = suspendido, sin asignar, informativo.

El color primario y el secundario son configurables por empresa (se editan en Ajustes); el resto de la escala es del sistema y no cambia.

## Tipografía

Tres familias de Google Fonts:

- **IBM Plex Sans** — toda la interfaz.
- **Source Serif 4** (regular 400) — títulos de pantalla. Nunca en negrita.
- **IBM Plex Mono** — importes, DNI, folios, fechas cortas. Con `FontFeature` de cifras tabulares si se usa `TextStyle(fontFeatureSettings = "tnum")`.

```kotlin
// sp equivalentes a los px del prototipo (1 px ≈ 1 sp a densidad base)
displayLarge  = 30.sp  Source Serif 4 400   // título del login
headlineSmall = 21.sp  Source Serif 4 400   // título de pantalla apilada
titleLarge    = 17.sp  Plex Sans 600        // nombre de cliente en tarjeta
titleMedium   = 15.sp  Plex Sans 600        // título de fila o sección
bodyLarge     = 16.sp  Plex Sans 400        // campos de formulario
bodyMedium    = 14.sp  Plex Sans 400        // cuerpo general
bodySmall     = 12.5.sp Plex Sans 400       // notas y metadatos
labelSmall    = 11.5.sp Plex Sans 600       // rótulos en mayúsculas, letterSpacing 0.07em
monoDisplay   = 36.sp  Plex Mono 600        // saldo en tarjeta oscura
monoTitle     = 21.sp  Plex Mono 600        // deuda en tarjeta de cliente
monoBody      = 14.sp  Plex Mono 400        // importes en filas
```

Mínimos: ningún texto por debajo de 12.sp; los rótulos en mayúsculas usan 11.5.sp pero solo como etiqueta corta.

## Medidas

- Contenedor: ancho máximo 480.dp centrado; en teléfono ocupa todo el ancho.
- Padding lateral de pantalla: 14–16.dp. Padding interno de tarjeta: 15–18.dp.
- Separación entre tarjetas: 10–12.dp. Entre campos de un formulario: 13.dp.
- Radios: 5.dp chips de estado, 10–12.dp campos y botones, 14.dp tarjetas, 18.dp hojas inferiores (solo esquinas superiores), 999.dp chips de filtro.
- Altura mínima táctil: 48.dp. Los botones principales usan 17.dp de padding vertical (≈ 56.dp de alto).
- Barra inferior: el contenido reserva 80.dp al final para no quedar tapado.
- Elevación: tarjetas 1.dp, hojas y diálogos 8.dp. El prototipo usa sombras muy suaves; no exagerar.

## Componentes Material 3 sugeridos

| Elemento del diseño | Compose |
|---|---|
| Barra superior azul con título y subtítulo | `TopAppBar` con `colors` propios y `Column` en el `title` |
| Pestañas inferiores | `NavigationBar` + `NavigationBarItem` |
| Tarjeta de cliente, servicio, boleta | `Card` con `border` de 1.dp |
| Chips de caserío y estado | `FilterChip` / `AssistChip` |
| Pestañas de la ficha | `TabRow` con indicador de fondo redondeado |
| Cobro rápido, gasto, baja | `ModalBottomSheet` |
| Campos de formulario | `OutlinedTextField` con `label` externa en mayúsculas |
| Selector de monto o método | `Row` de `OutlinedButton` / `FilledTonalButton` |
| Interruptor de copia automática | `Switch` |
| Casilla de cargo en registrar pago | `Row` clicable con `Checkbox` |

Los iconos del prototipo son cuadrados de relleno: sustituirlos por iconos reales de Material (`Icons.Outlined.*`) manteniendo el tamaño de 22–24.dp.

## Estado y datos

Un `ViewModel` por pantalla con `StateFlow`. Estado que el prototipo mantiene y que la app necesitará:

- Sesión: usuario, rol (`ADMIN` / `COBRADOR`), empresa.
- Cobranza: texto de búsqueda, caserío seleccionado, lista de clientes con deuda.
- Ficha: pestaña activa, cargos por periodo, historial de pagos, historial de servicios.
- Pago: cargos seleccionados, monto ingresado, método, saldo restante calculado.
- Servicios: filtro de estado, filtro de tipo, tipo seleccionado al crear y sus campos dinámicos.
- Caja: periodo, egresos, gastos reportados pendientes de aprobación.
- Ajustes: identidad, colores, formato de boleta, modo de caja, catálogos, usuarios.

Regla de negocio central: el **monto efectivo** de una mensualidad es el monto base menos el descuento vigente, y debe calcularse en un único lugar compartido por la generación mensual de cargos y por cualquier vista o cobro manual.

Otras reglas: un pago puede ser parcial y se aplica al cargo más antiguo; una boleta emitida no se edita, se anula y se reemite; los gastos del cobrador se reportan y el administrador los aprueba en Caja; la baja de un cliente conserva su historial.

## Trabajo sin conexión

El cobrador trabaja en zonas rurales. La app debe poder registrar cobros sin señal y sincronizar después: cola local de operaciones, folio de boleta reservado por dispositivo o asignado al sincronizar, e indicador visible de estado de conexión.

## Archivos

- `Movil A - Pestanas.dc.html` — app de la empresa, todas las pantallas. Abrir en el navegador; el usuario `nilda.r` entra como cobradora, cualquier otro como administrador. El botón "Rol" alterna la vista.
- `Movil Superadmin.dc.html` — panel del proveedor.
- `screenshots/` — recorrido de la app móvil en orden de uso.
- `README.md` — especificación completa del producto, incluidas las versiones de escritorio.
