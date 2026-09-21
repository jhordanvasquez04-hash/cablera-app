import { IsString, MinLength } from "class-validator";

export class CreateCategoriaEgresoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}
