# Handoff: SaaS de gestión para cableras (multi-empresa, web + móvil)

## Overview
Plataforma SaaS con tres niveles de acceso:

1. **Panel del proveedor (super_admin)** — el dueño de la plataforma da de alta empresas cliente (cableras y, a futuro, transportistas), asigna plan y subdominio, crea el administrador inicial de cada empresa y supervisa actividad.
2. **App de la empresa — rol administrador** — cobranza, clientes, boletas, caja y egresos, configuración editable (nombre, logo, colores, categorías, fecha de facturación, formato de boleta) y gestión de usuarios.
3. **App de la empresa — rol cobrador** — solo cobra: buscar clientes de sus caseríos, registrar pagos (incluidos parciales), emitir boletas y *reportar* gastos que el administrador aprueba en Caja.

El diseño existe en dos formatos: **escritorio** (los dos primeros archivos) y **app móvil responsiva** (los dos últimos), con el mismo sistema visual y los mismos permisos por rol. La app móvil cubre el flujo completo desde el login y es la que usa el cobrador en campo.

Regla estructural: **cada empresa mantiene su propia base de datos**. El panel del proveedor no consulta las tablas de las empresas; se comunica con cada instancia por endpoints administrativos (`/admin/*`) protegidos por el rol `super_admin`.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento buscados, no código de producción para copiar y pegar. La tarea es **recrear estos diseños dentro del entorno del proyecto real** (según el README del producto: NestJS + Prisma + PostgreSQL en el backend, React + TypeScript + Vite + Tailwind en el frontend), usando sus patrones y librerías. Los prototipos usan estilos en línea y datos de ejemplo en memoria; en la implementación real eso debe salir de la API y del sistema de estilos del proyecto.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, jerarquía y estados están definidos y deben respetarse. Los textos en español son los definitivos salvo indicación contraria. Los datos (nombres, montos, DNI, caseríos) son de ejemplo.

## Screens / Views

### A. Panel del proveedor — `Panel superadmin.dc.html`

**A1. Login super_admin**
- Overlay a pantalla completa, fondo `#16191d`, tarjeta blanca centrada de 380px máx., radio 12px, padding 30px, sombra `0 24px 60px rgba(0,0,0,0.45)`.
- Marca: cuadrado 38px radio 8px `#16191d` con iniciales "SA" en blanco 700/14px; a la derecha "Panel del proveedor" 600/15px y "Acceso super_admin" 12px `#6d747e`.
- Campos Usuario y Contraseña: label overline 11.5px mayúsculas, letter-spacing .07em, color `#5d646d`; input borde `#cfd4da`, radio 8px, padding 12px 13px, 14.5px.
- Botón "Ingresar": ancho completo, `#16191d`, texto blanco 15px/600, radio 9px, padding 14px; hover `#000000`.
- Cuenta demo: `super.admin`.

**A2. Empresas (pantalla principal)**
- Header oscuro fijo (`#16191d`, padding 13px 26px): marca "SA" + título; nav con dos ítems (Empresas, Actividad), activo = fondo blanco, texto `#16191d`; a la derecha avatar 26px `#2c3238`, texto "super_admin" y botón "Salir" (borde `#3a4149`).
- Contenido máx. 1180px, padding 32px 22px 70px.
- H1 "Empresas": Source Serif 4, 34px, peso 400, letter-spacing -0.01em. Botón "Crear empresa" a la derecha (`#1f3a63`, hover `#17304f`).
- Bajada: aviso de aislamiento de datos con `/admin/*` en mono.
- 4 KPI: grid `repeat(auto-fit,minmax(190px,1fr))`, gap 12px. Tarjeta blanca, borde `#e4e7ec`, radio 10px, sombra `0 1px 2px rgba(16,24,40,.05)`, padding 16px 18px. Label overline; cifra IBM Plex Mono 26px/600; nota 12.5px `#6d747e`.
  Empresas activas 6 · En prueba 2 · Clientes gestionados 3,184 · Suscripción mensual S/ 1,740.
