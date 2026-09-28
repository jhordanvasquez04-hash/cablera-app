import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Min, MinLength } from "class-validator";
import type { EstadoPuntoRed, TipoPuntoRed } from "@prisma/client";

const TIPOS: TipoPuntoRed[] = ["nap", "cto"];
const ESTADOS: EstadoPuntoRed[] = ["activa", "saturada", "mantenimiento"];

// A diferencia de Keysls (PUT, reenvía todo el objeto): esto es PATCH, cada campo es opcional,
// igual que el resto de catálogos de keysls (UpdateZonaDto, UpdatePlanDto, ...).
export class UpdatePuntoRedDto {
  @IsOptional()
  @IsIn(TIPOS)
  tipo?: TipoPuntoRed;

  @IsOptional()
  @IsString()
  @MinLength(1)
  codigo?: string;

  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @IsOptional()
  @IsLongitude()
  longitud?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ocupados?: number;

  @IsOptional()
  @IsIn(ESTADOS)
  estado?: EstadoPuntoRed;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsString()
  napId?: string;
}
