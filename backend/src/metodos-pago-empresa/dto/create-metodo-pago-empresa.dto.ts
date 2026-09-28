import { IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { TipoMetodoPagoEmpresa } from "@prisma/client";

const TIPOS: TipoMetodoPagoEmpresa[] = ["yape", "plin", "cuenta_bancaria"];

// Cuentas propias de la EMPRESA (no del cliente final) para mostrarle a sus clientes cómo
// pagarle — ej. el número de Yape del negocio, o la cuenta del BCP para transferencias.
export class CreateMetodoPagoEmpresaDto {
  @IsIn(TIPOS)
  tipo!: TipoMetodoPagoEmpresa;

  @IsString()
  @MinLength(1)
  numero!: string;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  titular?: string;
}
