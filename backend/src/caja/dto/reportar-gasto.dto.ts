import { IsNumber, IsString, Min, MinLength } from "class-validator";

export class ReportarGastoDto {
  @IsNumber()
  @Min(0.01)
  monto!: number;

  @IsString()
  @MinLength(3)
  descripcion!: string;
}
