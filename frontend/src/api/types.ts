import type { Rol } from "@cablera/shared";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface LoginResponse {
  accessToken: string;
  usuario: Usuario;
}

export type FormatoBoleta = "a4" | "ticket";

export interface Configuracion {
  id: string;
  nombreEmpresa: string;
  ruc: string | null;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  telefonoContacto: string | null;
  emailContacto: string | null;
  direccionContacto: string | null;
  fechaFacturacionGlobal: number;
  formatoBoletaDefault: FormatoBoleta;
}

export interface UsuarioListado {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  createdAt: string;
}

export interface Zona {
  id: string;
  nombre: string;
  codigo: string;
  correlativoActual: number;
}

// Fusión con Keysls (Sistema-de-Gestion-ISP): catálogo de planes.
export type TipoServicioRed = "internet" | "cable" | "duo";

export interface Plan {
  id: string;
  nombre: string;
  tipoServicio: TipoServicioRed;
  mbps: number | null;
  precio: number;
  activo: boolean;
}

export interface TipoServicio {
  id: string;
  nombre: string;
}

export type EstadoServicio = "activo" | "suspendido" | "retirado";

export interface Cliente {
  id: string;
  numeroContrato: string;
  dni: string | null;
  nombreCompleto: string;
  telefono: string | null;
  direccion: string | null;
  zonaId: string;
  zona: Zona;
  tipoServicioId: string;
  tipoServicio: TipoServicio;
  estadoServicio: EstadoServicio;
  montoBase: number;
  fechaFacturacionOverride: number | null;
  fechaAlta: string;
  fechaBaja: string | null;
  motivoBaja: string | null;
  deudaTotal: number;
  montoEfectivo: number;
}

export interface Descuento {
  id: string;
  clienteId: string;
  porcentaje: number;
  fechaInicio: string;
  cantidadMeses: number | null;
  fechaFin: string;
}

export interface EstadisticasClientes {
  activo: number;
  suspendido: number;
  retirado: number;
}

export interface ResumenImportacion {
  zonasCreadas: number;
  clientesCreados: number;
  cargosCreados: number;
  pagosCreados: number;
  avisos: string[];
}

export interface ResumenImportacionSimple {
  zonasCreadas: number;
  clientesCreados: number;
  avisos: string[];
}

export type MetodoPago = "efectivo" | "yape" | "plin" | "transferencia";
export type EstadoBoleta = "emitida" | "anulada";
export type EstadoCargo = "pendiente" | "parcial" | "pagado";
export type TipoMovimientoCaja = "egreso" | "ingreso";
export type EstadoGastoReportado = "pendiente" | "aprobado" | "rechazado";

export interface ClienteConDeuda {
  id: string;
  numeroContrato: string;
  nombreCompleto: string;
  dni: string | null;
  telefono: string | null;
  zona: { id: string; nombre: string };
  montoBase: number;
  suspendido: boolean;
  mesesPendientes: string;
  deudaTotal: number;
}

export interface ResumenCobranza {
  cobradoMes: number;
  deudaAcumulada: number;
  egresosMes: number;
  saldoNeto: number;
  cobradoHoyPorUsuario: number;
  cobrosHoyPorUsuarioCount: number;
  clientesConDeudaCount: number;
  clientes: ClienteConDeuda[];
}

export interface CargoPendiente {
  id: string;
  anio: number;
  mes: number;
  montoCorrespondiente: number;
  montoPagado: number;
  saldo: number;
  estado: EstadoCargo;
}

export interface BoletaResumen {
  id: string;
  folio: string;
  fecha: string;
  cliente: { id: string; nombreCompleto: string; zona: string };
  concepto: string;
  metodoPago: MetodoPago;
  montoTotal: number;
  estado: EstadoBoleta;
}

export interface BoletaDetalle extends BoletaResumen {
  dni: string | null;
  registradoPor: string | null;
  lineas: { periodo: string; montoAplicado: number; esSaldo: boolean }[];
}

export interface CategoriaEgreso {
  id: string;
  nombre: string;
}

export interface MovimientoCaja {
  id: string;
  // No viene en `ResumenCaja.egresos` (ese arreglo ya filtra solo egresos); undefined ahí es
  // seguro porque esa lista nunca se usa para distinguir tipo.
  tipo?: TipoMovimientoCaja;
  fecha: string;
  monto: number;
  metodoPago: MetodoPago;
  categoriaId: string | null;
  categoria: string | null;
  descripcion: string | null;
}

export interface ResumenCaja {
  desde: string;
  hasta: string;
  porMetodo: { metodo: MetodoPago; monto: number; cantidadCobros: number }[];
  ingresosTotal: number;
  egresosTotal: number;
  neto: number;
  egresos: MovimientoCaja[];
}

export interface TendenciaMes {
  anio: number;
  mes: number;
  ingresos: number;
  egresos: number;
  neto: number;
}

export interface ClienteFicha {
  cliente: Cliente;
  saldoTotal: number;
  cargosMesAMes: CargoPendiente[];
  historialPagos: BoletaResumen[];
  descuentoVigente: Descuento | null;
  montoEfectivo: number;
}

export interface GastoReportado {
  id: string;
  fecha: string;
  monto: number;
  descripcion: string;
  estado: EstadoGastoReportado;
  usuario: { nombre: string };
}

