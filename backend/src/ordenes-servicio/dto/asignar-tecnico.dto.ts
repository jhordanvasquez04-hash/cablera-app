import { IsString, MinLength } from "class-validator";

export class AsignarTecnicoDto {
  @IsString()
  @MinLength(1)
  tecnicoId!: string;
}
