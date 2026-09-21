import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateZonaDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsString()
  codigo?: string;
}
