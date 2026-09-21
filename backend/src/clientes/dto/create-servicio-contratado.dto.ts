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
}
