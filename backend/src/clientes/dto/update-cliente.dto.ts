import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  zonaId?: string;
}
