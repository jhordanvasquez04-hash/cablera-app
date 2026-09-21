import { IsString, MinLength } from "class-validator";

export class CreateTipoServicioDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}
