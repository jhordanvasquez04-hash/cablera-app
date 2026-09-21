import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

// El panel de Configuración solo puede crear operadores de esta misma empresa
// (gestor/cobrador). "super_admin" queda reservado para el panel proveedor externo.
const ROLES_ASIGNABLES = ["gestor", "cobrador"] as const;
export type RolAsignable = (typeof ROLES_ASIGNABLES)[number];

export class CreateUsuarioDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(ROLES_ASIGNABLES)
  rol!: RolAsignable;
}
