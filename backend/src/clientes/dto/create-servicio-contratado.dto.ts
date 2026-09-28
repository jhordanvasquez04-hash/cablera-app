import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateServicioContratadoDto {
  @IsString()
  tipoServicioId!: string;

  @IsNumber()
  @Min(0)
  montoBase!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  fechaFacturacionOverride?: number;

  // Fusión con Keysls: plan de catálogo del que salió este servicio (opcional — ver el
  // comentario en ServicioContratado.planId, en schema.prisma). Solo una referencia informativa
  // de precio/plantilla; montoBase sigue siendo lo que realmente se cobra.
  @IsOptional()
  @IsString()
  planId?: string;
}
