import { IsIP, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateOltDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsIP()
  ip!: string;

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

  @IsString()
  @MinLength(1)
  fabricante!: string;

  @IsString()
  @MinLength(1)
  modelo!: string;

  @IsString()
  @MinLength(1)
  usuario!: string;

  // Texto plano acá: se cifra (AES-256-GCM) ANTES de guardarse — ver olt.service.ts. Nunca se
  // devuelve descifrada por la API; solo la usaría una futura automatización SSH/Telnet.
  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsString()
  notas?: string;
}
