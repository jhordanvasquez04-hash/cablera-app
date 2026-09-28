import { IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class RegistrarPagoSuscripcionDto {
  @IsNumber()
  @Min(0.01)
  monto!: number;

  // Texto libre a propósito ("2026-09", "2026-Q3", "Plan anual 2026") — no todas las empresas
  // se facturan mensual, y forzar un formato fijo acá no da nada a cambio.
  @IsString()
  @MinLength(1)
  periodo!: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
