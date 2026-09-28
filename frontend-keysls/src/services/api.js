import axios from 'axios';

// Backend REAL de cablera (fusión con Keysls) — SIN el prefijo /api que tenía el backend
// original de Keysls: las rutas de cablera van directo en la raíz (ej. /clientes, no /api/clientes).
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Traduce el error de NestJS ({statusCode, message}) al shape que espera este frontend
// ({error}) — todas las páginas de Keysls leen `err.response?.data?.error`.
api.interceptors.response.use(undefined, (err) => {
  const data = err.response?.data;
  if (data && data.message && !data.error) {
    data.error = Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return Promise.reject(err);
});

// ─────────────────────────────────────────────────────────────────────────
// auth — cablera no tiene 2FA, /auth/me, ni recuperación de clave por correo
// (login/logout nada más). auth.store.js está ajustado para no depender de eso.
// ─────────────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
};

export const tecnicoAuthApi = {
  login:  (payload) => api.post('/auth/tecnico/login', payload),
  perfil: () => api.get('/portal-tecnico/perfil'),
};

// ─────────────────────────────────────────────────────────────────────────
// Almacén — cablera lo llama "productos" (con movimientos/variantes anidados),
// no "inventario" con entradas/salidas separadas como Keysls.
// ─────────────────────────────────────────────────────────────────────────
export const productosApi = {
  listar:              (params) => api.get('/productos', { params }),
  obtener:             (id) => api.get(`/productos/${id}`),
  crear:               (payload) => api.post('/productos', payload),
  actualizar:          (id, payload) => api.patch(`/productos/${id}`, payload),
  movimientos:         (id) => api.get(`/productos/${id}/movimientos`),
  registrarMovimiento: (id, payload) => api.post(`/productos/${id}/movimientos`, payload),
  variantes:           (productoId) => api.get(`/productos/${productoId}/variantes`),
  crearVariante:       (productoId, payload) => api.post(`/productos/${productoId}/variantes`, payload),
  eliminarVariante:    (varianteId) => api.delete(`/productos/variantes/${varianteId}`),
};

export const tecnicosApi = {
  listar:     () => api.get('/tecnicos'),
  crear:      (payload) => api.post('/tecnicos', payload),
  actualizar: (id, payload) => api.patch(`/tecnicos/${id}`, payload),
  desactivar: (id) => api.post(`/tecnicos/${id}/desactivar`),
  activar:    (id) => api.post(`/tecnicos/${id}/activar`),
  resetearPassword: (id, password) => api.post(`/tecnicos/${id}/resetear-password`, { password }),
};

export const secretariosApi = {
  listar:     () => api.get('/secretarios'),
  crear:      (payload) => api.post('/secretarios', payload),
  actualizar: (id, payload) => api.patch(`/secretarios/${id}`, payload),
};

// Cliente en Keysls: {dniRuc, nombres, apellidos, telefono, email, direccion, latitud, longitud}.
// Cliente en cablera: {dni, nombreCompleto, telefono, email, direccion, latitud, longitud, zonaId}
// — un solo nombre (no separa nombres/apellidos) y SIEMPRE necesita zonaId (genera el número de
// cliente vía el código de la zona; Keysls no tiene ese concepto). Se traduce acá para que las
// páginas (Clientes.jsx, Contratos.jsx) puedan seguir armando su payload "a la Keysls" — solo
// tienen que agregar `zonaId` al objeto, ver el selector de Zona que se sumó a sus formularios.
function aPayloadCliente(p) {
  return {
    dni: p.dniRuc ?? p.dni,
    nombreCompleto: p.nombreCompleto ?? [p.nombres, p.apellidos].filter(Boolean).join(' ').trim(),
    telefono: p.telefono || null,
    email: p.email || null,
    direccion: p.direccion || null,
    latitud: p.latitud === '' ? null : p.latitud,
    longitud: p.longitud === '' ? null : p.longitud,
    zonaId: p.zonaId,
  };
}

// Bug real (preexistente, transversal): todas las páginas buscan con `{q: texto}` — el
// buscador de clientes de cablera espera `busqueda`, así que ninguna búsqueda de cliente
// filtraba nada (devolvía la lista completa siempre). Se traduce acá una sola vez para no
// tener que tocar cada Clientes.jsx/Contratos.jsx/BuscadorCliente que lo usa.
function aParamsClientes(params) {
  if (!params) return params;
  const { q, ...resto } = params;
  return q !== undefined ? { ...resto, busqueda: q } : resto;
}

