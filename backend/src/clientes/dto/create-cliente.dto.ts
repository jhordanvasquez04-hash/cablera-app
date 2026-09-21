import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateServicioContratadoDto } from "./create-servicio-contratado.dto";

export class CreateClienteDto {
  @IsString()
  @MinLength(1)
  dni!: string;

  @IsString()
  @MinLength(2)
  nombreCompleto!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsString()
  zonaId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateServicioContratadoDto)
  servicios!: CreateServicioContratadoDto[];
}
