import { IsString, MinLength } from "class-validator";

export class DarDeBajaContratoDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}