- Buscador: borde `#cfd4da`, radio 10px, input 15px.
- Tabla de empresas: grid `minmax(180px,1.7fr) 1fr 1.2fr 0.9fr 0.9fr 1fr 150px`, gap 12px. Cabecera `#f7f8fa`, overline 11.5px. Filas: nombre 600 + RUC mono 12px `#6d747e`; rubro; subdominio mono; plan; clientes mono alineado a la derecha; estado como chip (Activa `#e9efec`/`#1f5c45`, Prueba `#f7f0e0`/`#7c5312`, Suspendida `#f6eae8`/`#8f2c22`); acciones "Entrar" (primario) y "Login" (secundario). Hover de fila `#f8f9fb`.
- "Entrar" abre la app de la empresa con sesión del proveedor; "Login" abre la pantalla de acceso de esa empresa. En el prototipo son enlaces con hash (`#proveedor`, `#login`); en producción corresponde a un token de suplantación auditado.

**A3. Actividad**
- Lista de eventos: hora mono 12.5px, chip con el nombre corto de la empresa, texto del evento. Solo eventos administrativos; nunca datos de clientes finales.

**A4. Modal "Crear empresa"**
- Overlay `rgba(16,24,40,.45)`, tarjeta blanca 620px máx., radio 12px, padding 26px, scroll vertical.
- Campos: nombre, RUC, subdominio (input + sufijo `.tuservicio.pe` en mono, `flex:none`), contacto.
- "Sistema": chips Cable / Transporte. "Plan": chips Básico / Estándar / Sin límite; la nota bajo los chips cambia con la selección (200 clientes y 2 usuarios / 1,000 y 6 / sin tope).
- "Administrador inicial": nombre, usuario, contraseña temporal. Nota: ese administrador crea después a sus cobradores.
- Acciones: Cancelar (secundario) y "Crear y aprovisionar" (primario).

### B. App de la empresa — `Cablera - Sistema.dc.html`

Header claro fijo: logo 32px radio 7px `#1f3a63` con iniciales, nombre de la empresa 600/14px + periodo, nav de pestañas (activa: fondo `#eaeef5`, texto `#1f3a63`), a la derecha avatar, rol y botones "Vista" (alterna admin/cobrador — solo demo) y "Salir".
Si la sesión viene del proveedor se muestra una franja negra superior: "Sesión abierta desde el panel del proveedor" + enlace "Volver al panel".

**B1. Login de la empresa** — igual estructura que A1 pero fondo `#1f3a63` y botón `#1f3a63`. Cuentas demo: `julio.m` (admin), `nilda.r` (cobradora).

**B2. Cobranza** (pantalla inicial)
- H1 serif 36px + nota "Próxima generación de cargos: 01 oct".
- Barra: buscador (DNI, nombre, teléfono o N° de boleta), botón primario "Registrar pago", secundario "Nuevo cliente" (solo admin) o "Reportar gasto" (solo cobrador).
- KPI: admin ve Cobrado en setiembre / Deuda acumulada / Egresos del mes / Saldo neto (esta última en tarjeta negra `#16191d`). El cobrador ve solo "Cobrado hoy por ti" y "Pendientes en tus caseríos".
- Filtros por caserío (chips redondeados; activo `#1f3a63`).
- Tabla "Clientes con deuda": grid `minmax(190px,2fr) 1.1fr 0.9fr 1.6fr 1fr 132px`. Columnas: cliente (nombre 600 + DNI mono), zona, mensual (mono, derecha), meses pendientes (chips: pendiente rojo `#f6eae8`/`#8f2c22`, parcial ámbar `#f7f0e0`/`#7c5312`, descuento verde `#e9efec`/`#1f5c45`, suspendido gris `#ebedf0`/`#464d56`), deuda total (mono 600, derecha, roja), botón Cobrar / Ver ficha.
- Pie: conteo + "Exportar a Excel" y "Ver todos".
- **Móvil (<860px)**: cabecera azul con buscador y dos cifras, chips de zona, tarjetas por cliente (nombre 17px, dirección, deuda a la derecha, chips de meses, botones "Cobrar" y "Llamar" de 44px+ de alto) y hoja inferior fija de cobro rápido: montos sugeridos (todo / 1 mes / otro), método (Efectivo, Yape, Plin, Transf.) y botón "Registrar y emitir boleta".

**B3. Clientes** — buscador por nombre, DNI, teléfono o caserío; chips de zona; tabla con cliente, caserío + dirección, teléfono, estado (chip), mensual y deuda (mono, derecha) y "Ver ficha". Botón "Nuevo cliente" solo admin.

