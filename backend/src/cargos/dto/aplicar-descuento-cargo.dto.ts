import { IsInt, Max, Min } from "class-validator";

export class AplicarDescuentoCargoDto {
  @IsInt()
  @Min(1)
  @Max(100)
  porcentaje!: number;
}
