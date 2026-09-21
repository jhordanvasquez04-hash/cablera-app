import { ArrayMaxSize, IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class CreateTipoServicioTecnicoDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  camposDefinicion?: string[];
}

export class UpdateTipoServicioTecnicoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  camposDefinicion?: string[];
}
