import { IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

export class UpdateEmpresaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  agencia?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoMensual?: number;
}
