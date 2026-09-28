import { IsDateString, IsIn, IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import type { TipoOrdenServicio, TipoServicioRed } from "@prisma/client";

const TIPOS_ORDEN: TipoOrdenServicio[] = [
  "instalacion",
  "alta_servicio",
  "averia",
  "cambio_domicilio",
  "cambio_equipo",
  "cambio_plan",
  "cambio_titular",
  "corte_solicitud",
  "corte_deuda",
  "reconexion",
  "retiro_equipo",
  "traslado",
  "otro",
];
const TIPOS_SERVICIO_RED: TipoServicioRed[] = ["internet", "cable", "duo"];

// nServicio NO va acá: se numera solo (correlativo transaccional por empresa), igual que
// Boleta.numero / ServicioTecnico.folio — ver ordenes-servicio.service.ts.
//
// Deliberadamente sin clienteId/servicioContratadoId: una orden de instalación puede crearse
// para un prospecto que TODAVÍA no tiene Cliente en el sistema (abonado/dni/direccion son
// texto libre, como ya hacía Keysls). `contratoId` es opcional y solo aplica cuando la orden
// es sobre un servicio YA instalado (avería, cambio de equipo, etc.).
export class CreateOrdenServicioDto {
  @IsIn(TIPOS_ORDEN)
  tipoOrden!: TipoOrdenServicio;

  @IsIn(TIPOS_SERVICIO_RED)
  tipoServicio!: TipoServicioRed;

  @IsOptional()
  @IsString()
  contratoId?: string;

  @IsDateString()
  fechaServicio!: string;

  @IsString()
  @MinLength(2)
  abonado!: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsString()
  @MinLength(2)
  direccion!: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  celular?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsString()
  tecnicoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mensualidad?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  mbps?: number;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  ipWan?: string;

  @IsOptional()
  @IsString()
  mascara?: string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  pppoeUsuario?: string;

  @IsOptional()
  @IsString()
  pppoePassword?: string;

  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @IsOptional()
  @IsLongitude()
  longitud?: number;

  @IsOptional()
  @IsString()
  precinto?: string;
}
