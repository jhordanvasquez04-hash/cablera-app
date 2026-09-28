import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from "class-validator";

// Sin esMedible/metrosPorUnidad/tieneVariantes: son decisiones estructurales del producto que
// no tiene sentido cambiar una vez que ya hay movimientos/variantes atados a ese criterio.
export class UpdateProductoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

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

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
