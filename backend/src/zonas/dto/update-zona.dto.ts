import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateZonaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  codigo?: string;
}
