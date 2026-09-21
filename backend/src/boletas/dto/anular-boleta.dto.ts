import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import type { MetodoPago } from "@prisma/client";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia"];

export class AnularBoletaDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cargoIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  montoPagado?: number;

  @IsOptional()
  @IsIn(METODOS_PAGO)
  metodoPago?: MetodoPago;
}