**B4. Ficha del cliente** — tarjeta con nombre serif 30px, DNI y teléfono en mono, chip de estado; grilla de datos (zona, servicio, monto base, fecha de facturación propia o global, alta, dirección); banda `#eaeef5` con el descuento vigente y el mensual efectivo; acciones (Editar datos, Aplicar descuento, Suspender, Dar de baja) **solo admin**. Columna derecha negra con el saldo total (mono 40px), botón "Registrar pago" y "Enviar recordatorio".
Debajo: "Deuda mes a mes" en tarjetas `repeat(auto-fill,minmax(158px,1fr))` con periodo, monto y estado coloreado; e "Historial de pagos" (boleta, fecha, concepto, método, monto, "Ver boleta").
Modal "Dar de baja": motivo en chips, fecha, deuda pendiente al momento, confirmación en rojo `#8f2c22`. El cliente pasa a "retirado" conservando historial.

**B5. Registrar pago** — lista de cargos pendientes seleccionables (checkbox cuadrado 18px, fila resaltada `#f6f8fc` con borde `#1f3a63`), monto editable (mono 17px), método en 4 botones, nota que calcula el saldo restante en tiempo real, número de boleta a emitir y acciones "Guardar sin imprimir" / "Registrar y emitir boleta".

**B6. Boletas** — buscador por N° o cliente; tabla con número (mono 600), fecha, cliente + zona, concepto, método, monto + chip de estado (Emitida / Anulada), "Ver". Copy fija: una boleta emitida no se edita, se anula y se reemite.

**B7. Detalle de boleta** — dos formatos con los mismos datos, lado a lado (`repeat(auto-fit,minmax(280px,1fr))`):
- **Hoja A4**: cabecera con logo, razón social, RUC, dirección y teléfono; bloque de folio a la derecha (`white-space:nowrap`); datos del cliente; tabla concepto/importe; total 15px/700; método y saldo pendiente sobre línea punteada; pie de agradecimiento.
- **Ticket 80 mm**: columna máx. 290px, todo IBM Plex Mono 12px, líneas punteadas `#9aa1ab`, contenido en mayúsculas.
- Acciones: "Anular y reemitir", "Descargar PDF", "Imprimir".

**B8. Caja y egresos (solo admin)** — botonera: Registrar egreso / Registrar ingreso manual / Abrir caja del día, con la nota de que los cobros entran solos. Formulario en línea (fecha, monto, método, categoría en chips con "+ Nueva categoría", descripción; el placeholder de descripción cambia según egreso o ingreso). Bandeja "Gastos reportados por cobradores" con importe y acciones "Registrar en caja" / "Rechazar". Grilla inferior: lista de egresos del periodo y tarjeta negra con ingresos − egresos.
Cuatro tarjetas de caja por método (Efectivo, Yape, Plin, Transferencia) con importe y número de cobros.

**B9. Nuevo cliente (solo admin)** — DNI, nombre, teléfono, dirección/referencia, caserío en chips (estado propio, no reutiliza el filtro de la lista) con "+ Nuevo caserío", tipo de servicio (Cable + "Otro"), monto base y fecha de facturación (Global día 1 / Propia).

**B10. Configuración (solo admin)** — bloques:
1. Identidad: nombre, RUC, teléfono, dirección, logo (zona de arrastre con vista previa) y colores primario/secundario con muestra + hex.
2. Facturación y boleta: fecha global, formato de boleta (A4 / Ticket 80 mm), modo de caja (Resumen / Apertura-cierre).
3. Catálogos: categorías de egreso, tipos de servicio y zonas, todos con "+ Nueva".
4. Usuarios y accesos: tabla (nombre, usuario, rol, caseríos, estado, Editar) y botón "Crear usuario".
5. Copias y exportación: interruptor de exportación automática a Excel con frecuencia y fecha de la última copia.
6. Pie: Descartar / Guardar cambios.

**B11. Crear usuario (solo admin)** — nombre, usuario, contraseña temporal, teléfono; rol (Administrador / Cobrador); caseríos asignados en chips; y tabla "Qué podrá hacer" que se recalcula según el rol:
| Permiso | Administrador | Cobrador |
|---|---|---|
| Cobrar y emitir boletas | Sí | Sí |
| Ver y buscar clientes | Sí | Sí |
| Reportar un gasto para aprobación | Sí | Sí |
| Registrar egresos en caja | Sí | No |
| Ver caja y saldo del negocio | Sí | No |
| Editar configuración y tarifas | Sí | No |
| Crear usuarios | Sí | No |

