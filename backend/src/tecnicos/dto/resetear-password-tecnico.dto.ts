import { IsString, MinLength } from "class-validator";

export class ResetearPasswordTecnicoDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