export const clientesApi = {
  listar:           (params) => api.get('/clientes', { params: aParamsClientes(params) }),
  obtener:          (id) => api.get(`/clientes/${id}`),
  ficha:            (id) => api.get(`/clientes/${id}/ficha`),
  cargosPendientes: (id) => api.get(`/clientes/${id}/cargos-pendientes`),
  crear:            (payload) => api.post('/clientes', aPayloadCliente(payload)),
  actualizar:       (id, payload) => api.patch(`/clientes/${id}`, aPayloadCliente(payload)),
  suspender:        (id) => api.post(`/clientes/${id}/suspender`),
  activar:          (id) => api.post(`/clientes/${id}/activar`),
  darDeBaja:        (id, payload) => api.post(`/clientes/${id}/baja`, payload),
  // Lo que Keysls llama "crear un contrato" (todo en un POST) cablera lo separa en 2: primero
  // el servicio (lo que se factura), acá — y luego su ficha técnica en contratosApi.crear.
  agregarServicio:  (clienteId, payload) => api.post(`/clientes/${clienteId}/servicios`, payload),
};

// Fusión con Keysls: lo que se cobra mes a mes es cada CONTRATO, no el cliente como bloque — ver
// el mismo cambio ya hecho en la app Android. `contratos` trae un renglón por servicio con deuda,
// cada uno con su propio `numeroCompleto` (ej. "ZCE-0003-2") para diferenciarlo de los demás
// contratos del mismo cliente.
export const cobranzaApi = {
  resumen: (params) => api.get('/cobranza/resumen', { params }),
};

// Catálogo de TIPOS DE SERVICIO de cablera (id + nombre libre, ej. "internet", "cable" — lo
// crea el gestor en Ajustes). No es lo mismo que el enum fijo INTERNET/CABLE/DUO de Keysls que
// usa Plan/Contrato: son dos conceptos separados a propósito (ver el comentario en
// ServicioContratado.planId, prisma/schema.prisma). Se usa acá para resolver a qué
// tipoServicioId corresponde el enum elegido en el formulario, por nombre.
export const tiposServicioApi = {
  listar: () => api.get('/tipos-servicio'),
};

export const zonasApi = {
  listar: () => api.get('/zonas'),
};

// RENIEC: cablera solo tiene DNI (no RUC), y necesita RENIEC_API_URL/RENIEC_API_TOKEN
// configurados en el backend — sin eso responde 503 "no configurado" (ver reniec.service.ts).
// No es un bug del frontend: es que no hay una API key de un proveedor conectada todavía.
export const reniecApi = {
  dni: (numero) => api.get(`/reniec/${numero}`),
};

export const puntosRedApi = {
  listar:     () => api.get('/puntos-red'),
  crear:      (payload) => api.post('/puntos-red', payload),
  actualizar: (id, payload) => api.patch(`/puntos-red/${id}`, payload),
  eliminar:   (id) => api.delete(`/puntos-red/${id}`),
};

// OLT/ONU: en cablera esto es un REGISTRO de intentos de autorización (historial), no una
// automatización SSH/Telnet en vivo contra el equipo — no hay test-conexion, terminal, ni
// next-id/tcont-perfiles/onu-types que se consulten al OLT real (ver onus.service.ts).
export const oltApi = {
  listar:     () => api.get('/olt'),
  crear:      (payload) => api.post('/olt', payload),
  actualizar: (id, payload) => api.patch(`/olt/${id}`, payload),
};

export const onuApi = {
  historial: (params) => api.get('/onus', { params }),
  autorizar: (payload) => api.post('/onus', payload),
};

export const planesApi = {
  listar:     (params) => api.get('/planes', { params }),
  crear:      (payload) => api.post('/planes', payload),
  actualizar: (id, payload) => api.patch(`/planes/${id}`, payload),
};

export const TIPOS_SERVICIO_ENUM = { INTERNET: 'Internet', CABLE: 'Cable', DUO: 'Dúo' };

