import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

// Sin passwordHash: a diferencia de Tecnico, un Secretario es solo un registro de catálogo
// (directorio). Si TAMBIÉN necesita entrar al panel, se le crea un Usuario aparte (por
// /usuarios, como cualquier operador) y se enlaza con usuarioId — no un login propio acá.
export class CreateSecretarioDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsString()
  @MinLength(2)
  apellido!: string;

  @IsString()
  @MinLength(6)
  dni!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