**B12. Modal "Reportar un gasto" (solo cobrador)** — monto, descripción, nota sobre adjuntar foto del comprobante, "Enviar reporte". Queda pendiente hasta que el admin lo apruebe en Caja.

### C. App móvil de la empresa — `Movil A - Pestanas.dc.html`

Patrón: **barra de pestañas inferior**. Contenedor fluido de `max-width: 480px` centrado; en un teléfono ocupa todo el ancho, en pantallas grandes se centra sobre fondo `#eef0f3`. Botones y filas de 44px o más. Cabecera azul `#1f3a63` fija arriba con título, subtítulo, botón "Rol" (solo demo) y "Salir"; flecha "←" cuando hay una pantalla apilada.

Pestañas por rol — administrador: Cobranza, Clientes, Servicios, Caja, Ajustes. Cobrador: Cobranza, Clientes, Servicios, Perfil.

**C1. Login** — mitad superior azul con logo 52px, nombre de la empresa en Source Serif 4 30px y bajada; tarjeta blanca inferior con radio `18px 18px 0 0` que contiene usuario, contraseña y botón "Ingresar" de ancho completo. El usuario escrito decide el rol en la demo (`nilda.r` entra como cobradora).

**C2. Cobranza / Clientes** — buscador dentro de la cabecera azul; dos tarjetas de resumen (admin: cobrado del mes y deuda acumulada; cobrador: cobrado hoy y pendientes); chips de caserío en fila con desplazamiento horizontal; acción contextual ("Registrar cliente nuevo" para admin, "Reportar un gasto" para cobrador); tarjetas de cliente con nombre 17px, dirección, deuda en mono 21px, chips de meses y botones "Cobrar" y "Llamar".

**C3. Ficha del cliente** — tarjeta negra con el saldo en mono 36px y dos acciones ("Cobro rápido" y "Elegir cargos"); conmutador de tres pestañas (Deuda / Pagos / Servicios) sobre fondo `#e7eaee`; Deuda muestra los cargos mes a mes y los datos del cliente (con "Editar datos" y "Dar de baja" solo para admin); Pagos lista el historial con enlace "Ver todas las boletas"; Servicios lista el historial técnico y permite crear uno nuevo.

**C4. Registrar pago** — cargos pendientes como filas seleccionables con casilla de 20px, monto editable en mono 19px, nota de saldo restante recalculada, método en cuatro botones, folio a emitir y acciones "Registrar y emitir boleta" / "Guardar sin imprimir".

**C5. Boleta (ticket)** — el comprobante 80 mm en IBM Plex Mono 12.5px con líneas punteadas, seguido de "Imprimir en ticketera", "Enviar por WhatsApp", "Guardar PDF" y "Anular y reemitir" (solo admin).

**C6. Boletas** — buscador por folio o cliente y tarjetas con folio, fecha, estado (Emitida / Anulada), cliente, concepto, método y monto.

**C7. Servicios técnicos** — chips de estado, botón "Nuevo servicio" y tarjetas con folio, tipo, estado, cliente, fechas de creación y liquidación, comentario y acciones "Comentar" / "Liquidar". Estado vacío cuando el filtro no devuelve nada.

**C8. Nuevo servicio** — tipo de servicio en botones apilados; cliente, fecha de creación (fija), fecha programada y técnico; bloque "Datos propios del tipo" cuyos campos cambian según el tipo elegido; comentario.

**C9. Nuevo cliente** — DNI, nombre, teléfono, dirección; caserío en chips con "+ Nuevo"; monto base en mono y fecha de facturación (Global / Propia).

**C10. Caja y egresos (solo admin)** — tarjeta negra con ingresos − egresos y su desglose; botones "Registrar egreso" e "Ingreso manual"; bandeja de gastos reportados por cobradores con "Registrar" / "Rechazar"; cobrado por método con enlace a boletas; y lista de egresos del periodo.

