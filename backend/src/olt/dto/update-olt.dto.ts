import { IsBoolean, IsIP, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpdateOltDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsIP()
  ip?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  puerto?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  puertoTelnet?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  puertoSnmp?: number;

  @IsOptional()
  @IsString()
  comunidadSnmp?: string;

  @IsOptional()
  @IsString()
  fabricante?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  usuario?: string;

  // Opcional: solo si se está rotando la clave. Si no viene, se conserva la cifrada anterior.
  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
