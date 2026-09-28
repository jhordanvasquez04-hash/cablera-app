import { IsIn } from "class-validator";
import type { EstadoEmpresa } from "@prisma/client";

const ESTADOS: EstadoEmpresa[] = ["activa", "suspendida", "morosa"];

export class ActualizarEstadoEmpresaDto {
  @IsIn(ESTADOS)
  estado!: EstadoEmpresa;
}