**C11. Ajustes (solo admin)** — identidad (logo arrastrable, nombre, RUC, teléfono y cuatro muestras de color principal de 46px), facturación y boleta (fecha global, formato, modo de caja), catálogos (tipos de servicio técnico, categorías de egreso, tipos de servicio contratado, zonas), usuarios con "Crear usuario" e interruptor de copia automática.

**C12. Crear usuario** — datos, rol en dos botones y tabla de permisos que se recalcula con el rol.

**C13. Hojas inferiores** — cobro rápido (montos sugeridos, método, emitir), gasto (reporte del cobrador, egreso o ingreso manual, con categoría solo en egreso) y baja de cliente (motivo en chips, deuda pendiente, confirmación roja). Todas con radio `18px 18px 0 0` y overlay `rgba(16,24,40,.45)`.

### D. Panel del proveedor en móvil — `Movil Superadmin.dc.html`

Misma estructura de pestañas (Empresas, Actividad) sobre cabecera negra `#16191d`. Login oscuro propio (`super.admin`). Empresas: cuatro KPI, botón "Crear empresa", chips de estado, buscador y tarjetas por empresa con RUC, subdominio, rubro, plan, clientes, estado y acciones "Entrar" / "Ver detalle". Detalle: tarjeta negra con la suscripción, datos de la instancia, cambio de plan y acciones de restablecer clave o suspender. Alta: nombre, RUC, subdominio con sufijo, contacto, sistema, plan con nota y administrador inicial. Actividad: eventos administrativos con hora, empresa y texto.

## Interactions & Behavior
- Navegación por pestañas en el header; las pantallas de detalle (ficha, pago, boleta, nuevo cliente, crear usuario) tienen enlace "← Volver a …".
- El rol filtra **navegación y contenido**: con rol cobrador se ocultan Caja, Configuración, alta de clientes, acciones de la ficha y las cifras del negocio. La verificación real debe hacerse en el backend (guards de NestJS), no solo en la UI.
- Modales: overlay `rgba(16,24,40,.45)`, tarjeta centrada, cierre por Cancelar.
- Hover: filas de tabla `#f8f9fb`; botón primario `#1f3a63` → `#17304f`; secundario blanco → `#f7f8fa`; ítems de nav `#f1f4f8`.
- La app móvil no tiene punto de corte: es fluida por construcción (contenedor `max-width` + flex/grid que reflowan). Las pestañas inferiores quedan fijas con `position: fixed` y el contenido reserva 80px de espacio inferior.
- Responsive del escritorio: punto de corte en 860px. Bajo ese ancho la cobranza pasa de tabla a tarjetas con hoja inferior de cobro; el resto de pantallas usa grids `auto-fit/minmax` que reflowan solos. Objetivos táctiles de 44px o más en móvil.
- Cálculo mostrado en Registrar pago: monto seleccionado − monto ingresado = saldo que queda en el cargo más antiguo (pago parcial).

## State Management
Estado del prototipo (equivalente al que necesitará la app real, aunque allí venga de la API):
- `rol` (admin | cobrador) y `sesion`; `suplantando` cuando la sesión llega desde el panel del proveedor.
- `pantalla` (cobranza, clientes, ficha, pago, boleta, boletas, caja, config, nuevo, usuario).
- `busqueda`, `zona` (filtro de lista) y `zonaNueva` (alta de cliente) — deben ser variables distintas.
- `sel` (cargos marcados en el pago), `montoPago`, `metodo`.
- `form` (egreso | ingreso | null), `catSel`, `reportar`, `baja`, `motivo`.
- Panel del proveedor: `pantalla`, `alta`, `rubro`, `plan`, `sesion`.

Datos que la API debe proveer: configuración de la empresa, zonas, clientes con su estado y monto efectivo, descuentos vigentes, cargos mensuales por periodo con su estado, pagos con método y folio, categorías y egresos, resumen de caja por método, usuarios y permisos.

Regla de negocio central: el **monto efectivo** de una mensualidad (monto base − descuento vigente) debe calcularse en un único servicio compartido por el cron de generación y por cualquier vista o cobro manual.

