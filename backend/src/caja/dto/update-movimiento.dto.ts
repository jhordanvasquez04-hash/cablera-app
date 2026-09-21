import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Min } from "class-validator";
import type { MetodoPago } from "@prisma/client";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia"];

export class UpdateMovimientoDto {
  @IsOptional()
  @IsISO8601()
  fecha?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  monto?: number;

  @IsOptional()
  @IsIn(METODOS_PAGO)
  metodoPago?: MetodoPago;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
