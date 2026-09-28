import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CerrarTurnoDto {
  @IsNumber()
  @Min(0)
  montoContado!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
