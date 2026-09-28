import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import type { TipoMovimientoStock } from "@prisma/client";

const TIPOS: TipoMovimientoStock[] = ["entrada", "salida"];

export class RegistrarMovimientoDto {
  @IsIn(TIPOS)
  tipo!: TipoMovimientoStock;

  @IsNumber()
  @Min(0.01)
  cantidad!: number;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
