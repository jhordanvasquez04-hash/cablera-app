import { IsIn } from "class-validator";
import type { MetodoPago } from "@prisma/client";

const METODOS_PAGO: MetodoPago[] = ["efectivo", "yape", "plin", "transferencia", "tarjeta"]; // + tarjeta (fusión con Keysls)

export class AprobarGastoDto {
  @IsIn(METODOS_PAGO)
  metodoPago!: MetodoPago;
}
