import { IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateDescuentoDto {
  @IsInt()
  @Min(0)
  @Max(100)
  porcentaje!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cantidadMeses?: number;

  @IsOptional()
  fechaFin?: string;
}
