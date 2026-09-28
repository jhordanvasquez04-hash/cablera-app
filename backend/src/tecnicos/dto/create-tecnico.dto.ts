import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateTecnicoDto {
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

  // Correo de acceso al portal de campo (login propio, separado de Usuario) — único a nivel
  // global, igual que Usuario.email (ver el comentario en tecnicos.service.ts).
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  zona?: string;

  @IsOptional()
  @IsString()
  vehiculo?: string;
}
