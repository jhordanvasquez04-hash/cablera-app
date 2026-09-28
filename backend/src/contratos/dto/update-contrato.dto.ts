import { IsDateString, IsLatitude, IsLongitude, IsOptional, IsString } from "class-validator";

export class UpdateContratoDto {
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
