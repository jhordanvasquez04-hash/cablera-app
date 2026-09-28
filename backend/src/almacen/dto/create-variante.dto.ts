import { IsOptional, IsString } from "class-validator";

// Al menos uno de los dos tiene que venir — lo valida el service (mismo criterio que
// esMedible/metrosPorUnidad en create-producto.dto.ts: la regla cruzada va en el service).
export class CreateVarianteDto {
  @IsOptional()
  @IsString()
  genero?: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  codigo?: string;
}
