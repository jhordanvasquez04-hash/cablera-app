import { IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

export class DescuentoMasivoDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El período debe tener el formato AAAA-MM" })
  periodo!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  porcentaje!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
