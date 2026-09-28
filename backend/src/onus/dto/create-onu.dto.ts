import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";
import type { EstadoOnu } from "@prisma/client";

const ESTADOS: EstadoOnu[] = ["autorizada", "fallida"];

// Registra el RESULTADO de un intento de autorización de ONU (hecho por SSH/Telnet contra el
// OLT, fuera de este sistema por ahora) — no dispara la autorización en sí, la deja en el
// historial. Lo usan tanto el panel (gestor) como el portal de campo (técnico), cada uno
// marcando quién la autorizó (ver onus.service.ts / portal-tecnico-onus.service.ts).
export class CreateOnuDto {
  @IsString()
  @MinLength(1)
  oltId!: string;

  @IsString()
  @MinLength(1)
  numeroSerie!: string;

  @IsInt()
  @Min(0)
  onuId!: number;

  @IsString()
  @MinLength(1)
  puerto!: string;

  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsString()
  @MinLength(1)
  vlan!: string;

  @IsString()
  @MinLength(1)
  perfilServicio!: string;

  @IsString()
  @MinLength(1)
  onuType!: string;

  @IsIn(ESTADOS)
  estado!: EstadoOnu;

  @IsOptional()
  @IsString()
  mensajeError?: string;

  @IsOptional()
  @IsString()
  contratoId?: string;

  @IsOptional()
  @IsString()
  ordenServicioId?: string;
}
