import { ArrayMinSize, IsArray, IsIn, IsNumber, IsString, Min } from "class-validator";
import type { MetodoPago } from "@prisma/client";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia"];

export class RegistrarPagoDto {
  @IsString()
  clienteId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cargoIds!: string[];

  @IsNumber()
  @Min(0.01)
  montoPagado!: number;

  @IsIn(METODOS_PAGO)
  metodoPago!: MetodoPago;
}
