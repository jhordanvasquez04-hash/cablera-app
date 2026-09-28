import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateSecretarioDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  apellido?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // "" (string vacío) desvincula al Usuario — undefined deja el vínculo como está.
  @IsOptional()
  @IsString()
  usuarioId?: string;
}
