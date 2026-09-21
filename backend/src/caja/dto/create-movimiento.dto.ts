import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Min } from "class-validator";
import type { MetodoPago, TipoMovimientoCaja } from "@prisma/client";

const TIPOS: TipoMovimientoCaja[] = ["egreso", "ingreso"];
const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia"];

export class CreateMovimientoDto {
  @IsIn(TIPOS)
  tipo!: TipoMovimientoCaja;

  @IsISO8601()
  fecha!: string;

  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsIn(METODOS_PAGO)
  metodoPago!: MetodoPago;

  @IsOptional()
  @IsString()
  categoriaId?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