## Design Tokens
**Color**
- Fondo app `#f4f5f7` · superficie `#ffffff` · superficie tenue `#f7f8fa`
- Borde `#e4e7ec` · borde de campo `#cfd4da` · separador `#ebedf0` · hover de fila `#f8f9fb`
- Texto `#16191d` · secundario `#464d56` · terciario `#5d646d` · débil `#6d747e`
- Primario `#1f3a63` (hover `#17304f`) · primario tenue `#eaeef5`
- Oscuro / panel proveedor `#16191d` (borde interior `#3a4149`, texto tenue `#aeb5bd`)
- Éxito `#1f5c45` sobre `#e9efec` · alerta `#7c5312` sobre `#f7f0e0` · error `#8f2c22` sobre `#f6eae8` (borde `#e3c9c6`, hover `#75231b`) · neutro `#464d56` sobre `#ebedf0`
- Azul móvil de cabecera `#1f3a63` con textos `#b9c6da`
- Los colores primario y secundario son **configurables por empresa**; el resto de la escala es del sistema.

**Tipografía**
- Títulos: Source Serif 4, 400, 30–36px, letter-spacing -0.01em
- Interfaz: IBM Plex Sans — 11.5px overline mayúsculas (letter-spacing .07em), 12.5–13.5px cuerpo, 14–15px controles, 16px subtítulos de sección (600)
- Cifras, DNI, folios: IBM Plex Mono 12–40px; `font-variant-numeric: tabular-nums` global

**Espaciado** — escala 4/6/8/10/12/14/16/18/20/22/26/30 px. Contenido máx. 900px (formularios), 1080px (detalle) y 1180px (listados); padding lateral 20–28px.

**Radios** — 5px chips pequeños · 7–8px botones y campos · 9–10px botones grandes y tarjetas · 12px modales y tarjetas móviles · 999px chips de filtro.

**Sombras** — tarjeta `0 1px 2px rgba(16,24,40,.05)` · header `0 1px 0 rgba(16,24,40,.05)` · modal `0 20px 50px rgba(16,24,40,.25)` · login `0 24px 60px rgba(16,24,40,.35)` · hoja móvil `0 -8px 24px rgba(22,25,29,.10)`.

## Assets
No hay imágenes ni iconos externos. El logo es un cuadrado con las iniciales de la empresa y en producción debe reemplazarse por el archivo que suba el gestor en Configuración (PNG o SVG, máx. 1 MB), usado también en la boleta. Tipografías: Google Fonts (IBM Plex Sans, IBM Plex Mono, Source Serif 4).

## Screenshots
Capturas de referencia en `screenshots/` (1280px de ancho aprox.):
01 login de empresa · 02 cobranza vista cobrador · 03 cobranza vista admin · 04 clientes · 05 ficha de cliente · 06 registrar pago · 07 boletas · 08 detalle de boleta (A4 + ticket) · 09 caja y egresos · 10 formulario de egreso · 11 configuración · 12 crear usuario · 13 cobranza con rol cobrador · 14 modal reportar gasto · 20 login del proveedor · 21 empresas · 22 actividad · 23 crear empresa.

La serie `30-movil-01…10` recorre la app móvil en orden de uso: login, cobranza, hoja de cobro rápido, ficha del cliente, registrar pago con selección de cargos, boleta en ticket, caja y egresos, servicios técnicos y nuevo servicio. El detalle de cada pantalla está descrito arriba en la sección C.

## Files
- `Cablera - Sistema.dc.html` — app de la empresa (login, cobranza, clientes, ficha, pago, boletas, caja y egresos, configuración, alta de cliente, crear usuario, roles admin/cobrador, versión móvil).
- `Panel superadmin.dc.html` — panel del proveedor (login, empresas, actividad, alta de empresa).
- `Movil A - Pestanas.dc.html` — app móvil completa de la empresa (login, cobranza, clientes, ficha con tres pestañas, registrar pago, boleta ticket, boletas, servicios técnicos, nuevo servicio, nuevo cliente, caja y egresos, ajustes, crear usuario, hojas de cobro/gasto/baja, roles admin y cobrador).
- `Movil Superadmin.dc.html` — panel del proveedor en móvil (login, empresas, detalle de empresa, alta, actividad).
- `support.js` — runtime de los prototipos. No forma parte del diseño ni debe portarse.

Para verlos: abrir cada `.dc.html` en el navegador. En la app de la empresa, "Cambiar vista" alterna admin y cobrador; en el panel del proveedor, "Entrar" y "Login" enlazan con la app de la empresa.