// En cablera, un "Contrato" (GET /contratos) es solo la ficha técnica — numero/cliente/tipo/
// plan/monto/día de corte viven en `servicioContratado`, y la deuda no viene incluida en
// absoluto. Esto traduce UN contrato crudo de cablera a la forma que Keysls espera en toda esta
// página y en ContratoDrawer — así el resto del código (tabla, export, drawer) no tiene que
// cambiar. `deuda` es la fila de /cobranza/resumen para este mismo servicio, si tiene (opcional).
export function aContratoAdaptado(c, deuda) {
  const sc = c.servicioContratado || {};
  const cliente = sc.cliente || {};
  const tipoServicioEnum = Object.keys(TIPOS_SERVICIO_ENUM).find(
    (k) => k.toLowerCase() === (sc.tipoServicio?.nombre || '').trim().toLowerCase(),
  ) || '';
  return {
    ...c,
    numero: cliente.numeroContrato && sc.numero != null ? `${cliente.numeroContrato}-${sc.numero}` : '',
    clienteId: sc.clienteId,
    cliente: { id: cliente.id, nombres: cliente.nombreCompleto || '', apellidos: '', dniRuc: cliente.dni || '', telefono: cliente.telefono || '' },
    clienteReal: cliente,
    tipoServicio: tipoServicioEnum,
    planId: sc.planId || '',
    plan: sc.plan || null,
    mbps: sc.plan?.mbps ?? null,
    costoMensual: sc.montoBase ?? null,
    diaCorte: sc.fechaFacturacionOverride ?? null,
    estado: (c.estado || '').toUpperCase(),
    deudaPendiente: deuda?.deudaTotal ?? 0,
    mesesPendientesTexto: deuda?.mesesPendientes ?? '',
    // Fusión con Keysls: ahora sí hay un número exacto (ver `mesesPendientesCount` en
    // cobranza.service.ts) para el filtro "Debe 1/2/3+ meses" — antes solo existía el texto.
    mesesPendientesCount: deuda?.mesesPendientesCount ?? 0,
    deudaVencida: Boolean(deuda),
    // Cablera no trae historial de órdenes ni de cargos dentro del Contrato — se dejan vacíos
    // (no undefined) para que .length/.map en la UI no truenen.
    ordenes: [],
    cargos: [],
  };
}

// Contratos: cablera separa "suspender/activar/cortar/baja" en acciones propias en vez de un
// PUT genérico con estado, y no tiene mapa/importar/siguiente-numero (Contrato no tiene un
// número propio, se identifica por el cliente/servicio al que pertenece).
export const contratosApi = {
  listar:     () => api.get('/contratos'),
  obtener:    (id) => api.get(`/contratos/${id}`),
  crear:      (payload) => api.post('/contratos', payload),
  actualizar: (id, payload) => api.patch(`/contratos/${id}`, payload),
  suspender:  (id) => api.post(`/contratos/${id}/suspender`),
  activar:    (id) => api.post(`/contratos/${id}/activar`),
  cortar:     (id) => api.post(`/contratos/${id}/cortar`),
  darDeBaja:  (id, motivo) => api.post(`/contratos/${id}/baja`, { motivo }),
  // Importar contratos en masa desde Excel no tiene equivalente en cablera todavía — armar uno
  // bien (buscar cliente existente por DNI, resolver plan/tipo, reportar fila por fila qué pasó)
  // es una funcionalidad aparte, no un simple cambio de endpoint. Se deja pendiente a propósito.
  importar:   noDisponible('Importar contratos desde Excel no está disponible todavía en cablera.'),
};

// Órdenes de servicio: cablera tiene acciones propias (asignar/cancelar) en vez de un PATCH
// genérico "estado". El portal de campo (aceptar/iniciar/completar) es un cliente/token APARTE
// (ver portalTecnicoApi) — un técnico nunca usa este mismo namespace.
export const ordenesApi = {
  listar:     (params) => api.get('/ordenes-servicio', { params }),
  obtener:    (id) => api.get(`/ordenes-servicio/${id}`),
  crear:      (payload) => api.post('/ordenes-servicio', payload),
  actualizar: (id, payload) => api.patch(`/ordenes-servicio/${id}`, payload),
  asignar:    (id, tecnicoId) => api.post(`/ordenes-servicio/${id}/asignar`, { tecnicoId }),
  cancelar:   (id) => api.post(`/ordenes-servicio/${id}/cancelar`),
};

export const portalTecnicoApi = {
  misOrdenes:   (params) => api.get('/portal-tecnico/ordenes', { params }),
  obtenerOrden: (id) => api.get(`/portal-tecnico/ordenes/${id}`),
  aceptar:      (id) => api.post(`/portal-tecnico/ordenes/${id}/aceptar`),
  iniciar:      (id) => api.post(`/portal-tecnico/ordenes/${id}/iniciar`),
  completar:    (id, payload) => api.post(`/portal-tecnico/ordenes/${id}/completar`, payload),
  productos:    () => api.get('/portal-tecnico/productos'),
};

