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