// Fusión con Keysls: topología física de red (NAPs y CTOs) y ficha técnica de instalación.
export type TipoPuntoRed = "nap" | "cto";
export type EstadoPuntoRed = "activa" | "saturada" | "mantenimiento";

export interface PuntoRed {
  id: string;
  tipo: TipoPuntoRed;
  codigo: string;
  latitud: number;
  longitud: number;
  capacidad: number | null;
  ocupados: number;
  estado: EstadoPuntoRed;
  direccion: string | null;
  notas: string | null;
  napId: string | null;
}

export type EstadoContrato = "activo" | "suspendido" | "cortado" | "baja";

export interface Contrato {
  id: string;
  servicioContratadoId: string;
  servicioContratado: {
    id: string;
    cliente: { id: string; nombreCompleto: string; numeroContrato: string };
    tipoServicio: { id: string; nombre: string };
  };
  direccion: string | null;
  referencia: string | null;
  sector: string | null;
  ipWan: string | null;
  mascara: string | null;
  gateway: string | null;
  pppoeUsuario: string | null;
  pppoePassword: string | null;
  latitud: number | null;
  longitud: number | null;
  precinto: string | null;
  puntoRedId: string | null;
  puntoRed: PuntoRed | null;
  equipoSerie: string | null;
  equipoProductoId: string | null;
  equipoProducto: { id: string; nombre: string; codigo: string | null } | null;
  fechaInstalacion: string | null;
  tecnicoInstaladorId: string | null;
  tecnicoInstalador: { id: string; nombre: string; apellido: string } | null;
  estado: EstadoContrato;
  motivoBaja: string | null;
  fechaBaja: string | null;
  fechaCorte: string | null;
}

export type TipoOrdenServicio =
  | "instalacion"
  | "alta_servicio"
  | "averia"
  | "cambio_domicilio"
  | "cambio_equipo"
  | "cambio_plan"
  | "cambio_titular"
  | "corte_solicitud"
  | "corte_deuda"
  | "reconexion"
  | "retiro_equipo"
  | "traslado"
  | "otro";

export type EstadoOrdenServicio = "pendiente" | "asignada" | "en_proceso" | "completada" | "cancelada";

export interface OrdenServicio {
  id: string;
  nServicio: string;
  tipoOrden: TipoOrdenServicio;
  tipoServicio: TipoServicioRed;
  estado: EstadoOrdenServicio;
  contratoId: string | null;
  contrato: { id: string; servicioContratado: { cliente: { nombreCompleto: string } } } | null;
  fechaServicio: string;
  abonado: string;
  dni: string | null;
  direccion: string;
  referencia: string | null;
  sector: string | null;
  celular: string | null;
  observacion: string | null;
  tecnicoId: string | null;
  tecnico: { id: string; nombre: string; apellido: string } | null;
  fechaAsignacion: string | null;
  fechaAceptacion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  tiempoInstalacionMin: number | null;
  mensualidad: number | null;
  mbps: number | null;
  planId: string | null;
  plan: { id: string; nombre: string } | null;
  ipWan: string | null;
  pppoeUsuario: string | null;
}

export interface Tecnico {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  email: string;
  zona: string | null;
  vehiculo: string | null;
  activo: boolean;
}

export interface ProductoVariante {
  id: string;
  genero: string | null;
  talla: string | null;
  codigo: string | null;
}

export interface Producto {
  id: string;
  nombre: string;
  codigo: string | null;
  categoria: string | null;
  unidad: string | null;
  descripcion: string | null;
  esMedible: boolean;
  metrosPorUnidad: number | null;
  metrosDisponibles: number | null;
  tieneVariantes: boolean;
  activo: boolean;
  stockTotal: number;
  stockMinimo: number;
  variantes: ProductoVariante[];
}

export type TipoMovimientoStock = "entrada" | "salida";

export interface MovimientoStock {
  id: string;
  productoId: string;
  tipo: TipoMovimientoStock;
  cantidad: number;
  proveedor: string | null;
  motivo: string | null;
  createdAt: string;
}

export type EstadoServicioTecnico = "pendiente" | "liquidado";

export interface TipoServicioTecnico {
  id: string;
  nombre: string;
  camposDefinicion: string[];
}

export type EstadoEmpresa = "activa" | "suspendida";

export interface EmpresaAdmin {
  id: string;
  nombre: string;
  slug: string;
  estado: EstadoEmpresa;
  clientesCount: number;
  usuariosCount: number;
  createdAt: string;
}

export interface CrearEmpresaResultado {
  empresa: { id: string; nombre: string; slug: string; estado: EstadoEmpresa };
  gestor: { id: string; nombre: string; email: string };
}

export interface ServicioTecnico {
  id: string;
  folio: string;
  tipo: string;
  tipoServicioTecnicoId: string;
  cliente: { id: string; nombreCompleto: string };
  tecnico: string | null;
  estado: EstadoServicioTecnico;
  datosPropios: Record<string, string>;
  comentario: string | null;
  comentarioFinal: string | null;
  fechaCreacion: string;
  fechaProgramada: string | null;
  fechaLiquidacion: string | null;
  registradoPor: string | null;
}