// ─────────────────────────────────────────────────────────────────────────
// Facturación del CLIENTE FINAL. El modelo de cablera es distinto al de Keysls (ciclo
// CargoMensual → Boleta → Pago con cron mensual, no "generar cargo manual / preview / meses
// saltados / descuento masivo") — esos flujos de Keysls NO tienen equivalente y quedan sin
// cablear acá (no existe cargosApi ni egresosApi con ese shape). Lo que SÍ existe: registrar
// un pago sobre cargos pendientes, y listar/anular boletas.
// ─────────────────────────────────────────────────────────────────────────
export const boletasApi = {
  listar:        (params) => api.get('/boletas', { params }),
  obtener:       (id) => api.get(`/boletas/${id}`),
  registrarPago: (payload) => api.post('/boletas', payload),
  anular:        (id, payload) => api.post(`/boletas/${id}/anular`, payload),
};

export const cajaApi = {
  actual:          () => api.get('/caja-turnos/abierto'),
  abrir:           (payload) => api.post('/caja-turnos/abrir', payload),
  cerrar:          (id, payload) => api.post(`/caja-turnos/${id}/cerrar`, payload),
  historial:       () => api.get('/caja-turnos'),
  movimientos:     (params) => api.get('/caja/movimientos', { params }),
  crearMovimiento: (payload) => api.post('/caja/movimientos', payload),
  resumen:         (params) => api.get('/caja/resumen', { params }),
};

export const categoriasEgresoApi = {
  listar: () => api.get('/categorias-egreso'),
  crear:  (payload) => api.post('/categorias-egreso', payload),
};

// "Mi Empresa" — en cablera es /configuracion (marca, colores, logo), separado de
// /metodos-pago-empresa (cuentas para que el cliente final le pague a la empresa).
export const empresaApi = {
  obtener:        () => api.get('/configuracion'),
  actualizar:     (payload) => api.patch('/configuracion', payload),
  agregarMetodo:  (payload) => api.post('/metodos-pago-empresa', payload),
  listarMetodos:  () => api.get('/metodos-pago-empresa'),
  eliminarMetodo: (id) => api.delete(`/metodos-pago-empresa/${id}`),
};

