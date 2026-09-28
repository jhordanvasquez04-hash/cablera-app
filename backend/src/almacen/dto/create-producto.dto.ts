import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";

// El stock (stockTotal / metrosDisponibles) NUNCA se fija acá: arranca en 0 y solo se mueve
// con movimientos de entrada/salida (ver registrar-movimiento.dto.ts) — un solo camino para
// que el stock cambie, no dos fuentes de verdad (crear con stock inicial + movimientos aparte).
export class CreateProductoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  // Ej: un rollo de cable UTP — el stock se lleva en metros, no en unidades enteras.
  // Si esMedible=true, el service exige metrosPorUnidad (la validación cruzada de "requerido
  // solo si..." va ahí, no acá, siguiendo el mismo criterio que el resto de los DTOs de este
  // proyecto: reglas de negocio en el service, el DTO solo valida la forma de cada campo).
  @IsOptional()
  @IsBoolean()
  esMedible?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  metrosPorUnidad?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsBoolean()
  tieneVariantes?: boolean;
}
