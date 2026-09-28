import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import type { TipoServicioRed } from "@prisma/client";

const TIPOS_SERVICIO_RED: TipoServicioRed[] = ["internet", "cable", "duo"];

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsIn(TIPOS_SERVICIO_RED)
  tipoServicio?: TipoServicioRed;

  @IsOptional()
  @IsInt()
  @Min(1)
  mbps?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
