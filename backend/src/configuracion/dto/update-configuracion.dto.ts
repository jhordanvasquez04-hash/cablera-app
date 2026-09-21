import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { FormatoBoleta, ModoCaja } from "@prisma/client";

const FORMATOS_BOLETA: FormatoBoleta[] = ["a4", "ticket"];
const MODOS_CAJA: ModoCaja[] = ["resumen", "apertura_cierre"];

export class UpdateConfiguracionDto {
  @IsOptional()
  @IsString()
  nombreEmpresa?: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  colorPrimario?: string;

  @IsOptional()
  @IsString()
  colorSecundario?: string;

  @IsOptional()
  @IsString()
  telefonoContacto?: string;

  @IsOptional()
  @IsEmail()
  emailContacto?: string;

  @IsOptional()
  @IsString()
  direccionContacto?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  fechaFacturacionGlobal?: number;

  @IsOptional()
  @IsIn(FORMATOS_BOLETA)
  formatoBoletaDefault?: FormatoBoleta;

  @IsOptional()
  @IsIn(MODOS_CAJA)
  modoCaja?: ModoCaja;
}