// ─────────────────────────────────────────────────────────────────────────
// Panel proveedor (super_admin) — fusión con Keysls, ver admin.controller.ts. Sin backups
// (pg_dump) ni gestión de otros super-admins: no se construyeron en esta fusión.
// ─────────────────────────────────────────────────────────────────────────
export const superadminApi = {
  resumen: () => api.get('/admin/resumen'),

  listarTenants: () => api.get('/admin/empresas'),
  obtenerTenant: (id) => api.get(`/admin/empresas/${id}`),
  crearTenant: (payload) => api.post('/admin/empresas', {
    nombre: payload.nombre,
    slug: (payload.slug || payload.nombre || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    gestorNombre: payload.adminNombre,
    gestorEmail: payload.adminEmail,
    gestorPassword: payload.adminPassword,
  }),
  actualizarTenant: (id, payload) => api.patch(`/admin/empresas/${id}`, payload),
  actualizarEstado: (id, estado) => api.patch(`/admin/empresas/${id}/estado`, { estado: String(estado).toLowerCase() }),
  resetearPassword: (usuarioId, password) => api.patch(`/admin/usuarios/${usuarioId}/password`, { password }),

  listarPagos:   () => api.get('/admin/pagos'),
  registrarPago: (payload) => api.post('/admin/pagos-suscripcion', payload),
  eliminarPago:  (id) => api.delete(`/admin/pagos-suscripcion/${id}`),

  listarActividad: () => api.get('/admin/actividad'),
};

// ─────────────────────────────────────────────────────────────────────────
// Sin equivalente real en cablera — mismo shape de error que un axios rechazado ({ response:
// { data: { error } } }) para que las páginas que ya saben mostrar err.response?.data?.error
// lo hagan también acá, en vez de romper con un TypeError. El modelo de facturación de cablera
// (CargoMensual generado por cron + Boleta + Pago) es estructuralmente distinto al de Keysls
// (cargo manual/preview/meses saltados/descuento masivo) — portar esa lógica es un trabajo
// aparte, no un simple cambio de ruta.
// ─────────────────────────────────────────────────────────────────────────
function noDisponible(mensaje) {
  return () => Promise.reject({ response: { data: { error: mensaje } } });
}

export const cargosApi = {
  // Cablera no tiene "cargos de un contrato" como endpoint propio — los cargos pendientes se
  // piden por CLIENTE (`/clientes/:id/cargos-pendientes`, ya traen servicioContratadoId) y acá
  // se filtran al contrato puntual. Ver ContratoConDeudaDto (clienteId + servicioContratadoId)
  // en Pagos.jsx: por eso `contrato` ahora siempre trae ambos ids.
  porContrato: (clienteId, servicioContratadoId) =>
    api.get(`/clientes/${clienteId}/cargos-pendientes`).then((res) => ({
      ...res,
      data: res.data
        .filter((c) => c.servicioContratadoId === servicioContratadoId && c.estado !== 'pagado')
        .map((c) => ({
          id: c.id,
          periodo: `${c.anio}-${String(c.mes).padStart(2, '0')}`,
          monto: c.montoCorrespondiente,
          saldo: c.saldo,
          estado: c.estado === 'parcial' ? 'PARCIAL' : 'PENDIENTE',
          vencido: false,
          montoOriginal: c.montoOriginal ?? null,
          nota: c.notaDescuento ?? null,
        })),
    })),
  // Fusión con Keysls: generación manual de cargos, cargo puntual y descuentos (por cargo y
  // masivo) — ahora sí implementados en el backend (POST/GET /cargos...), ver CargosController.
  preview: () => api.get('/cargos/preview'),
  generar: ({ exonerarIds, descuentos }) => api.post('/cargos/generar', { exonerarIds, descuentos }),
  crearManual: ({ servicioContratadoId, periodo, monto }) =>
    api.post('/cargos', { servicioContratadoId, periodo, monto: Number(monto) }),
  aplicarDescuento: (cargoId, porcentaje) => api.post(`/cargos/${cargoId}/descuento`, { porcentaje }),
  quitarDescuento: (cargoId) => api.delete(`/cargos/${cargoId}/descuento`),
  descuentoMasivoPreview: (periodo) => api.get('/cargos/descuento-masivo/preview', { params: { periodo } }),
  descuentoMasivo: ({ periodo, porcentaje, motivo }) => api.post('/cargos/descuento-masivo', { periodo, porcentaje, motivo }),
  quitarDescuentoMasivo: (periodo) => api.delete('/cargos/descuento-masivo', { params: { periodo } }),
};

// El pago del CLIENTE FINAL en cablera es "registrar un pago sobre cargos pendientes"
// (POST /boletas), no un pago suelto — así que .crear() exige cargoIds, distinto a Keysls.
export const pagosApi = {
  listar: (params) => api.get('/boletas', { params }),
  // Keysls: {contratoId, fecha, metodoPago, observacion, monto, cargoIds}. Cablera: registra el
  // pago sobre el CLIENTE (`clienteId`, no contratoId — el cliente puede tener otros contratos,
  // pero el cargo ya identifica a cuál pertenece), `montoPagado` en vez de `monto`, y el método
  // de pago va en minúscula (su enum real). `fecha`/`observacion` no se guardan — la boleta se
  // fecha con `new Date()` en el backend.
  crear: ({ clienteId, cargoIds, monto, metodoPago }) =>
    api.post('/boletas', { clienteId, cargoIds, montoPagado: Number(monto), metodoPago: (metodoPago || '').toLowerCase() }),
  // Fusión con Keysls: PDF real (ver BoletasController#comprobante, mismo diseño de ticket A5
  // que pagos.controller.js de Keysls). `responseType: 'blob'` es obligatorio acá — sin esto
  // axios decodifica la respuesta binaria como texto y el PDF queda corrupto.
  comprobante: (boletaId) => api.get(`/boletas/${boletaId}/comprobante`, { responseType: 'blob' }),
  reporte:     noDisponible('No hay un endpoint de reporte de pagos en cablera todavía.'),
};

export const egresosApi = {
  listar:   (params) => api.get('/caja/movimientos', { params: { ...params, tipo: 'egreso' } }),
  crear:    (payload) => api.post('/caja/movimientos', { ...payload, tipo: 'egreso' }),
  eliminar: (id) => api.delete(`/caja/movimientos/${id}`),
};

// Cablera no tiene "stats" agregados ni "todos los movimientos de todos los productos" en un
// solo endpoint — solo por producto (GET /productos/:id/movimientos). Se deja sin esos dos.
export const inventarioApi = {
  stats:            noDisponible('No hay un endpoint de estadísticas de almacén en cablera todavía.'),
  productos:        (params) => api.get('/productos', { params }),
  movimientos:      (params) => api.get(`/productos/${params?.productoId}/movimientos`),
  movimientosTodos: noDisponible('No hay un historial de movimientos de TODOS los productos junto en cablera todavía.'),
  entrada:          (payload) => api.post(`/productos/${payload.productoId}/movimientos`, { ...payload, tipo: 'entrada' }),
  salida:           (payload) => api.post(`/productos/${payload.productoId}/movimientos`, { ...payload, tipo: 'salida' }),
};

export default api;
