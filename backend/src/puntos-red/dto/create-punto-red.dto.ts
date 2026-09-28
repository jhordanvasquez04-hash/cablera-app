import { IsIn, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Min, MinLength } from "class-validator";
import type { EstadoPuntoRed, TipoPuntoRed } from "@prisma/client";

const TIPOS: TipoPuntoRed[] = ["nap", "cto"];
const ESTADOS: EstadoPuntoRed[] = ["activa", "saturada", "mantenimiento"];

export class CreatePuntoRedDto {
  @IsIn(TIPOS)
  tipo!: TipoPuntoRed;

  @IsString()
  @MinLength(1)
  codigo!: string;

  @IsLatitude()
  latitud!: number;

  @IsLongitude()
  longitud!: number;

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

  // Solo aplica cuando tipo = "cto" (a qué NAP cuelga). El servicio ignora este campo si
  // tipo = "nap" — una NAP nunca cuelga de otra.
  @IsOptional()
  @IsString()
  napId?: string;
}
