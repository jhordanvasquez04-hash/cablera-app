import { IsString, MinLength } from "class-validator";

export class ResetearPasswordUsuarioDto {
  @IsString()
  @MinLength(8)
  password!: string;
}
