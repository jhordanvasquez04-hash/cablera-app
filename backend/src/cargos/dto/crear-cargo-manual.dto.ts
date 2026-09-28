import { IsNumber, IsPositive, IsString, Matches } from "class-validator";

export class CrearCargoManualDto {
  @IsString()
  servicioContratadoId!: string;

  // "YYYY-MM", igual al <input type="month"> del frontend.
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: "El período debe tener el formato AAAA-MM" })
  periodo!: string;

  @IsNumber()
  @IsPositive()
  monto!: number;
}
