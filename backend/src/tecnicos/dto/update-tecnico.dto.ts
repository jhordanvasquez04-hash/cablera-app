import { IsOptional, IsString, MinLength } from "class-validator";

// Deliberadamente sin email/dni/password acá: el correo es la identidad de login del portal
// (cambiarlo es una operación aparte, no un PATCH de datos generales) y la clave tiene su
// propio endpoint (resetear-password) para no mezclar "editar datos" con "cambiar credencial".
export class UpdateTecnicoDto {
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
  @IsString()
  zona?: string;

  @IsOptional()
  @IsString()
  vehiculo?: string;
}
