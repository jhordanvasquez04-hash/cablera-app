import { IsArray, IsLatitude, IsLongitude, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ConsumoItemDto } from "./consumo-item.dto";

// Lo que el técnico llena AL TERMINAR el trabajo en campo — recién ahí se conocen estos datos
// (antes de eso son solo lo que el gestor estimó al crear la orden, si acaso).
export class CompletarOrdenDto {
  // Materiales que gastó (cable, conectores, etc.) — descuenta el stock y queda en OrdenConsumo
  // (kardex por orden). Opcional: una orden que no consume materiales de almacén no manda nada.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumoItemDto)
  consumos?: ConsumoItemDto[];

  @IsOptional()
  @IsString()
  observacionFinal?: string;

  @IsOptional()
  @IsString()
  ipWan?: string;

  @IsOptional()
  @IsString()
  mascara?: string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  pppoeUsuario?: string;

  @IsOptional()
  @IsString()
  pppoePassword?: string;

  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @IsOptional()
  @IsLongitude()
  longitud?: number;

  @IsOptional()
  @IsString()
  precinto?: string;
}
