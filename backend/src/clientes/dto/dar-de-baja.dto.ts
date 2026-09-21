import { IsString, MinLength } from "class-validator";

export class DarDeBajaDto {
  @IsString()
  @MinLength(3)
  motivo!: string;
}
