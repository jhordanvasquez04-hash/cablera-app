import { IsArray, IsEmail, IsLatitude, IsLongitude, IsOptional, IsString, MinLength, ValidateNested } from "class-validator";
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

  // Fusión con Keysls: correo de contacto y coordenadas del domicilio del cliente (no del
  // servicio — cada Contrato tiene su propia dirección/ubicación, ver create-contrato.dto.ts).
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @IsOptional()
  @IsLongitude()
  longitud?: number;

  @IsString()
  zonaId!: string;

  // Fusión con Keysls: "un cliente únicamente son sus datos" — ya no es obligatorio traer un
  // servicio al crearlo (el Contrato real se crea aparte, ver "Nuevo contrato"). Se deja como
  // arreglo opcional (no ArrayMinSize) solo por compatibilidad con la importación desde Excel,
  // que sigue trayendo el servicio inicial en el mismo paso.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServicioContratadoDto)
  servicios?: CreateServicioContratadoDto[];
}
