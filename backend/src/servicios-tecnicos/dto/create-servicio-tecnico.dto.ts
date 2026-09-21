import { IsIn, IsISO8601, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class CreateServicioTecnicoDto {
  @IsString()
  tipoServicioTecnicoId!: string;

  @IsString()
  clienteId!: string;

  @IsOptional()
  @IsString()
  tecnico?: string;

  @IsOptional()
  @IsISO8601()
  fechaProgramada?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  comentario?: string;

  @IsOptional()
  @IsObject()
  datosPropios?: Record<string, string>;
}

export class ComentarServicioTecnicoDto {
  @IsString()
  @MinLength(1)
  comentario!: string;
}

export class LiquidarServicioTecnicoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  comentarioFinal?: string;
}

const ESTADOS_SERVICIO_TECNICO = ["pendiente", "liquidado"] as const;
export type EstadoServicioTecnicoFiltro = (typeof ESTADOS_SERVICIO_TECNICO)[number];
export { ESTADOS_SERVICIO_TECNICO };
