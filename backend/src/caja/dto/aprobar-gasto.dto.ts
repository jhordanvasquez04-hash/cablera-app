import { IsIn } from "class-validator";
import type { MetodoPago } from "@prisma/client";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia"];

export class AprobarGastoDto {
  @IsIn(METODOS_PAGO)
  metodoPago!: MetodoPago;
}
