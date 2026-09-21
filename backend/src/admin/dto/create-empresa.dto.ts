import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class CreateEmpresaDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  // Identificador corto y estable de la empresa (ej. "parias", "cable-norte"). Solo
  // minúsculas, números y guiones — nunca se muestra al usuario final, es interno.
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: "El slug solo puede tener minúsculas, números y guiones (ej. cable-norte)",
  })
  slug!: string;

  // Primer usuario gestor de la empresa nueva, creado en la misma transacción.
  @IsString()
  @MinLength(2)
  gestorNombre!: string;

  @IsEmail()
  gestorEmail!: string;

  @IsString()
  @MinLength(8)
  gestorPassword!: string;
}
