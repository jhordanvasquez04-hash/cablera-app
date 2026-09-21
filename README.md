# Sistema de gestión financiera para cablera

Aplicación web para que el dueño/gestor de una empresa de cable administre clientes, cobranza mensual, caja y gastos, con toda la información institucional (nombre, logo, colores, categorías) editable desde la misma aplicación — sin necesidad de tocar código para cambios operativos.

Este proyecto es el primero de dos sistemas independientes (el segundo es para una empresa de transporte). Ambos deben quedar preparados para integrarse en el futuro con un panel super-admin externo que los supervise a los dos sin fusionar sus bases de datos.

## Stack tecnológico

- **Backend**: Node.js + TypeScript, framework NestJS (estructura modular, guards de roles nativos).
- **Base de datos**: PostgreSQL.
- **ORM**: Prisma.
- **Frontend**: React + TypeScript + Vite, Tailwind CSS. Responsive (PC/laptop y celular vía navegador).
- **Autenticación**: JWT, con sistema de roles desde el inicio (hoy solo `gestor`, preparado para `super_admin` y otros a futuro).
- **Tareas programadas**: node-cron (o BullMQ + Redis si el volumen lo justifica) para generación automática de mensualidades y exportaciones programadas.
- **Generación de PDF**: separar el contenido de la boleta (datos) de su formato de salida (hoja normal hoy, ticketera térmica después).
- **Exportación a Excel**: exceljs.
- **Despliegue**: Docker + docker-compose sobre VPS propio, Nginx como reverse proxy.

## Principio de diseño transversal: todo editable desde la app

Nada de branding ni configuración operativa debe estar hardcodeado. Existe una entidad `Configuracion` editable desde la interfaz, que cubre al menos:

- Nombre de la empresa
- Logo
- Colores (primario/secundario)
- Datos de contacto
- Fecha de facturación por defecto (global)
- Categorías de egresos (CRUD completo, gestionado por el gestor)

## Módulos funcionales

1. **Clientes** — DNI, nombre, teléfono, dirección/referencia, zona, fecha de alta, tipo de servicio (catálogo extensible), estado (activo/suspendido/retirado), monto base mensual propio, fecha de facturación (global o sobrescrita).
2. **Zonas / Caseríos** — CRUD simple, un cliente pertenece a una zona.
3. **Descuentos** — por cliente, 0–100%, vigentes por N meses o hasta una fecha, afectan el cálculo de la mensualidad mientras estén vigentes.
4. **Baja de clientes** — motivo y fecha de baja, sin borrar historial (pasa a "retirado").
5. **Cobranza / mensualidades** — generación automática por cron en la fecha de facturación de cada cliente, cargos individuales por mes con estado propio (pendiente/parcial/pagado), pagos parciales, vista de deuda total y detalle mes a mes, alertas de clientes con deuda, método de pago por transacción (efectivo, Yape, Plin, transferencia).
6. **Boletas / precuentas** — número de precuenta correlativo único por pago, impresión (hoja normal hoy, ticketera térmica después), búsqueda por cliente o por número de boleta.
7. **Caja** — modo resumen por periodo (por defecto) o modo apertura/cierre diario (opcional, activable por el gestor).
8. **Egresos / gastos** — categorías gestionadas por el gestor (CRUD propio), cada gasto con fecha/monto/categoría/descripción, vista de ingresos vs. egresos.
9. **Exportación / backups** — exportación a Excel programable (diaria o según configure el gestor), además de bajo demanda.
10. **Autenticación y roles** — hoy solo `gestor`, diseñado para soportar más roles (ej. cobrador de campo) sin rediseño.
11. **(Futuro) Integración con panel super-admin** — endpoints bajo `/admin/*` protegidos por rol `super_admin`, sin fusionar bases de datos entre proyectos. Reservado desde el diseño, no implementado aún en profundidad.

## Modelo de datos — entidades principales (referencia, no exhaustivo)

```
configuracion
├── nombre_empresa, logo_url, color_primario, color_secundario
├── fecha_facturacion_global
└── datos_contacto

zonas
├── id, nombre

clientes
├── id, dni, nombre_completo, telefono, direccion
├── zona_id (FK)
├── tipo_servicio (catálogo extensible)
├── estado_servicio (activo | suspendido | retirado)
├── monto_base
├── fecha_facturacion_override (nullable)
├── fecha_alta
├── fecha_baja (nullable), motivo_baja (nullable)

descuentos
├── id, cliente_id (FK), porcentaje, fecha_inicio, cantidad_meses / fecha_fin

cargos_mensuales
├── id, cliente_id (FK), periodo (mes/año), monto_correspondiente
├── estado (pendiente | parcial | pagado)

pagos
├── id, cargo_id (FK), fecha, monto_pagado, metodo_pago
├── numero_boleta (correlativo único)

categorias_egreso
├── id, nombre (creadas por el gestor)

egresos
├── id, categoria_id (FK), fecha, monto, descripcion

usuarios
├── id, nombre, credenciales, rol
```

## Fases de desarrollo

1. **Base del proyecto** (en progreso): auth con roles, entidad de configuración editable, estructura de módulos NestJS.
2. Clientes y zonas: CRUD completo + tipo/estado de servicio + baja con motivo.
3. Descuentos y cálculo de monto mensual efectivo por cliente.
4. Cargos mensuales automáticos (cron) + fecha de facturación global/override.
5. Registro de pagos (con parcialidad), boletas con folio correlativo, historial y búsqueda.
6. Dashboard de deuda (total + detalle) y alertas de clientes con deuda pendiente.
7. Caja (resumen por periodo, luego modo apertura/cierre opcional).
8. Egresos y categorías gestionables.
9. Exportación a Excel programable.
10. Pulido general, preparación de endpoints `/admin/*` reservados para integración futura con el panel super-admin.

## Notas para el agente de desarrollo

- Priorizar que nada quede hardcodeado que el negocio pueda necesitar cambiar (nombres, montos, categorías, fechas de facturación): todo debe vivir en base de datos y ser editable desde la interfaz.
- La lógica de cálculo de mensualidad (monto base − descuento vigente) debe quedar centralizada en un solo lugar (servicio/función), no duplicada entre el cron de generación automática y cualquier vista manual.
- Diseñar la generación de boletas de forma que separar el dato (qué información lleva) del formato de salida (PDF hoja normal hoy, ticketera térmica después) sea un cambio de configuración, no una reescritura.

## Estructura del monorepo

```
cablera-app/
├── backend/          # NestJS + Prisma + PostgreSQL
├── frontend/         # React + Vite + Tailwind
├── packages/shared/  # Tipos/enums compartidos entre backend y frontend
└── docker-compose.yml # Postgres para desarrollo local
```

## Desarrollo local

```bash
pnpm install
docker compose up -d
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:backend    # otra terminal
pnpm dev:frontend   # otra terminal
```
