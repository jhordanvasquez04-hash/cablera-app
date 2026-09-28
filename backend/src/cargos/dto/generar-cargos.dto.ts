import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class GenerarCargosDto {
  // Ids de ServicioContratado (lo que el frontend-keysls llama "contratoId") a exonerar este mes.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exonerarIds?: string[];

  // { [servicioContratadoId]: porcentajeDescuento } — solo aplica al período actual, nunca a
  // los atrasados que se recuperan automáticamente (esos siempre van a precio completo).
  @IsOptional()
  @IsObject()
  descuentos?: Record<string, number>;
}
