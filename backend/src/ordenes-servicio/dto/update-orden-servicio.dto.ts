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

// Sin tecnicoId (eso pasa por /asignar, que además registra fechaAsignacion) ni contratoId
// (fijo desde la creación, como servicioContratadoId en Contrato).
export class UpdateOrdenServicioDto {
  @IsOptional()
  @IsIn(TIPOS_ORDEN)
  tipoOrden?: TipoOrdenServicio;

  @IsOptional()
  @IsIn(TIPOS_SERVICIO_RED)
  tipoServicio?: TipoServicioRed;

  @IsOptional()
  @IsDateString()
  fechaServicio?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  abonado?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  direccion?: string;

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
