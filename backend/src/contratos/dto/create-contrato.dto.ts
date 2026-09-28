import { IsDateString, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from "class-validator";

// El resto de datos del cliente/servicio ya viven en ServicioContratado (creado por el flujo
// normal de "Nuevo cliente" / "Agregar servicio"); esto es solo la ficha TÉCNICA que se le
// agrega encima, 1:1.
export class CreateContratoDto {
  @IsString()
  @MinLength(1)
  servicioContratadoId!: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  sector?: string;

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

  @IsOptional()
  @IsString()
  puntoRedId?: string;

  @IsOptional()
  @IsString()
  equipoSerie?: string;

  @IsOptional()
  @IsString()
  equipoProductoId?: string;

  @IsOptional()
  @IsDateString()
  fechaInstalacion?: string;

  @IsOptional()
  @IsString()
  tecnicoInstaladorId?: string;
}
